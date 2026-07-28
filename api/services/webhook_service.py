"""Complete a habit from an external webhook. The token maps to a user; the write mirrors what the
app does client-side (a completion row + the habit's total). Isolated here so routes stay thin and
so tests can mock the Firestore boundary."""

from datetime import date, datetime, timezone

from firebase_admin import firestore

from api.services.firebase_client import get_db


def complete_via_token(token: str, habit_id: str, source: str = "webhook"):
    """Return the uid on success, or None if the token matches no user or the habit does not exist.

    A token is stored on the user doc as `webhookToken`; we look the user up by it, then write the
    same completion the app writes. Kept minimal — no streak recompute here; the app reconciles that
    on next open from the completion rows."""
    db = get_db()
    matches = db.collection("users").where(
        filter=firestore.FieldFilter("webhookToken", "==", token)
    ).limit(1).get()
    if not matches:
        return None
    user_ref = matches[0].reference
    uid = user_ref.id

    habit_ref = user_ref.collection("habits").document(habit_id)
    if not habit_ref.get().exists:
        return None

    today = date.today().isoformat()
    user_ref.collection("completions").document(f"{today}_{habit_id}").set({
        "hid": habit_id,
        "date": today,
        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
        "source": source,
        "xp": 10,
    })
    habit_ref.set({"total": firestore.Increment(1)}, merge=True)
    return uid
