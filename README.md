# citizen-portal

Premium Citizen Health Record Web Application.

### Local Development

1.  **Backend**: `cd backend && python -m uvicorn main:app --reload --port 8000`
2.  **Frontend**: `cd frontend && npm run dev`
3.  **Access**: [http://localhost:3000/](http://localhost:3000/)

### Live Deployment

- **Frontend**: [https://Preetham-Bharadwaj.github.io/citizen-portal/](https://Preetham-Bharadwaj.github.io/citizen-portal/)
- **Backend (Render)**: [https://your-backend-url.onrender.com](https://your-backend-url.onrender.com) (Must be set in GitHub secrets as `NEXT_PUBLIC_API_URL`)