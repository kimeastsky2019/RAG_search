#!/bin/bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Start Gunicorn
# app:app refers to 'app' object in 'app.py'
nohup gunicorn -w 4 -b 0.0.0.0:5001 app:app > backend.log 2>&1 &
echo "Backend started in background on port 5001."
