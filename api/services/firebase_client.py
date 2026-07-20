"""The only place the app talks to Firebase. Swap layer per Stack_Architecture_Plan §5."""

import json
import os

import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def get_db():
    """Lazy singleton — serverless cold starts pay for init only when a route needs Firestore."""
    global _db
    if _db is None:
        if not firebase_admin._apps:
            raw = os.environ["FIREBASE_SERVICE_ACCOUNT"]
            firebase_admin.initialize_app(credentials.Certificate(json.loads(raw)))
        _db = firestore.client()
    return _db
