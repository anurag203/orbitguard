from __future__ import annotations

import json
import logging
import sys


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log record for optional log shipping."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level: str = "INFO", json_logs: bool = False) -> None:
    """Configure the shared 'orbitguard' logger tree.

    Plain text by default (easy to read live on stage); JSON when json_logs is True.
    We only ever log IDs, counts, and status strings - never TLE payloads or raw
    exceptions to the client.
    """

    handler = logging.StreamHandler(sys.stdout)
    if json_logs:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    root = logging.getLogger("orbitguard")
    root.handlers = [handler]
    root.setLevel(level.upper())
    root.propagate = False
