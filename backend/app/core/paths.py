from __future__ import annotations

import os
from pathlib import Path


def project_root() -> Path:
    override = os.getenv("ORBITGUARD_PROJECT_ROOT")
    if override:
        return Path(override).resolve()

    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "data").exists() and (parent / "backend").exists():
            return parent
        if (parent / "data").exists() and (parent / "app").exists():
            return parent

    return current.parents[3]
