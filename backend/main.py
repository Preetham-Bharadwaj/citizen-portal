"""
Citizen Health Record – FastAPI Backend (ABDM-Inspired)
Handles authentication, document processing, family members, and Firebase interaction.
"""

import uuid
import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from models import UserSignup, UserLogin, OTPVerify, AddFamilyMember, FamilyVerifyRequest, FamilyConfirmRequest
from firebase_config import (
    create_user, find_user_by_identifier, get_user_profile,
    store_otp, verify_otp, save_medical_record, get_user_records, attach_file_to_record,
    remove_file_from_record,
    add_family_member, get_family_members, get_family_member_records,
    is_aadhaar_registered, is_mobile_registered, verify_aadhaar_format,
)
import firebase_config # For getattr fallback
from fpdf import FPDF
from processing import process_document

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Citizen Health Record API – ABDM Inspired",
    description="Backend API for the National Citizen Health Record Portal",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ───
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Citizen Health Record API v2"}


# ─── Authentication ───

@app.post("/api/send-otp")
def send_otp(mobile: str = Form(...)):
    """Send OTP for Aadhaar-linked mobile verification"""
    if len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    otp = store_otp(mobile)
    return {"success": True, "message": f"OTP sent to +91-{mobile}", "demo_otp": otp}


@app.post("/api/verify-aadhaar")
def verify_aadhaar(aadhaar: str = Form(...)):
    """Pre-verify Aadhaar before signup"""
    if not verify_aadhaar_format(aadhaar):
        raise HTTPException(status_code=400, detail="Invalid Aadhaar number. Must be 12 digits and cannot start with 0 or 1.")
    if is_aadhaar_registered(aadhaar):
        raise HTTPException(status_code=400, detail="This Aadhaar is already linked to an existing ABHA ID. Please login instead.")
    return {"success": True, "message": "Aadhaar verified. You can proceed with registration."}


@app.post("/api/signup")
def signup(data: UserSignup):
    """Register and generate ABHA ID"""
    try:
        user = create_user(
            full_name=data.full_name,
            mobile=data.mobile,
            email=data.email,
            aadhaar=data.aadhaar,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            address=data.address,
            state=data.state,
            district=data.district,
            password=data.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "success": True,
        "message": "ABHA ID created successfully",
        "user_id": user["user_id"],
        "abha_id": user["abha_id"],
        "abha_address": user["abha_address"],
    }


@app.post("/api/verify-otp")
def verify_otp_endpoint(data: OTPVerify):
    """Verify OTP"""
    if verify_otp(data.mobile, data.otp):
        return {"success": True, "message": "OTP verified"}
    raise HTTPException(status_code=400, detail="Invalid or expired OTP. Max 5 attempts allowed.")


@app.post("/api/login")
def login(data: UserLogin):
    """Login with ABHA ID, ABHA address, or mobile"""
    user = find_user_by_identifier(data.identifier)
    if not user:
        raise HTTPException(status_code=404, detail="No ABHA account found with this identifier")

    if data.password:
        if user.get("password") != data.password:
            raise HTTPException(status_code=401, detail="Invalid password")
    elif data.otp:
        if not verify_otp(user["mobile"], data.otp):
            raise HTTPException(status_code=401, detail="Invalid OTP")
    else:
        raise HTTPException(status_code=400, detail="Provide password or OTP")

    return {
        "success": True,
        "user_id": user["user_id"],
        "abha_id": user["abha_id"],
        "abha_address": user.get("abha_address", ""),
        "full_name": user["full_name"],
    }


# ─── Profile ───

@app.get("/api/profile/{user_id}")
def get_profile(user_id: str):
    profile = get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "profile": profile}


# ─── Family Members ───

@app.post("/api/family/{user_id}")
def add_family(user_id: str, data: AddFamilyMember):
    """Add a family member manually"""
    member = add_family_member(
        primary_user_id=user_id,
        full_name=data.full_name,
        relation=data.relation,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        mobile=data.mobile,
        aadhaar=data.aadhaar,
    )
    return {"success": True, "message": "Family member added", "member": member}


@app.post("/api/family/{user_id}/verify-abha")
def verify_family_abha(user_id: str, data: FamilyVerifyRequest):
    """Verify ABHA ID and send OTP to their registered mobile number"""
    user = find_user_by_identifier(data.abha_id)
    if not user:
        raise HTTPException(status_code=404, detail="No user found with this Health ID")
    
    if user["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a family member")

    mobile = user["mobile"]
    otp = store_otp(mobile)

    masked_mobile = "******" + mobile[-4:]
    return {
        "success": True, 
        "message": f"OTP sent to {masked_mobile}", 
        "masked_mobile": masked_mobile,
        "demo_otp": otp
    }


@app.post("/api/family/{user_id}/confirm-abha")
def confirm_family_abha(user_id: str, data: FamilyConfirmRequest):
    """Confirm OTP and add user as family member"""
    user = find_user_by_identifier(data.abha_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    mobile = user["mobile"]
    if not verify_otp(mobile, data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Add as family member
    member = add_family_member(
        primary_user_id=user_id,
        full_name=user["full_name"],
        relation=data.relation,
        date_of_birth=user.get("date_of_birth", ""),
        gender=user.get("gender", ""),
        mobile=mobile,
        aadhaar="000000000000",  # Masked internally
    )
    
    # Overwrite the newly generated member ABHA ID to link to their actual ABHA ID
    member["abha_id"] = user["abha_id"]
    member["aadhaar_masked"] = user.get("aadhaar_masked", "XXXX-XXXX-XXXX")
    # Link their actual user ID for record fetching
    member["linked_user_id"] = user["user_id"]

    return {"success": True, "message": "Family member linked successfully", "member": member}


@app.get("/api/family/{user_id}")
def list_family(user_id: str):
    members = get_family_members(user_id)
    return {"success": True, "members": members, "total": len(members)}


@app.get("/api/family/{user_id}/records/{member_id}")
def family_member_records(user_id: str, member_id: str):
    # Try fetching linked user records if present, else falback to member records
    members = get_family_members(user_id)
    target = next((m for m in members if m["member_id"] == member_id), None)
    
    if target and target.get("linked_user_id"):
        records = get_user_records(target["linked_user_id"])
    else:
        records = get_family_member_records(member_id)

    return {"success": True, "records": records, "total": len(records)}


# ─── Document Upload & Processing ───

@app.post("/api/upload")
async def upload_document(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload and process medical document through OCR → Layout → PII pipeline"""
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: PDF, JPG, PNG")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")

    # Save to disk
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    processed = process_document(file_bytes, file.filename)
    record = save_medical_record(user_id, processed, file.filename)

    return {
        "success": True,
        "message": "Document processed and saved",
        "record": record,
        "processing": {
            "ocr_engine": "PaddleOCR v2.7",
            "layout_model": "LayoutLMv3",
            "pii_engine": "Microsoft Presidio",
            "text_length": len(processed.get("raw_text", "")),
            "medicines_found": len(processed.get("medicines", [])),
            "lab_results_found": len(processed.get("lab_results", [])),
            "pii_alerts": processed.get("pii_detected", []),
        },
    }

@app.post("/api/records/{user_id}/{record_id}/upload")
async def attach_document(
    user_id: str,
    record_id: str,
    file: UploadFile = File(...),
):
    """Attach a medical document to an existing doctor-created record."""
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: PDF, JPG, PNG")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")

    # Save to disk
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    record = attach_file_to_record(user_id, record_id, file.filename)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    return {
        "success": True,
        "message": "Document attached to record successfully",
        "record": record
    }

@app.get("/api/records/{user_id}/{record_id}/file")
def get_record_file(user_id: str, record_id: str):
    """Retrieve the actual file attached to a record"""
    
    # Check primary records first
    records = get_user_records(user_id)
    record = next((r for r in records if r.get("record_id") == record_id), None)
    
    # If not found, check if this is a family member record request
    if not record:
        members = get_family_members(user_id)
        # Check all family members for this user
        for member in members:
            # Note: Family member records are keyed differently in the mock DB
            # e.g., f"family_{member['member_id']}"
            fam_records = getattr(firebase_config, "_mock_records", {}).get(f"family_{member['member_id']}", [])
            record = next((r for r in fam_records if r.get("record_id") == record_id), None)
            if record:
                break
                
    if not record:
        # One last fallback: maybe the user_id passed WAS the family member id key
        fam_records = getattr(firebase_config, "_mock_records", {}).get(user_id, [])
        record = next((r for r in fam_records if r.get("record_id") == record_id), None)

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    file_name = record.get("file_name")
    if not file_name:
        raise HTTPException(status_code=404, detail="No file attached to this record")
        
    file_path = UPLOAD_DIR / file_name
    
    # For demo purposes, if the physical file doesn't exist but is in the DB, 
    # we'll generate a realistic-looking PDF on the fly using fpdf2
    if not file_path.exists():
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, record.get("hospital_name", "HealthVault Medical Center"), align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 5, f"Date: {record.get('visit_date', 'N/A')}", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        
        # Report Title
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 10, f" {record.get('record_type', 'Medical Report').upper()} ", fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        # Patient Details (Mock)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(40, 8, "Patient Name: ")
        pdf.set_font("Helvetica", size=11)
        pdf.cell(100, 8, f"Patient ID P-{user_id[-6:]}", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(40, 8, "Diagnosis: ")
        pdf.set_font("Helvetica", size=11)
        pdf.cell(100, 8, record.get("diagnosis", "N/A"), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        # Doctor Info
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(100, 6, "Consulting Physician:")
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 6, record.get("doctor_name", "N/A"), new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f"Registration: {record.get('doctor_registration', 'N/A')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        # Medicines
        meds = record.get("medicines", [])
        if meds:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Prescription / Medications", new_x="LMARGIN", new_y="NEXT", border="B")
            pdf.set_font("Helvetica", size=10)
            pdf.ln(2)
            for m in meds:
                if isinstance(m, str):
                    pdf.cell(0, 6, f"• {m}", new_x="LMARGIN", new_y="NEXT")
                else:
                    pdf.cell(0, 6, f"• {m.get('name', '')} - {m.get('dosage', '')} ({m.get('frequency', '')}) for {m.get('duration', '')}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)
            
        # Vitals
        vitals = record.get("vitals", {})
        if vitals:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Vitals Summary", new_x="LMARGIN", new_y="NEXT", border="B")
            pdf.set_font("Helvetica", size=10)
            pdf.ln(2)
            vital_str = " | ".join([f"{k.upper()}: {v}" for k,v in vitals.items()])
            pdf.cell(0, 6, vital_str, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)
            
        # Lab Results
        labs = record.get("lab_results", [])
        if labs:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Laboratory Highlights", new_x="LMARGIN", new_y="NEXT", border="B")
            pdf.set_font("Helvetica", size=10)
            pdf.ln(2)
            for lab in labs:
                pdf.cell(0, 6, f"- {lab.get('test', '')}: {lab.get('value', '')} [{lab.get('status', '')}]", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        # Notes
        notes = record.get("doctor_notes", "")
        if notes:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Doctor's Notes / Advice", new_x="LMARGIN", new_y="NEXT", border="B")
            pdf.set_font("Helvetica", size=10)
            pdf.ln(2)
            pdf.multi_cell(0, 6, notes, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        # Save to disk
        pdf.output(file_path)
        
    return FileResponse(
        file_path, 
        filename=file_name, 
        media_type="application/pdf" if file_name.lower().endswith(".pdf") else None, 
        content_disposition_type="inline"
    )

@app.delete("/api/records/{user_id}/{record_id}/file")
def delete_record_file(user_id: str, record_id: str):
    """Delete the file attached to a record"""
    
    # Try removing from primary records first
    record = remove_file_from_record(user_id, record_id)
    
    # If not found, try removing from family member records
    if not record:
        members = get_family_members(user_id)
        for member in members:
            fam_id = f"family_{member['member_id']}"
            record = remove_file_from_record(fam_id, record_id)
            if record:
                break
                
    if not record:
        # One last fallback: maybe the user_id passed WAS the family member id key
        record = remove_file_from_record(user_id, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found or no file to delete")

    # Enforce 24-hour deletion limit
    uploaded_at = record.get("uploaded_at")
    if uploaded_at:
        try:
            from datetime import datetime, timedelta
            upload_time = datetime.fromisoformat(uploaded_at)
            if datetime.now() - upload_time > timedelta(hours=24):
                raise HTTPException(status_code=403, detail="Reports can only be deleted within 24 hours of uploading")
        except ValueError:
            pass # Ignore parsing errors for mock data

    return {
        "success": True,
        "message": "Document removed successfully",
        "record": record
    }


# ─── Medical Records ───

@app.get("/api/records/{user_id}")
def get_records(user_id: str):
    records = get_user_records(user_id)
    return {"success": True, "total": len(records), "records": records}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
