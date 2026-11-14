"""Prepare the space weather record behind the verdict's solar storm check.

Dataset: NASA DONKI (Space Weather Database Of Notifications, Knowledge,
         Information), from the Community Coordinated Modeling Center, via
         https://api.nasa.gov/DONKI/. Event types used:
         - WSAEnlilSimulations: model runs of solar storms (coronal mass
           ejections) moving out through the solar system. We keep only the
           arrivals the model predicted AT MARS. A forecast, not a measurement.
         - SEP: solar energetic particle events, as seen by spacecraft near
           Earth or by STEREO. Not measured at Mars.
         - FLR: solar flares of class M and X (X is the strongest).
         - IPS: interplanetary shocks, with where they were detected.
         Not used: CME (the Enlil runs already give the Mars arrivals), GST,
         HSS, RBE and MPC (they describe effects at Earth).
Inputs:  fetched in 60-day windows (the API's limit) from Curiosity's landing
         to today; raw replies are kept in data/raw/donki/ (not committed).
Output:  data/processed/space_weather.json

Units and conventions: all times are UTC, ISO 8601, as DONKI gives them.

API key: read from the NASA_API_KEY environment variable and sent in the
X-Api-Key header; without it NASA's shared DEMO_KEY is used, which allows only
a few requests an hour. Never commit a key. Get one free at https://api.nasa.gov.

Run:  NASA_API_KEY=... python3 scripts/prepare_space_weather.py [--refresh]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from mars_data import RAW_DIR, write_processed

DONKI_URL = "https://api.nasa.gov/DONKI/{kind}?startDate={start}&endDate={end}"
FIRST_DAY = dt.date(2012, 8, 6)  # Curiosity's landing
WINDOW_DAYS = 60  # longest range DONKI accepts per request
KINDS = ("WSAEnlilSimulations", "SEP", "FLR", "IPS")
STRONG_FLARE_CLASSES = ("M", "X")
RAW_SUBDIR = RAW_DIR / "donki"
OUTPUT_FILE = "space_weather.json"
_USER_AGENT = "Mozilla/5.0 (compatible; data-preparation-script)"
_PAUSE_S = 0.2  # be gentle with NASA's API


def fetch_window(kind: str, start: dt.date, end: dt.date, refresh: bool) -> list[dict[str, Any]]:
    """One 60-day reply from DONKI, cached in data/raw/donki/."""
    path = RAW_SUBDIR / kind / f"{start.isoformat()}.json"
    is_complete = end < dt.date.today()  # the window holding today is fetched again every run
    if refresh or not path.exists() or not is_complete:
        path.parent.mkdir(parents=True, exist_ok=True)
        url = DONKI_URL.format(kind=kind, start=start.isoformat(), end=end.isoformat())
        key = os.environ.get("NASA_API_KEY", "DEMO_KEY")
        request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT, "X-Api-Key": key})
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read()
        path.write_bytes(body if body.strip() else b"[]")
        time.sleep(_PAUSE_S)
    text = path.read_text(encoding="utf-8").strip()
    return json.loads(text) if text else []


def mars_arrivals(simulations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Predicted solar storm arrivals at Mars, one per arrival hour."""
    events: dict[str, dict[str, Any]] = {}
    for run in simulations:
        for impact in run.get("impactList") or []:
            if impact.get("location") != "Mars" or not impact.get("arrivalTime"):
                continue
            arrival = impact["arrivalTime"]
            previous = events.get(arrival)
            is_glancing = bool(impact.get("isGlancingBlow"))
            # Several model runs often predict the same arrival. Keep the most severe reading.
            if previous is None or (previous["isGlancingBlow"] and not is_glancing):
                events[arrival] = {
                    "type": "CME-MARS",
                    "time": arrival,
                    "isGlancingBlow": is_glancing,
                    "detail": "glancing blow" if is_glancing else "direct arrival",
                    "observedAt": "WSA-Enlil model forecast",
                    "link": run.get("link", ""),
                }
    return list(events.values())


def particle_events(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Solar energetic particle events, with the spacecraft that saw them."""
    return [{
        "type": "SEP",
        "time": record["eventTime"],
        "detail": "solar energetic particles",
        "observedAt": ", ".join(i["displayName"] for i in record.get("instruments") or []),
        "link": record.get("link", ""),
    } for record in records if record.get("eventTime")]


def strong_flares(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Class M and X solar flares."""
    return [{
        "type": "FLR",
        "time": record.get("peakTime") or record["beginTime"],
        "detail": f"class {record['classType']} flare",
        "observedAt": ", ".join(i["displayName"] for i in record.get("instruments") or []),
        "link": record.get("link", ""),
    } for record in records if str(record.get("classType", "")).startswith(STRONG_FLARE_CLASSES)]


def shocks(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Interplanetary shocks, with where they were detected."""
    return [{
        "type": "IPS",
        "time": record["eventTime"],
        "detail": "interplanetary shock",
        "observedAt": record.get("location") or "",
        "link": record.get("link", ""),
    } for record in records if record.get("eventTime")]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download every window again")
    args = parser.parse_args()

    today = dt.date.today()
    raw: dict[str, list[dict[str, Any]]] = {kind: [] for kind in KINDS}
    unavailable: list[str] = []
    for kind in KINDS:
        start = FIRST_DAY
        try:
            while start <= today:
                end = min(start + dt.timedelta(days=WINDOW_DAYS - 1), today)
                raw[kind].extend(fetch_window(kind, start, end, args.refresh))
                start = end + dt.timedelta(days=1)
        except urllib.error.HTTPError as error:
            # A whole event type missing is recorded in the output, so the page can say so, not hide it.
            if error.code != 404:
                raise
            print(f"DONKI has no {kind} endpoint today (HTTP 404); recorded as unavailable")
            raw[kind] = []
            unavailable.append(kind)

    events = (mars_arrivals(raw["WSAEnlilSimulations"]) + particle_events(raw["SEP"])
              + strong_flares(raw["FLR"]) + shocks(raw["IPS"]))
    events.sort(key=lambda event: event["time"])
    path = write_processed(OUTPUT_FILE, {
        "about": "Space weather events from NASA DONKI, prepared by scripts/prepare_space_weather.py. Times in UTC. "
                 "CME-MARS entries are model forecasts of arrival at Mars; SEP, FLR and IPS were observed near Earth or by STEREO, not at Mars.",
        "source": "https://api.nasa.gov/DONKI/ (NASA Community Coordinated Modeling Center)",
        "coverage": {"start": FIRST_DAY.isoformat(), "end": today.isoformat()},
        "unavailable": unavailable,
        "events": events,
    })
    counts = {kind: sum(1 for event in events if event["type"] == kind) for kind in ("CME-MARS", "SEP", "FLR", "IPS")}
    print(f"Wrote {path}: {counts}")


if __name__ == "__main__":
    main()
