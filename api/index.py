from flask import Flask

from api.logger import get_logger
from api.routes.health import bp as health_bp

log = get_logger(__name__)

app = Flask(__name__)
app.register_blueprint(health_bp)

log.info("habit-game api started")
