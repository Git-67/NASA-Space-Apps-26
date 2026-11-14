"""Prepare Curiosity's daily weather record for the website.

Dataset:  Curiosity REMS daily weather, provided by Centro de Astrobiologia
          (CSIC-INTA) through mars.nasa.gov. The provider labels it
          "for outreach purposes only".
Input:    data/raw/msl_weather.json (downloaded with --refresh)
Output:   data/processed/weather.json

Units and conventions:
- Temperatures are in degrees Celsius, as in the source. Air temperature and
  ground temperature are each given as a daily minimum and maximum.
- Pressure is in pascals.
- Sunrise and sunset are local Mars time, converted here to minutes after
  local midnight. A Mars "minute" is 1/1440 of a sol, slightly longer than an
  Earth minute.
- `ls` is the solar longitude in degrees (0 to 359): the position of Mars in
  its year, used here as the season.
- `uv` is the source's category: Low, Moderate, High or Very_High.

Dropped on purpose: dust opacity (reads "Sunny" on almost every sol, even in
the 2018 global dust storm), wind and humidity (empty on every record).
Sols with no temperature are kept, with nulls, so gaps stay visible.

Run:  python3 scripts/prepare_weather.py [--refresh]
"""
from __future__ import annotations

import argparse
from typing import Any

from mars_data import REPO_ROOT, load_raw, to_columns, write_processed

WEATHER_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json"
RAW_FILE = "msl_weather.json"
OUTPUT_FILE = "weather.json"
UV_CATEGORIES = {"Low", "Moderate", "High", "Very_High"}


def to_number(value: Any) -> int | None:
    """Convert a source string to an integer, or None when the source has no value."""
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def clock_to_minutes(value: Any) -> int | None:
    """Convert a local-time string such as "05:18" to minutes after midnight."""
    try:
        hours, minutes = str(value).split(":")
        return int(hours) * 60 + int(minutes)
    except ValueError:
        return None


def build_record(sol: dict[str, Any]) -> dict[str, Any]:
    """Turn one source record into the trimmed record the website uses."""
    uv = sol.get("local_uv_irradiance_index")
    return {
        "sol": int(sol["sol"]),
        "earthDate": sol["terrestrial_date"],
        "ls": to_number(sol.get("ls")),
        "airMinC": to_number(sol.get("min_temp")),
        "airMaxC": to_number(sol.get("max_temp")),
        "groundMinC": to_number(sol.get("min_gts_temp")),
        "groundMaxC": to_number(sol.get("max_gts_temp")),
        "pressurePa": to_number(sol.get("pressure")),
        "uv": uv if uv in UV_CATEGORIES else None,
        "sunriseMin": clock_to_minutes(sol.get("sunrise")),
        "sunsetMin": clock_to_minutes(sol.get("sunset")),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download the source file again")
    args = parser.parse_args()

    source = load_raw(RAW_FILE, WEATHER_URL, args.refresh)
    records = sorted((build_record(sol) for sol in source["soles"]), key=lambda r: r["sol"])
    payload = {
        "source": {
            "name": "Curiosity REMS daily weather",
            "provider": "Centro de Astrobiologia (CSIC-INTA), via NASA mars.nasa.gov",
            "url": WEATHER_URL,
            "note": "Labelled by its provider as intended for outreach purposes only.",
        },
        "records": to_columns(records),
    }
    path = write_processed(OUTPUT_FILE, payload)
    with_temperature = sum(1 for r in records if r["airMaxC"] is not None)
    print(f"Wrote {path.relative_to(REPO_ROOT)}: {len(records)} sols, {with_temperature} with temperature, "
          f"sol {records[0]['sol']} to {records[-1]['sol']}")


if __name__ == "__main__":
    main()
