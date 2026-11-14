"""Prepare the names of places Curiosity explored, for the map's place-name option.

Datasets: the configuration of Curiosity's public location map on mars.nasa.gov
          (its "Sites" list: named places with a map view centre), and the
          map's "Surface View" layer (named sites with a 3D surface view).
Inputs:   data/raw/msl_map_config.json, data/raw/msl_surface_sites.json
          (downloaded with --refresh)
Output:   data/processed/landmarks.json

Units and conventions:
- Latitude and longitude in degrees, copied from the sources. The sources do
  not document their convention; see docs/DATA_SOURCES.md.
- A "Sites" entry gives the centre the mission map zooms to for that place,
  not a surveyed point. A "Surface View" entry is a small square; we use its
  centre. Both are positions for a label, not measurements.
- Entries that are not places are dropped: the whole crater view and the
  rover's "Current Location" view (which is a view centre, not the rover).

Run:  python3 scripts/prepare_landmarks.py [--refresh]
"""
from __future__ import annotations

import argparse
from typing import Any

from mars_data import load_raw, write_processed

CONFIG_URL = "https://mars.nasa.gov/maps/location/api/configure/get?mission=Curiosity"
SURFACE_SITES_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_SurfaceSites.json"
OUTPUT_FILE = "landmarks.json"
# Codes in the Sites list that are map views rather than places.
NOT_PLACES = {"GAC", "NOW"}
# Two names closer than this, in degrees (about 60 m on Mars), are one place listed twice.
SAME_PLACE_DEG = 0.001


def sites_from_config(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Named places from the mission map's Sites tool."""
    for tool in config.get("tools", []):
        if tool.get("name") == "Sites":
            return [
                {"name": site["name"], "lat": float(site["view"][0]), "lon": float(site["view"][1]), "source": "sites"}
                for site in tool["variables"]["sites"]
                if site["code"] not in NOT_PLACES
            ]
    raise ValueError("The mission map configuration has no Sites tool")


def sites_from_surface_views(collection: dict[str, Any]) -> list[dict[str, Any]]:
    """Named places from the Surface View layer, at the centre of each square."""
    places = []
    for feature in collection["features"]:
        ring = feature["geometry"]["coordinates"][0]
        lons = [corner[0] for corner in ring]
        lats = [corner[1] for corner in ring]
        places.append({
            "name": feature["properties"]["Name"],
            "lat": (min(lats) + max(lats)) / 2,
            "lon": (min(lons) + max(lons)) / 2,
            "source": "surface-view",
        })
    return places


def merge(places: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop a place when one with the same name, or at the same spot, is already listed."""
    kept: list[dict[str, Any]] = []
    for place in places:
        is_repeat = any(
            other["name"].lower() == place["name"].lower()
            or (abs(other["lat"] - place["lat"]) < SAME_PLACE_DEG and abs(other["lon"] - place["lon"]) < SAME_PLACE_DEG)
            for other in kept
        )
        if not is_repeat:
            kept.append({**place, "lat": round(place["lat"], 6), "lon": round(place["lon"], 6)})
    return kept


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download the sources again")
    args = parser.parse_args()
    config = load_raw("msl_map_config.json", CONFIG_URL, args.refresh)
    surface = load_raw("msl_surface_sites.json", SURFACE_SITES_URL, args.refresh)
    places = merge(sites_from_config(config) + sites_from_surface_views(surface))
    path = write_processed(OUTPUT_FILE, {
        "about": "Places Curiosity explored, named by NASA's Curiosity location map. Positions are label positions, not survey points. Built by scripts/prepare_landmarks.py.",
        "places": places,
    })
    print(f"Wrote {path}: {len(places)} places")


if __name__ == "__main__":
    main()
