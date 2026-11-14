"""Prepare Curiosity's path through the boxwork region for the website.

Dataset:  Curiosity (Mars Science Laboratory) waypoints and traverse (the
          driven path), from the mission's public location map on mars.nasa.gov.
Input:    data/raw/msl_waypoints.json and data/raw/msl_traverse.json
          (downloaded with --refresh)
          data/stops.json (the five stops, hand-written, with sources)
Output:   data/processed/route.json

Units and conventions:
- Latitude and longitude are copied unchanged from the source, in degrees.
  The source does not document its convention; see docs/DATA_SOURCES.md.
- Elevation is the source's `elev_geoid` field, in metres.
- Tilt is the rover's attitude when parked, in degrees. It hints at slope but
  is NOT a slope measurement.
- Each point carries `track`: the path the rover drove from the previous
  point, as [lat, lon] pairs, simplified to within 0.25 m (see traverse.py).
- Distances are great-circle distances in metres on a sphere of Mars' mean
  radius, summed along the full-resolution drives (not the straight lines
  between waypoints). They are derived, not measured.
- Climb is summed from waypoint elevations, not from every drive point, so
  small bumps along a drive do not inflate it.

Run:  python3 scripts/prepare_route.py [--refresh]
"""
from __future__ import annotations

import argparse
import json
from typing import Any

from mars_data import REPO_ROOT, load_raw, write_processed
from traverse import legs_between, path_length_m, simplify

WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json"
TRAVERSE_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json"
RAW_FILE = "msl_waypoints.json"
TRAVERSE_FILE = "msl_traverse.json"
# Decimal places kept for track coordinates: 1e-7 degrees is about 6 mm on Mars.
TRACK_DECIMALS = 7
STOPS_FILE = REPO_ROOT / "data" / "stops.json"
OUTPUT_FILE = "route.json"


def build_route(waypoints: list[dict[str, Any]], stops: list[dict[str, Any]], drives: list[dict[str, Any]]) -> dict[str, Any]:
    """Cut the rover's path between the first and last stop.

    Args:
        waypoints: Waypoint properties from the source, in driving order.
        stops: Stops in visiting order. Each has an `rmc` naming its waypoint.
        drives: Features of the traverse file, in driving order.

    Returns:
        `points` (the path) and `stops` (each with the index of its point).
        The website measures the sections between the stops a visitor selects.

    Raises:
        ValueError: if a stop's waypoint is missing or the stops are out of order.
    """
    index_by_rmc = {w["RMC"]: i for i, w in enumerate(waypoints)}
    stop_indexes = []
    for stop in stops:
        if stop["rmc"] not in index_by_rmc:
            raise ValueError(f"Stop {stop['id']}: waypoint {stop['rmc']} is not in the source file")
        stop_indexes.append(index_by_rmc[stop["rmc"]])
    if stop_indexes != sorted(stop_indexes):
        raise ValueError("Stops must be listed in the order the rover reached them")

    first, last = stop_indexes[0], stop_indexes[-1]
    legs = legs_between(waypoints[first: last + 1], drives)
    points = []
    along_m = 0.0
    for i in range(first, last + 1):
        w = waypoints[i]
        track: list[list[float]] = []
        if i > first:
            leg = legs[i - first - 1]
            along_m += path_length_m(leg)
            track = [[round(p[1], TRACK_DECIMALS), round(p[0], TRACK_DECIMALS)] for p in simplify(leg)]
        points.append({
            "sol": w["sol"],
            "lat": w["lat"],
            "lon": w["lon"],
            "elevationM": round(w["elev_geoid"], 1),
            "tiltDeg": w["tilt"],
            "alongM": round(along_m, 1),
            "track": track,
        })

    out_stops = [{**stop, "pointIndex": idx - first} for stop, idx in zip(stops, stop_indexes)]

    return {"points": points, "stops": out_stops}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download the source file again")
    args = parser.parse_args()

    source = load_raw(RAW_FILE, WAYPOINTS_URL, args.refresh)
    waypoints = [feature["properties"] for feature in source["features"]]
    drives = load_raw(TRAVERSE_FILE, TRAVERSE_URL, args.refresh)["features"]
    stops = json.loads(STOPS_FILE.read_text(encoding="utf-8"))["stops"]

    route = build_route(waypoints, stops, drives)
    route["source"] = {
        "name": "Curiosity waypoints and traverse",
        "provider": "NASA/JPL-Caltech, Mars Science Laboratory",
        "url": WAYPOINTS_URL,
        "traverseUrl": TRAVERSE_URL,
    }
    path = write_processed(OUTPUT_FILE, route)
    print(f"Wrote {path.relative_to(REPO_ROOT)}: {len(route['points'])} points, {len(route['stops'])} stops, "
          f"{route['points'][-1]['alongM']} m end to end")

if __name__ == "__main__":
    main()
