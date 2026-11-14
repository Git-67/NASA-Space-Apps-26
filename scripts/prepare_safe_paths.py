"""Precompute the safest walking path between every pair of stops.

Dataset: Curiosity traverse and waypoints (data/raw/), and the stops in
         data/processed/route.json (run prepare_route.py first).
Method:  see safe_paths.py. Paths use only ground Curiosity drove, within
         NASA's 20-degree suit slope limit; the safest path is the shortest.
Output:  data/processed/safe_paths.json, one entry per pair of stops (the
         browser reverses an entry for the opposite direction). Doing this
         here keeps the work off the low-power computer that shows the page.

Units: metres, degrees. Elevation is the traverse file's value, in metres.

Run:  python3 scripts/prepare_safe_paths.py
"""
from __future__ import annotations

import json
from typing import Any

from mars_data import PROCESSED_DIR, distance_m, load_raw, write_processed
from safe_paths import HARD_TILT_DEG, JOIN_M, STEP_M, Network, build_network
from traverse import simplify

OUTPUT_FILE = "safe_paths.json"
NETWORK_FILE = "track_network.json"
# Spacing of the elevation profile points, in metres.
PROFILE_STEP_M = 10.0
COORD_DECIMALS = 7


def describe(network: Network, path: list[tuple[int, float, str]]) -> dict[str, Any]:
    """Distance, climb, difficulty runs, profile and callout positions for one path."""
    places = [network.places[node] for node, _, _ in path]
    steps = path[1:]
    runs: list[dict[str, Any]] = []
    along = 0.0
    ascent = descent = 0.0
    profile = [[0.0, round(places[0][2], 1)]]
    next_profile = PROFILE_STEP_M
    steepest = (places[0], 0.0)
    for index, (_, tilt, difficulty) in enumerate(steps):
        a, b = places[index], places[index + 1]
        length = distance_m(a[1], a[0], b[1], b[0])
        along += length
        change = b[2] - a[2]
        ascent += max(change, 0.0)
        descent += max(-change, 0.0)
        if tilt > steepest[1]:
            steepest = (b, tilt)
        if along >= next_profile or index == len(steps) - 1:
            profile.append([round(along, 1), round(b[2], 1)])
            next_profile = along + PROFILE_STEP_M
        if runs and runs[-1]["difficulty"] == difficulty:
            runs[-1]["raw"].append(b)
        else:
            runs.append({"difficulty": difficulty, "raw": [a, b]})
    for run in runs:
        run["points"] = [[round(p[1], COORD_DECIMALS), round(p[0], COORD_DECIMALS)] for p in simplify(run.pop("raw"))]
    middle = places[len(places) // 2]
    return {
        "distanceM": round(along, 1),
        "ascentM": round(ascent, 1),
        "descentM": round(descent, 1),
        "maxTiltDeg": round(steepest[1], 2),
        "steepest": [round(steepest[0][1], COORD_DECIMALS), round(steepest[0][0], COORD_DECIMALS)],
        "middle": [round(middle[1], COORD_DECIMALS), round(middle[0], COORD_DECIMALS)],
        "runs": runs,
        "profile": profile,
    }


def main() -> None:
    drives = load_raw("msl_traverse.json", "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json", False)["features"]
    waypoints = [f["properties"] for f in load_raw("msl_waypoints.json", "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json", False)["features"]]
    route = json.loads((PROCESSED_DIR / "route.json").read_text(encoding="utf-8"))
    network = build_network(drives, waypoints)
    stops = route["stops"]
    nodes = {stop["id"]: network.nearest(route["points"][stop["pointIndex"]]["lat"], route["points"][stop["pointIndex"]]["lon"]) for stop in stops}
    pairs = {}
    for i, first in enumerate(stops):
        for second in stops[i + 1:]:
            pairs[f"{first['id']}|{second['id']}"] = describe(network, network.safest(nodes[first["id"]], nodes[second["id"]]))
    path = write_processed(OUTPUT_FILE, {
        "about": "Safest walking path between each pair of stops, over ground Curiosity drove. Built by scripts/prepare_safe_paths.py. "
                 f"Tracks within {JOIN_M:g} m (the rover's width) are joined; ground steeper than NASA's {HARD_TILT_DEG:g} degree suit limit is excluded; "
                 "the shortest remaining path is used (A* search). Entries run from the first id to the second.",
        "pairs": pairs,
    })
    print(f"Wrote {path}: {len(pairs)} pairs, network of {len(network.places)} places")
    write_network(network)


def write_network(network: Network) -> None:
    """The usable track network itself, so the browser can find paths to points chosen on the spot.

    Places as [lat, lon, elevation m]; edges as [place, place, rover tilt degrees, 1 if harder else 0],
    each written once. Edge lengths are not stored: they are the great-circle distance between places.
    """
    # Elevation to the centimetre: rounded to 0.1 m, the error added up to 0.3 m of climb over a long leg.
    places = [[round(p[1], COORD_DECIMALS), round(p[0], COORD_DECIMALS), round(p[2], 2)] for p in network.places]
    edges = []
    for a, neighbours in network.edges.items():
        for b, _, tilt, difficulty in neighbours:
            if a < b:
                edges.append([a, b, round(tilt, 2), 1 if difficulty == "moderate" else 0])
    path = write_processed(NETWORK_FILE, {
        "about": "Ground Curiosity drove in the boxwork, as a network for finding paths in the browser (A*). "
                 f"Built by scripts/prepare_safe_paths.py: drives resampled every {STEP_M:g} m, tracks within {JOIN_M:g} m joined, "
                 f"ground steeper than NASA's {HARD_TILT_DEG:g} degree suit limit left out. "
                 "places: [lat, lon, elevation m]; edges: [place, place, rover tilt deg, harder (1) or easier (0)].",
        "places": places,
        "edges": edges,
    })
    print(f"Wrote {path}: {len(places)} places, {len(edges)} edges")


if __name__ == "__main__":
    main()
