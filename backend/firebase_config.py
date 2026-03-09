"""
Firebase configuration - supports both MOCK and LIVE modes.
Enhanced with ABHA-style Health ID, family member support,
detailed medical records, and stronger verification.
"""

import os
import uuid
import random
import string
import hashlib
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

FIREBASE_MODE = os.getenv("FIREBASE_MODE", "mock")

# ─── In-memory mock database ───
_mock_users = {}
_mock_records = {}
_mock_otps = {}
_mock_family = {}
_registered_aadhaar = set()
_registered_mobile = set()


def generate_abha_id():
    """Generate a 14-digit ABHA-style ID (XX-XXXX-XXXX-XXXX)"""
    digits = ''.join(random.choices(string.digits, k=14))
    return f"{digits[:2]}-{digits[2:6]}-{digits[6:10]}-{digits[10:14]}"


def generate_abha_address(full_name):
    """Generate ABHA address like firstname.lastname@abdm"""
    parts = full_name.strip().lower().split()
    if len(parts) >= 2:
        base = f"{parts[0]}.{parts[-1]}"
    else:
        base = parts[0]
    suffix = ''.join(random.choices(string.digits, k=2))
    return f"{base}{suffix}@abdm"


def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


# ─── Verification ───

def verify_aadhaar_format(aadhaar: str) -> bool:
    """Validate Aadhaar number format (12 digits, valid Verhoeff checksum mock)"""
    if not aadhaar.isdigit() or len(aadhaar) != 12:
        return False
    if aadhaar[0] == '0' or aadhaar[0] == '1':
        return False  # Aadhaar doesn't start with 0 or 1
    return True


def is_aadhaar_registered(aadhaar: str) -> bool:
    """Check if Aadhaar is already used to create an ABHA"""
    return aadhaar in _registered_aadhaar


def is_mobile_registered(mobile: str) -> bool:
    """Check if mobile number already has an account"""
    return mobile in _registered_mobile


# ─── OTP Operations ───

def store_otp(mobile: str) -> str:
    otp = generate_otp()
    _mock_otps[mobile] = {"otp": otp, "timestamp": datetime.now(), "attempts": 0}
    print(f"[MOCK OTP] Mobile: {mobile}, OTP: {otp}")
    return otp


def verify_otp(mobile: str, otp: str) -> bool:
    stored = _mock_otps.get(mobile)
    if stored:
        stored["attempts"] += 1
        if stored["attempts"] > 5:
            del _mock_otps[mobile]
            return False
        if (datetime.now() - stored["timestamp"]).seconds > 300:
            del _mock_otps[mobile]
            return False
        if stored["otp"] == otp:
            del _mock_otps[mobile]
            return True
    # In mock mode, accept "123456" as universal OTP
    if FIREBASE_MODE == "mock" and otp == "123456":
        return True
    return False


# ─── User Operations ───

def create_user(full_name: str, mobile: str, email: str, aadhaar: str,
                date_of_birth: str = "", gender: str = "", address: str = "",
                state: str = "", district: str = "", password: str = "demo1234") -> dict:

    # Verify Aadhaar format
    if not verify_aadhaar_format(aadhaar):
        raise ValueError("Invalid Aadhaar number format")

    # Check duplicate Aadhaar
    if is_aadhaar_registered(aadhaar):
        raise ValueError("This Aadhaar number is already linked to an ABHA ID")

    # Check duplicate mobile
    if is_mobile_registered(mobile):
        raise ValueError("This mobile number is already registered")

    user_id = str(uuid.uuid4())[:8]
    abha_id = generate_abha_id()
    abha_address = generate_abha_address(full_name)
    aadhaar_masked = "XXXX-XXXX-" + aadhaar[-4:]

    user = {
        "user_id": user_id,
        "abha_id": abha_id,
        "abha_address": abha_address,
        "full_name": full_name,
        "mobile": mobile,
        "email": email,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "address": address,
        "state": state,
        "district": district,
        "aadhaar_masked": aadhaar_masked,
        "aadhaar_hash": hashlib.sha256(aadhaar.encode()).hexdigest(),
        "password": password,
        "created_at": datetime.now().isoformat(),
        "verified": True,
    }

    _mock_users[user_id] = user
    _mock_users[f"mobile_{mobile}"] = user
    _mock_users[f"abha_{abha_id}"] = user
    _mock_users[f"addr_{abha_address}"] = user
    _registered_aadhaar.add(aadhaar)
    _registered_mobile.add(mobile)

    return user


def find_user_by_identifier(identifier: str) -> dict | None:
    """Find user by ABHA ID, ABHA address, or mobile number"""
    for prefix in ["abha_", "addr_", "mobile_", ""]:
        key = f"{prefix}{identifier}"
        if key in _mock_users:
            return _mock_users[key]
    return None


def get_user_profile(user_id: str) -> dict | None:
    user = _mock_users.get(user_id)
    if user:
        safe = {k: v for k, v in user.items() if k not in ("password", "aadhaar_hash")}
        return safe
    return None


# ─── Family Member Operations ───

def add_family_member(primary_user_id: str, full_name: str, relation: str,
                      date_of_birth: str, gender: str, mobile: str, aadhaar: str) -> dict:
    member_id = str(uuid.uuid4())[:8]
    abha_id = generate_abha_id()
    aadhaar_masked = "XXXX-XXXX-" + aadhaar[-4:]

    member = {
        "member_id": member_id,
        "primary_user_id": primary_user_id,
        "full_name": full_name,
        "relation": relation,
        "abha_id": abha_id,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "mobile": mobile,
        "aadhaar_masked": aadhaar_masked,
        "created_at": datetime.now().isoformat(),
    }

    if primary_user_id not in _mock_family:
        _mock_family[primary_user_id] = []
    _mock_family[primary_user_id].append(member)

    return member


def get_family_members(primary_user_id: str) -> list:
    return _mock_family.get(primary_user_id, [])


def get_family_member_records(member_id: str) -> list:
    return _mock_records.get(f"family_{member_id}", [])


# ─── Medical Record Operations ───

def save_medical_record(user_id: str, record_data: dict, file_name: str) -> dict:
    record_id = str(uuid.uuid4())[:8]
    record = {
        "record_id": record_id,
        "user_id": user_id,
        "record_type": record_data.get("record_type", "OPD"),
        "diagnosis": record_data.get("diagnosis", ""),
        "medicines": record_data.get("medicines", []),
        "visit_date": record_data.get("visit_date", ""),
        "admission_date": record_data.get("admission_date", ""),
        "discharge_date": record_data.get("discharge_date", ""),
        "doctor_name": record_data.get("doctor_name", ""),
        "doctor_registration": record_data.get("doctor_registration", ""),
        "doctor_notes": record_data.get("doctor_notes", ""),
        "hospital_name": record_data.get("hospital_name", ""),
        "hospital_id": record_data.get("hospital_id", f"HF-{random.randint(10000,99999)}"),
        "treatment_status": record_data.get("treatment_status", "Completed"),
        "vitals": record_data.get("vitals", {}),
        "lab_results": record_data.get("lab_results", []),
        "file_name": file_name,
        "uploaded_at": datetime.now().isoformat(),
    }

    if user_id not in _mock_records:
        _mock_records[user_id] = []
    _mock_records[user_id].append(record)

    return record


def get_user_records(user_id: str) -> list:
    return _mock_records.get(user_id, [])

def attach_file_to_record(user_id: str, record_id: str, file_name: str) -> dict | None:
    records = _mock_records.get(user_id, [])
    for r in records:
        if r["record_id"] == record_id:
            r["file_name"] = file_name
            r["uploaded_at"] = datetime.now().isoformat()
            return r
    return None

def remove_file_from_record(user_id: str, record_id: str) -> dict | None:
    records = _mock_records.get(user_id, [])
    for r in records:
        if r["record_id"] == record_id:
            if "file_name" in r:
                del r["file_name"]
            r["uploaded_at"] = datetime.now().isoformat()
            return r
    return None


# ─── Seed demo data ───

def seed_demo_data():
    """Create demo users with comprehensive medical records"""
    demo_user = create_user(
        full_name="Preetham Kumar",
        mobile="9876543210",
        email="preetham@example.com",
        aadhaar="234567890123",
        date_of_birth="1995-05-15",
        gender="Male",
        address="42, MG Road, Koramangala",
        state="Karnataka",
        district="Bangalore Urban",
    )

    # Add family members
    mother = add_family_member(
        demo_user["user_id"],
        full_name="Sunitha Kumar",
        relation="Mother",
        date_of_birth="1965-08-20",
        gender="Female",
        mobile="9876543211",
        aadhaar="345678901234",
    )
    father = add_family_member(
        demo_user["user_id"],
        full_name="Rakesh Kumar",
        relation="Father",
        date_of_birth="1962-03-10",
        gender="Male",
        mobile="9876543212",
        aadhaar="456789012345",
    )

    sample_records = [
        {
            "record_type": "IPD - Inpatient",
            "diagnosis": "Acute Viral Fever with Dengue (NS1 Positive)",
            "medicines": [
                {"name": "Paracetamol", "dosage": "650mg", "frequency": "TDS (3 times/day)", "duration": "5 days"},
                {"name": "ORS Solution", "dosage": "1 sachet", "frequency": "After each loose stool", "duration": "As needed"},
                {"name": "Pantoprazole", "dosage": "40mg", "frequency": "OD (Once daily)", "duration": "5 days"},
                {"name": "IV Normal Saline", "dosage": "1000ml", "frequency": "Continuous drip", "duration": "3 days"},
            ],
            "visit_date": "2025-11-10",
            "admission_date": "2025-11-10",
            "discharge_date": "2025-11-15",
            "doctor_name": "Dr. Raghav Sharma",
            "doctor_registration": "KMC-45892",
            "doctor_notes": "Patient admitted with high fever (103°F), severe body ache, and low platelet count (45,000). NS1 antigen positive. Managed with IV fluids, antipyretics. Platelet count recovered to 1.2L at discharge. Advised rest for 2 weeks, follow-up blood test after 7 days.",
            "hospital_name": "Apollo Hospital, Bangalore",
            "treatment_status": "Completed",
            "vitals": {"bp": "110/70", "pulse": "92/min", "temp": "103°F", "spo2": "97%"},
            "lab_results": [
                {"test": "Platelet Count", "value": "45,000 /cumm", "reference": "1.5-4.0 Lakh", "status": "Critical Low"},
                {"test": "NS1 Antigen", "value": "Positive", "reference": "Negative", "status": "Abnormal"},
                {"test": "Hemoglobin", "value": "13.8 g/dL", "reference": "13-17 g/dL", "status": "Normal"},
            ],
        },
        {
            "record_type": "OPD - Outpatient",
            "diagnosis": "Type 2 Diabetes Mellitus - Quarterly Review",
            "medicines": [
                {"name": "Metformin", "dosage": "500mg", "frequency": "BD (Twice daily)", "duration": "90 days"},
                {"name": "Glimepiride", "dosage": "1mg", "frequency": "OD before breakfast", "duration": "90 days"},
                {"name": "Atorvastatin", "dosage": "10mg", "frequency": "OD at bedtime", "duration": "90 days"},
            ],
            "visit_date": "2026-01-22",
            "admission_date": "",
            "discharge_date": "",
            "doctor_name": "Dr. Anjali Mehta",
            "doctor_registration": "KMC-32145",
            "doctor_notes": "HbA1c: 7.2%. Fasting sugar: 142 mg/dL. Blood sugar levels moderately controlled. Continue current medication. Diet counseling provided. Advised 30 min daily walk. Next review after 3 months with HbA1c.",
            "hospital_name": "Manipal Hospital, Bangalore",
            "treatment_status": "Ongoing",
            "vitals": {"bp": "130/80", "pulse": "78/min", "weight": "82 kg", "bmi": "27.1"},
            "lab_results": [
                {"test": "HbA1c", "value": "7.2%", "reference": "<6.5%", "status": "Above Normal"},
                {"test": "Fasting Blood Sugar", "value": "142 mg/dL", "reference": "70-110 mg/dL", "status": "High"},
                {"test": "Total Cholesterol", "value": "210 mg/dL", "reference": "<200 mg/dL", "status": "Borderline"},
            ],
        },
        {
            "record_type": "IPD - Inpatient",
            "diagnosis": "Lumbar Disc Herniation (L4-L5) - Microdiscectomy",
            "medicines": [
                {"name": "Tramadol", "dosage": "50mg", "frequency": "BD", "duration": "7 days"},
                {"name": "Pregabalin", "dosage": "75mg", "frequency": "BD", "duration": "30 days"},
                {"name": "Methylprednisolone", "dosage": "8mg", "frequency": "OD tapering", "duration": "5 days"},
                {"name": "Calcium + Vitamin D3", "dosage": "500mg", "frequency": "OD", "duration": "60 days"},
                {"name": "Rabeprazole", "dosage": "20mg", "frequency": "OD before food", "duration": "14 days"},
            ],
            "visit_date": "2026-02-05",
            "admission_date": "2026-02-05",
            "discharge_date": "2026-02-10",
            "doctor_name": "Dr. Vikram Patel",
            "doctor_registration": "KMC-18734",
            "doctor_notes": "Patient underwent successful L4-L5 microdiscectomy under general anesthesia. Post-op recovery uneventful. Motor and sensory examination normal. Advised strict bed rest for 2 weeks, lumbar belt usage for 3 months. Physiotherapy to begin after 3 weeks. No heavy lifting for 6 months. Follow-up MRI after 3 months.",
            "hospital_name": "Fortis Hospital, Bangalore",
            "treatment_status": "Follow-up Required",
            "vitals": {"bp": "120/80", "pulse": "74/min", "temp": "98.4°F", "spo2": "99%"},
            "lab_results": [
                {"test": "MRI Lumbar Spine", "value": "L4-L5 disc herniation with nerve root compression", "reference": "-", "status": "Abnormal"},
                {"test": "CBC", "value": "All parameters within normal limits", "reference": "-", "status": "Normal"},
            ],
        },
        {
            "record_type": "Lab Report",
            "diagnosis": "Routine Health Checkup - Annual Screening",
            "medicines": [],
            "visit_date": "2026-02-28",
            "admission_date": "",
            "discharge_date": "",
            "doctor_name": "Dr. Ramesh Gupta",
            "doctor_registration": "KMC-29871",
            "doctor_notes": "Annual health screening completed. Mildly elevated blood sugar and lipids consistent with known diabetes. Vitamin D deficiency noted - supplement recommended. All other parameters within normal limits.",
            "hospital_name": "Narayana Health, Bangalore",
            "treatment_status": "Completed",
            "vitals": {"bp": "128/82", "pulse": "76/min", "weight": "81 kg", "height": "174 cm"},
            "lab_results": [
                {"test": "Hemoglobin", "value": "14.1 g/dL", "reference": "13-17 g/dL", "status": "Normal"},
                {"test": "Fasting Sugar", "value": "138 mg/dL", "reference": "70-110 mg/dL", "status": "High"},
                {"test": "Vitamin D", "value": "18 ng/mL", "reference": "30-100 ng/mL", "status": "Low"},
                {"test": "Thyroid (TSH)", "value": "3.2 mIU/L", "reference": "0.4-4.0 mIU/L", "status": "Normal"},
                {"test": "Creatinine", "value": "0.9 mg/dL", "reference": "0.7-1.3 mg/dL", "status": "Normal"},
                {"test": "Liver Function (SGPT)", "value": "32 U/L", "reference": "7-56 U/L", "status": "Normal"},
            ],
        },
    ]

    for i, rec in enumerate(sample_records):
        # Leave the first record without a file to test inline upload
        fname = "" if i == 0 else f"report_{rec['visit_date']}.pdf"
        save_medical_record(demo_user["user_id"], rec, fname)

    # Seed family records
    family_record = {
        "record_type": "OPD - Outpatient",
        "diagnosis": "Routine Checkup - Hypertension",
        "medicines": [
             {"name": "Amlodipine", "dosage": "5mg", "frequency": "OD", "duration": "30 days"}
        ],
        "visit_date": "2026-03-01",
        "admission_date": "",
        "discharge_date": "",
        "doctor_name": "Dr. Kavita Singh",
        "doctor_registration": "KMC-84210",
        "doctor_notes": "BP slightly elevated (145/90). Adhering to salt-restricted diet. Continue Amlodipine 5mg.",
        "hospital_name": "Apollo Clinic, Koramangala",
        "treatment_status": "Ongoing",
        "vitals": {"bp": "145/90", "pulse": "72/min", "weight": "65 kg"},
        "lab_results": [],
    }
    save_medical_record(f"family_{mother['member_id']}", family_record, "routine_checkup_mother.pdf")

    print(f"[DEMO] User: {demo_user['full_name']}")
    print(f"[DEMO] ABHA ID: {demo_user['abha_id']}")
    print(f"[DEMO] ABHA Address: {demo_user['abha_address']}")
    print(f"[DEMO] Mobile: 9876543210 | Password: demo1234")
    return demo_user


# Initialize demo data on module load
_demo_user = seed_demo_data()
