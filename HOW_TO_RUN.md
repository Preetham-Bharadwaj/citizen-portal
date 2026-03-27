# Citizen Health Portal - Quick Start Guide

## Running the Portal

Open a terminal and run:

```bash
cd citizen-health-app
npm start
```

This will start:
- Backend on http://localhost:8001
- Frontend on http://localhost:3001

## Login Credentials

Use any registered Health ID or create a new account.

Demo Health ID format: `89-3621-3096-5462`

## Important Notes

- The Citizen Portal runs on ports 8001 (backend) and 3001 (frontend)
- The Doctor Portal runs on ports 8000 (backend) and 3000 (frontend)
- Both portals share the same database
- You can run both portals simultaneously in different terminals
- Any patient records created by doctors will appear in the citizen portal

## Stopping the Portal

Press `Ctrl+C` in the terminal to stop both backend and frontend.
