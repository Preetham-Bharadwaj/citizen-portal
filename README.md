# 🏥 Citizen Health Portal

A full-stack web application that empowers citizens to manage, upload, and track their medical records securely — powered by **Next.js** and **FastAPI**.

🌐 **Live Demo:**

---

# ✨ Features

🔐 **Authentication**
Secure login and signup with OTP verification.

📋 **Dashboard**
Personalized citizen health overview.

📤 **Medical Record Upload**
Upload medical documents with **OCR processing** and **PII detection**.

📜 **History View**
View a timeline of past medical records.

🔒 **Firebase Integration**
Secure authentication and storage using Firebase.

📱 **Responsive UI**
Fully responsive interface that works on mobile and desktop.

---

# 🗂️ Project Structure

```
citizen-health-app/
│
├── frontend/               # Next.js app
│   └── src/
│       ├── app/            # App router pages
│       │   ├── page.js             # Landing → redirect to login
│       │   ├── login/page.js       # Login page
│       │   ├── signup/page.js      # Signup page
│       │   ├── dashboard/page.js   # Citizen dashboard
│       │   ├── upload/page.js      # Medical record upload
│       │   ├── history/page.js     # Medical history view
│       │   ├── layout.js           # Root layout
│       │   └── globals.css         # Global styles
│       │
│       ├── components/             # Reusable UI components
│       │   ├── Navbar.js
│       │   ├── Sidebar.js
│       │   ├── HealthCard.js
│       │   ├── Timeline.js
│       │   ├── FileUpload.js
│       │   └── OTPInput.js
│       │
│       └── lib/
│           └── api.js              # API client for FastAPI
│
└── backend/                        # FastAPI backend
    ├── main.py                    # FastAPI entry point + routes
    ├── firebase_config.py         # Firebase initialization
    ├── processing.py              # OCR + Layout + PII pipeline
    ├── models.py                  # Pydantic models
    ├── requirements.txt
    └── .env
```

---

# 🚀 Getting Started

## Prerequisites

* Node.js 18+
* Python 3.9+
* Firebase Account

---

# 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

# ⚙️ Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API runs at:

```
http://localhost:8000
```

---

# 🔑 Environment Variables

Create a `.env` file inside the **backend/** folder:

```
FIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id
```

---

# 🛠️ Tech Stack

| Layer            | Technology           |
| ---------------- | -------------------- |
| Frontend         | Next.js 16, React 19 |
| Styling          | Tailwind CSS         |
| Backend          | FastAPI (Python)     |
| Database         | Firebase Firestore   |
| Authentication   | Firebase Auth        |
| OCR              | PaddleOCR            |
| Data Structuring | LayoutLMv3           |
| Hosting          | GitHub Pages         |

---

# 📦 Deployment

```bash
cd frontend
npm run deploy
```

Deploys automatically to **GitHub Pages** using **gh-pages**.

---

# 👨‍💻 Author

**Preetham Bharadwaj**

GitHub:
https://github.com/Preetham-Bharadwaj

---

# 📄 License

This project is open source and available under the **MIT License**.
