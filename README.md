🏥 Citizen Health Portal
A full-stack web application that empowers citizens to manage, upload, and track their medical records securely — powered by Next.js and FastAPI.
🌐 Live Demo: https://preetham-bharadwaj.github.io/citizen-portal

✨ Features

🔐 Authentication — Secure login & signup with OTP verification
📋 Dashboard — Personalized citizen health overview
📤 Medical Record Upload — Upload documents with OCR + PII detection
📜 History View — Timeline of past medical records
🔒 Firebase Integration — Secure data storage and auth
📱 Responsive UI — Works on mobile and desktop


🗂️ Project Structure
citizen-health-app/
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
│       ├── components/     # Reusable UI components
│       │   ├── Navbar.js
│       │   ├── Sidebar.js
│       │   ├── HealthCard.js
│       │   ├── Timeline.js
│       │   ├── FileUpload.js
│       │   └── OTPInput.js
│       └── lib/
│           └── api.js      # API client for FastAPI
│
└── backend/                # FastAPI app
    ├── main.py             # FastAPI entry point + all routes
    ├── firebase_config.py  # Firebase init
    ├── processing.py       # OCR + Layout + PII pipeline
    ├── models.py           # Pydantic models
    ├── requirements.txt
    └── .env

🚀 Getting Started
Prerequisites

Node.js 18+
Python 3.9+
Firebase account

Frontend Setup
bashcd frontend
npm install
npm run dev
Open http://localhost:3000
Backend Setup
bashcd backend
pip install -r requirements.txt
uvicorn main:app --reload
API runs at http://localhost:8000
Environment Variables
Create a .env file in the backend/ folder:
envFIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id

🛠️ Tech Stack
LayerTechnologyFrontendNext.js 16, React 19StylingTailwind CSSBackendFastAPI (Python)DatabaseFirebase FirestoreAuthFirebase AuthOCRPII detection pipelineHostingGitHub Pages

📦 Deployment
bashcd frontend
npm run deploy
Deploys to GitHub Pages automatically via gh-pages.

👨‍💻 Author
Preetham Bharadwaj

GitHub: @Preetham-Bharadwaj


📄 License
This project is open source and available under the MIT License.
