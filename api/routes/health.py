import os

from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.get("/api/health")
def health():
    return jsonify(status="ok", version=os.environ.get("APP_VERSION", "dev"))
