### Secure Digital Health Record Ecosystem

> **One Health ID. One Complete Medical History. Anywhere. Anytime.**

---

##  Overview

This project is a **unified digital healthcare platform** that securely stores and shares patient medical records across hospitals.

It connects **Citizens, Doctors, and Researchers** into a single ecosystem using a **Unique Health ID**, ensuring **continuity of care, faster diagnosis, and data-driven healthcare decisions**.

---

##  System Architecture

The system is built as a **multi-portal ecosystem**:

### 👤 Citizen Portal (This Repository)

* User registration & secure login
* Generates **Unique Health ID**
* View complete **medical history timeline**
* Upload medical reports (PDF/JPG/PNG)
* **QR Code generation** for instant access

---

### 🏥 Doctor / Hospital Portal

Enables doctors to access and update patient records in real time.

🔗 Repository:
ADD_DOCTOR_PORTAL_LINK_HERE

**Features:**

* Secure doctor login
* Retrieve patient history using **Health ID / QR scan**
* Add treatment details & prescriptions
* Upload reports
* **QR-based patient identification**

---

### 📊 Research & Public Health Portal

Transforms healthcare data into actionable insights.

🔗 Repository:
ADD_RESEARCH_PORTAL_LINK_HERE

**Features:**

* Disease trend analysis
* Region-based insights
* Severity detection (Low / Medium / High)
* **AI-based alert system for citizens**
* Public health monitoring & decision support

---

## ✨ Key Features

*  Unique Health ID for every citizen
*  Cross-hospital medical record access
*  Real-time data synchronization
*  QR-based instant patient identification
*  Research insights & alert system
*  Secure and role-based access control

---

## 🛠 Tech Stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Frontend         | Next.js                   |
| Backend          | FastAPI (Python)          |
| Database         | Firebase Firestore        |
| Authentication   | Firebase Auth (OTP-based) |
| OCR              | PaddleOCR                 |
| Data Structuring | LayoutLMv3                |
| QR System        | qrcode, html5-qrcode      |

---

##  Workflow

1. Citizen registers → gets **Unique Health ID**
2. Patient visits hospital → shares **Health ID / QR**
3. Doctor retrieves patient history
4. Doctor updates treatment records
5. Data stored in Firebase (real-time sync)
6. Citizen views updated records instantly
7. Research portal analyzes data & generates alerts

---

##  Real-World Impact

A patient treated in one city can visit another hospital **without carrying physical reports**.
Doctors can instantly access medical history, reducing **delays, repeated tests, and medical errors**.

---

##  Future Scope

* Integration with national healthcare systems
* Advanced AI-based disease prediction
* Mobile application support
* Wearable health device integration

---

##  License

This project is developed for **educational and hackathon purposes**.
