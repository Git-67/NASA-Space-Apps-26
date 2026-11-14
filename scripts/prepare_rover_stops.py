"""Pick extra stops for daily missions: places in the boxwork where Curiosity parked.

Dataset: Curiosity (MSL) waypoints, data/raw/msl_waypoints.json (one per drive,
         with the sol and position where the drive ended), the track network
         (safe_paths.py) and the five curated stops in data/processed/route.json.
Choice:  a waypoint becomes a stop when it lies on usable rover-driven ground
         (within SNAP_M of the network), within NASA's 2 km walk-back limit of
         the start (lunar, EVA-EXP-0042), and at least SPACING_M from every
         other stop. Newest first, up to MAX_STOPS.
Tasks:   OURS, the same simple field tasks at every rover stop (look at the
         ground where the rover parked). They are labelled as ours in the page.
         Nothing is claimed about the science at these places beyond the sol
         and position NASA published.
Output:  data/processed/rover_stops.json

Units: metres, degrees. Coordinates as the source gives them.

Run:  python3 scripts/prepare_rover_stops.py   (after prepare_route.py)
"""
from __future__ import annotations

import json
from typing import Any

from mars_data import PROCESSED_DIR, distance_m, load_raw, write_processed
from safe_paths import AREA, build_network

WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json"
TRAVERSE_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json"
OUTPUT_FILE = "rover_stops.json"
# A waypoint further than this from usable track is not reachable on rover-driven ground, in metres.
SNAP_M = 3.0
# NASA EVA-EXP-0042 Rev B, section 4.2.1.3.1 (lunar): walk up to 2 km from base in a straight line.
WALK_BACK_M = 2000.0
# Stops closer than this would crowd each other on the map and add little to a walk, in metres.
SPACING_M = 60.0
MAX_STOPS = 10
# Field tasks at a rover stop: OURS, kept simple and true anywhere Curiosity parked.
TASKS_OURS = [
    "Photograph the ground where the rover parked.",
    "Compare the wheel tracks with the ground beside them.",
    "Note the rock or sand under the tracks.",
]
KIT_OURS = ["Camera"]
WORK_MINUTES_OURS = 15


def main() -> None:
    waypoints = [f["properties"] for f in load_raw("msl_waypoints.json", WAYPOINTS_URL, False)["features"]]
    drives = load_raw("msl_traverse.json", TRAVERSE_URL, False)["features"]
    route = json.loads((PROCESSED_DIR / "route.json").read_text(encoding="utf-8"))
    network = build_network(drives, waypoints)
    curated = [route["points"][stop["pointIndex"]] for stop in route["stops"]]
    start = curated[0]
    south, west, north, east = AREA

    chosen: list[dict[str, Any]] = []
    taken = [(p["lat"], p["lon"]) for p in curated]
    for waypoint in sorted(waypoints, key=lambda w: -w["sol"]):
        lat, lon = waypoint["lat"], waypoint["lon"]
        if not (south < lat < north and west < lon < east):
            continue
        if distance_m(start["lat"], start["lon"], lat, lon) > WALK_BACK_M:
            continue
        place = network.places[network.nearest(lat, lon)]
        if distance_m(place[1], place[0], lat, lon) > SNAP_M:
            continue
        if any(distance_m(lat, lon, other_lat, other_lon) < SPACING_M for other_lat, other_lon in taken):
            continue
        taken.append((lat, lon))
        chosen.append({
            "id": f"sol-{waypoint['sol']}",
            "name": f"Sol {waypoint['sol']} stop",
            "summary": f"Where Curiosity parked on sol {waypoint['sol']}",
            "sol": waypoint["sol"],
            "lat": lat,
            "lon": lon,
            "terrain": "track",
            "found": f"Curiosity ended a drive here on sol {waypoint['sol']} (NASA waypoint data).",
            "tasksOurs": TASKS_OURS,
            "kitOurs": KIT_OURS,
            "workMinutesOurs": WORK_MINUTES_OURS,
            "sourceLabel": "NASA/JPL-Caltech, Curiosity waypoints",
            "sourceUrl": WAYPOINTS_URL,
        })
        if len(chosen) == MAX_STOPS:
            break
    path = write_processed(OUTPUT_FILE, {
        "about": "Places in the boxwork where Curiosity parked, used as extra stops for daily missions. Built by "
                 f"scripts/prepare_rover_stops.py: on usable rover-driven ground (within {SNAP_M:g} m), within {WALK_BACK_M:g} m "
                 f"of the start, at least {SPACING_M:g} m apart, newest first. Tasks are ours.",
        "stops": chosen,
    })
    print(f"Wrote {path}: {len(chosen)} stops, sols {', '.join(str(stop['sol']) for stop in chosen)}")


if __name__ == "__main__":
    main()
