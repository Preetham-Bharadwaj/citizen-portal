from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserSignup(BaseModel):
    full_name: str
    mobile: str
    email: str
    aadhaar: str
    date_of_birth: str = ""
    gender: str = ""
    address: str = ""
    state: str = ""
    district: str = ""
    password: str


class OTPVerify(BaseModel):
    mobile: str
    otp: str


class UserLogin(BaseModel):
    identifier: str  # ABHA ID or mobile number
    password: Optional[str] = None
    otp: Optional[str] = None


class UserProfile(BaseModel):
    user_id: str
    abha_id: str
    full_name: str
    mobile: str
    email: str
    date_of_birth: str
    gender: str
    address: str
    state: str
    district: str
    aadhaar_masked: str
    created_at: str


class MedicalRecord(BaseModel):
    record_id: str
    user_id: str
    record_type: str  # OPD, IPD, Lab Report, Prescription, Discharge Summary
    diagnosis: str
    medicines: List[dict]  # {name, dosage, frequency, duration}
    visit_date: str
    admission_date: str
    discharge_date: str
    doctor_name: str
    doctor_registration: str
    doctor_notes: str
    hospital_name: str
    hospital_id: str
    treatment_status: str  # Ongoing, Completed, Follow-up Required
    vitals: dict
    lab_results: List[dict]
    file_name: str
    uploaded_at: str


class FamilyMember(BaseModel):
    member_id: str
    primary_user_id: str
    full_name: str
    relation: str  # Father, Mother, Spouse, Son, Daughter, etc.
    abha_id: str
    date_of_birth: str
    gender: str
    mobile: str
    aadhaar_masked: str


class AddFamilyMember(BaseModel):
    full_name: str
    relation: str
    date_of_birth: str
    gender: str
    mobile: str
    aadhaar: str


class FamilyVerifyRequest(BaseModel):
    abha_id: str


class FamilyConfirmRequest(BaseModel):
    abha_id: str
    relation: str
    otp: str


class ProcessedDocument(BaseModel):
    record_type: str
    diagnosis: str
    medicines: List[dict]
    visit_date: str
    admission_date: str
    discharge_date: str
    doctor_name: str
    doctor_registration: str
    doctor_notes: str
    hospital_name: str
    treatment_status: str
    vitals: dict
    lab_results: List[dict]
    pii_detected: List[str]
    raw_text: str
