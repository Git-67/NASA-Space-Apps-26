"""Shared helpers for the data preparation scripts.

Every script reads an untouched download from data/raw/ and writes a small
JSON file to data/processed/, which is the only data the website loads.
"""
from __future__ import annotations

import json
import math
import urllib.request
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"

# Mean radius of Mars in metres (IAU). Used for distances along the route.
MARS_RADIUS_M = 3_389_500.0

# Some NASA servers refuse requests that do not look like a browser.
_USER_AGENT = "Mozilla/5.0 (compatible; data-preparation-script)"


def load_raw(file_name: str, url: str, refresh: bool) -> Any:
    """Return the parsed JSON for a raw download, fetching it when asked or missing.

    Args:
        file_name: Name of the file inside data/raw/.
        url: Where the file comes from. HTTPS only.
        refresh: Download again even if a copy already exists.
    """
    path = RAW_DIR / file_name
    if refresh or not path.exists():
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    return json.loads(path.read_text(encoding="utf-8"))


def write_processed(file_name: str, payload: Any) -> Path:
    """Write a processed JSON file in a compact, stable form and return its path."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    path = PROCESSED_DIR / file_name
    path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def distance_m(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    """Great-circle distance in metres between two points on Mars (degrees in)."""
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    d_phi = phi_b - phi_a
    d_lambda = math.radians(lon_b - lon_a)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi_a) * math.cos(phi_b) * math.sin(d_lambda / 2) ** 2
    return 2 * MARS_RADIUS_M * math.asin(math.sqrt(h))
