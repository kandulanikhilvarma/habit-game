from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from api.models.schemas import CompleteRequest
from api.services import webhook_service

bp = Blueprint("webhook", __name__)


@bp.post("/api/v1/complete")
def complete():
    """External habit completion (§5 #5). Validate the body, then complete via the user's token."""
    try:
        req = CompleteRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify(error="invalid payload", detail=e.errors()), 400

    uid = webhook_service.complete_via_token(req.token, req.habit_id, req.source)
    if uid is None:
        return jsonify(error="unknown token or habit"), 401

    return jsonify(status="completed", habit=req.habit_id), 200
