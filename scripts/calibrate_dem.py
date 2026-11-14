"""Calibrate NASA Mars Trek's Gale Crater elevation tiles against Curiosity.

The map draws contour lines from the Trek layer `Gale_DEM_SMG_1m` (an MRO
HiRISE elevation model of Gale Crater). Trek serves it only as 8-bit grey
picture tiles, not as elevation values, and publishes no scale for the grey
levels. This script finds that scale: it reads the grey level under every
Curiosity waypoint and fits a straight line to the rover's recorded elevation.

Datasets: Trek tiles of `Gale_DEM_SMG_1m` (MRO HiRISE), zoom 12, fetched from
          trek.nasa.gov and kept in data/raw/trek_gale_dem_z12/.
          Curiosity waypoints, data/raw/msl_waypoints.json (see prepare_route.py).
Output:   data/processed/dem_calibration.json

Units and conventions:
- Tiles use Trek's plain latitude/longitude grid ("EQ"): at zoom z a tile
  spans 180 / 2**z degrees, rows counted from 90 degrees north.
- Waypoint latitude and longitude are used as the source gives them.
- Elevation is the waypoints' `elev_geoid` field, in metres.
- The result is elevation_m = intercept_m + metres_per_level * grey.

Run:  python3 scripts/calibrate_dem.py [--refresh]
"""
from __future__ import annotations

import argparse
import math
import urllib.request
from typing import Any

from mars_data import RAW_DIR, load_raw, write_processed
from png_grey import read_grey_png

DEM_LAYER = "Gale_DEM_SMG_1m"
TILE_URL = "https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/default/default028mm/{z}/{row}/{col}.png"
# Zoom 12 tiles cover all of Curiosity's drive in a handful of files.
ZOOM = 12
TILE_PX = 256
# Extent of the elevation model, from its Trek capabilities file (south, west, north, east).
DEM_BOUNDS = (-4.9254743, 137.1224711, -4.2489631, 137.7298129)
TILE_DIR = RAW_DIR / "trek_gale_dem_z12"
WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json"
OUTPUT_FILE = "dem_calibration.json"
_USER_AGENT = "Mozilla/5.0 (compatible; data-preparation-script)"


def tile_bytes(row: int, col: int, refresh: bool) -> bytes:
    """Return one raw tile, downloading it when asked or missing."""
    path = TILE_DIR / f"{row}_{col}.png"
    if refresh or not path.exists():
        TILE_DIR.mkdir(parents=True, exist_ok=True)
        url = TILE_URL.format(layer=DEM_LAYER, z=ZOOM, row=row, col=col)
        request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(request, timeout=60) as response:
            path.write_bytes(response.read())
    return path.read_bytes()


def fit_line(pairs: list[tuple[int, float]]) -> dict[str, float]:
    """Least-squares straight line through (grey, elevation) pairs, with its errors.

    Returns intercept_m, metres_per_level, rms_error_m and max_error_m.

    Raises:
        ValueError: with fewer than two distinct grey levels.
    """
    count = len(pairs)
    mean_grey = sum(g for g, _ in pairs) / count
    mean_elev = sum(e for _, e in pairs) / count
    spread = sum((g - mean_grey) ** 2 for g, _ in pairs)
    if spread == 0:
        raise ValueError("Need at least two different grey levels to calibrate")
    slope = sum((g - mean_grey) * (e - mean_elev) for g, e in pairs) / spread
    intercept = mean_elev - slope * mean_grey
    errors = [e - (intercept + slope * g) for g, e in pairs]
    return {
        "intercept_m": intercept,
        "metres_per_level": slope,
        "rms_error_m": math.sqrt(sum(x * x for x in errors) / count),
        "max_error_m": max(abs(x) for x in errors),
    }


def sample_waypoints(waypoints: list[dict[str, Any]], refresh: bool) -> list[tuple[int, float]]:
    """Pair each waypoint inside the elevation model with the grey level under it."""
    south, west, north, east = DEM_BOUNDS
    degrees_per_tile = 180 / 2 ** ZOOM
    tiles: dict[tuple[int, int], list[list[int | None]]] = {}
    pairs: list[tuple[int, float]] = []
    for point in waypoints:
        lat, lon = point["lat"], point["lon"]
        if not (south < lat < north and west < lon < east):
            continue
        row_f, col_f = (90 - lat) / degrees_per_tile, (lon + 180) / degrees_per_tile
        key = (int(row_f), int(col_f))
        if key not in tiles:
            tiles[key] = read_grey_png(tile_bytes(*key, refresh))
        grey = tiles[key][int((row_f % 1) * TILE_PX)][int((col_f % 1) * TILE_PX)]
        if grey is not None:
            pairs.append((grey, float(point["elev_geoid"])))
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download the tiles and waypoints again")
    args = parser.parse_args()

    source = load_raw("msl_waypoints.json", WAYPOINTS_URL, args.refresh)
    waypoints = [feature["properties"] for feature in source["features"]]
    pairs = sample_waypoints(waypoints, args.refresh)
    fit = fit_line(pairs)
    payload = {
        "about": "Scale of the grey levels in NASA Mars Trek's Gale_DEM_SMG_1m tiles, fitted against Curiosity's recorded elevations by scripts/calibrate_dem.py. Derived, not published by NASA.",
        "layer": DEM_LAYER,
        "zoom": ZOOM,
        "waypointCount": len(pairs),
        "interceptM": round(fit["intercept_m"], 2),
        "metresPerLevel": round(fit["metres_per_level"], 3),
        "rmsErrorM": round(fit["rms_error_m"], 1),
        "maxErrorM": round(fit["max_error_m"], 1),
    }
    path = write_processed(OUTPUT_FILE, payload)
    print(f"Wrote {path}: {payload['metresPerLevel']} m per grey level, rms error {payload['rmsErrorM']} m over {len(pairs)} waypoints")


if __name__ == "__main__":
    main()
