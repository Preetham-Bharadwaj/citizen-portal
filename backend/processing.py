"""
Document processing pipeline.
Uses OpenAI GPT-4o (Vision) to extract medical details from reports.
Fallback mock implementation included if API key is missing.
"""

import os
import io
import re
import json
import base64
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Initialize OpenAI client
client = None
api_key = os.getenv("OPENAI_API_KEY")
if api_key and api_key != "your_openai_api_key_here":
    client = OpenAI(api_key=api_key)

def encode_image(image_bytes: bytes):
    """Encodes an image to base64 string for OpenAI Vision API."""
    return base64.b64encode(image_bytes).decode('utf-8')

def analyze_with_ai(file_bytes: bytes, filename: str) -> dict:
    """
    Sends the medical report to GPT-4o Vision for structured extraction.
    """
    if not client:
        return None

    base64_image = encode_image(file_bytes)
    mime_type = "image/jpeg"
    if filename.lower().endswith(".png"):
        mime_type = "image/png"
    elif filename.lower().endswith(".pdf"):
        # Vision API doesn't support PDF directly easily, 
        # normally you would convert PDF pages to images.
        # For this demo, we assume the user uploads images or we return mock for PDF if not handled.
        return None 

    prompt = """
    You are a medical data extraction specialist. Analyze this medical report image and extract details in a strict JSON format.
    
    REQUIRED JSON STRUCTURE:
    {
        "record_type": "IPD - Inpatient" OR "OPD - Outpatient" OR "Lab Report" OR "Prescription",
        "diagnosis": "Short summary of diagnosis",
        "hospital_name": "Hospital Name",
        "visit_date": "DD-MM-YYYY",
        "doctor_name": "Full name with degree",
        "doctor_registration": "KMC-XXXXX",
        "treatment_status": "Ongoing" OR "Completed" OR "Follow-up Required",
        "vitals": { "bp": "120/80", "pulse": "72", "temp": "98.4", "spo2": "98" },
        "medicines": [
            { "name": "Drug Name", "dosage": "500mg", "frequency": "BD", "duration": "5 days" }
        ],
        "lab_results": [
            { "test": "Test Name", "value": "Number", "reference": "Range", "status": "Normal/High/Low" }
        ],
        "doctor_notes": "A descriptive AI summary/insight about this report.",
        "pii_detected": [
            { "type": "AADHAAR_NUMBER", "severity": "HIGH", "action": "MASKED" }
        ]
    }

    Rules:
    - If a field is missing, use an empty string or empty list/object.
    - The 'doctor_notes' should be a friendly 2-3 sentence description of the report's content.
    - Mask any full Aadhaar numbers found.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}",
                            },
                        },
                    ],
                }
            ],
            response_format={ "type": "json_object" },
            max_tokens=2000,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"[AI ERROR] {str(e)}")
        return None

def extract_text_ocr(file_bytes: bytes, filename: str) -> str:
    """Mock OCR fallback."""
    sample_texts = [
        "APOLLO HOSPITALS... DISCHARGE SUMMARY... Diagnosis: Acute Gastroenteritis...",
        "MANIPAL HOSPITAL... OUTPATIENT CONSULTATION... Diagnosis: T2DM...",
        "NARAYANA HEALTH... Lab Report... TSH: 3.2 mIU/L..."
    ]
    return random.choice(sample_texts)

def structure_document(raw_text: str) -> dict:
    """Mock Structuring fallback."""
    return {
        "record_type": "OPD - Outpatient",
        "diagnosis": "General Health Checkup",
        "medicines": [{"name": "Mock Med", "dosage": "500mg", "frequency": "OD", "duration": "5 days"}],
        "visit_date": datetime.now().strftime("%d-%m-%Y"),
        "doctor_name": "Dr. AI Assistant",
        "hospital_name": "HealthVault Digital Center",
        "vitals": {"bp": "120/80", "pulse": "72/min"},
        "lab_results": [],
        "doctor_notes": "Analysis based on mock extraction logic.",
        "pii_detected": []
    }

def process_document(file_bytes: bytes, filename: str) -> dict:
    """Entry point: Tries AI first, then falls back to Mock."""
    
    # Try Real AI Analysis
    ai_result = analyze_with_ai(file_bytes, filename)
    if ai_result:
        # Add internal tracking
        ai_result["raw_text"] = "Extracted directly by AI Vision Pipeline (GPT-4o)"
        return ai_result

    # Fallback to Mock Pipeline
    raw_text = extract_text_ocr(file_bytes, filename)
    structured = structure_document(raw_text)
    
    return {
        **structured,
        "raw_text": raw_text,
    }
