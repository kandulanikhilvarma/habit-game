import logging
import sys

# Vercel captures stdout; the filesystem is ephemeral, so file handlers are never an option.
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
