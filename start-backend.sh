#!/bin/bash
cd "$(dirname "$0")/backend"
python3 -m uvicorn app.main:app --reload --port 8000
