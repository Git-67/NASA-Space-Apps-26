"""Download and shrink the map imagery so the site works with no network.

Astronauts on Mars cannot reach NASA's tile servers, and their computers are
modest, so the site carries a small, fixed set of tiles:

Layer      Source                                              Area        Zooms   Stored as
hirise     Mars Trek `curiosity_hirise_mosaic` (MRO HiRISE)     WALK_AREA   12-16   grey JPEG
ctx        Mars Trek `curiosity_ctx_mosaic` (MRO CTX)           CRATER      8-10    grey JPEG
dem        Mars Trek `Gale_DEM_SMG_1m` (MRO HiRISE elevation)   WALK_AREA   12-14   PNG, unchanged
colour     Curiosity map `MSL_Gale_HiRISE-LRGB_78quads` (HiRISE colour, Web Mercator, TMS rows)
                                                                WALK_AREA   14-16   colour JPEG

Only the imagery is re-encoded (JPEG, quality JPEG_QUALITY), which changes no
position and no data value. Elevation tiles stay PNG because their grey levels
ARE the data (see calibrate_dem.py).

Grids: Trek tiles use a plain latitude/longitude grid, 180 / 2**z degrees per
tile, rows from 90° N, stored as {z}/{row}/{col}. Colour tiles keep their own
Web Mercator grid, stored as {z}/{col}/{tms_row} as on the source server.

Output: data/processed/tiles/<layer>/... (about 6 MB in all).
Needs Pillow (requirements.txt).

Run:  python3 scripts/build_offline_tiles.py [--refresh]
"""
from __future__ import annotations

import argparse
import io
import math
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

from mars_data import PROCESSED_DIR

TILE_DIR = PROCESSED_DIR / "tiles"
# South, west, north, east in degrees. WALK_AREA is every safe path and stop plus about 350 m.
WALK_AREA = (-4.815, 137.373, -4.794, 137.390)
# The whole of Gale Crater, as covered by the CTX mosaic.
CRATER = (-7.2137273, 136.2768326, -3.5804738, 139.3864225)
JPEG_QUALITY = 70
TREK = "https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/default/default028mm/{z}/{row}/{col}.png"
COLOUR = "https://mars.nasa.gov/mmgis-maps/MSL/Layers/MSL_Gale_HiRISE-LRGB_78quads/{z}/{col}/{row}.png"
_USER_AGENT = "Mozilla/5.0 (compatible; data-preparation-script)"

LAYERS = [
    # name, source layer, area, zooms, keep PNG
    ("hirise", "curiosity_hirise_mosaic", WALK_AREA, range(12, 17), False),
    ("ctx", "curiosity_ctx_mosaic", CRATER, range(8, 11), False),
    ("dem", "Gale_DEM_SMG_1m", WALK_AREA, range(12, 15), True),
]
COLOUR_ZOOMS = range(14, 17)


def trek_tiles(area: tuple[float, float, float, float], z: int) -> list[tuple[int, int]]:
    """(row, col) of every Trek tile touching an area."""
    south, west, north, east = area
    size = 180 / 2 ** z
    rows = range(int((90 - north) // size), int((90 - south) // size) + 1)
    cols = range(int((west + 180) // size), int((east + 180) // size) + 1)
    return [(row, col) for row in rows for col in cols]


def mercator_tiles(area: tuple[float, float, float, float], z: int) -> list[tuple[int, int]]:
    """(col, tms_row) of every Web Mercator tile touching an area."""
    south, west, north, east = area
    n = 2 ** z

    def row(lat: float) -> int:
        rad = math.radians(lat)
        return int((1 - math.log(math.tan(rad) + 1 / math.cos(rad)) / math.pi) / 2 * n)

    cols = range(int((west + 180) / 360 * n), int((east + 180) / 360 * n) + 1)
    # One extra row each side: the map's own tiles do not line up with Mercator rows,
    # so a map tile at the edge of the area also needs the row just beyond it.
    return [(col, n - 1 - r) for col in cols for r in range(row(north) - 1, row(south) + 2)]


def fetch(url: str) -> bytes | None:
    """A tile's bytes, or None where the server has no tile."""
    request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code in (403, 404):
            return None
        raise


def save(data: bytes, path: Path, keep_png: bool, is_grey: bool) -> int:
    """Write one tile, re-encoded as JPEG unless keep_png. Returns bytes written."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if keep_png:
        path.write_bytes(data)
        return len(data)
    image = Image.open(io.BytesIO(data))
    image = image.convert("L" if is_grey else "RGB")
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    path.write_bytes(buffer.getvalue())
    return buffer.tell()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download tiles that already exist again")
    args = parser.parse_args()
    for name, layer, area, zooms, keep_png in LAYERS:
        total = count = 0
        for z in zooms:
            for row, col in trek_tiles(area, z):
                path = TILE_DIR / name / str(z) / str(row) / f"{col}.{'png' if keep_png else 'jpg'}"
                if path.exists() and not args.refresh:
                    total += path.stat().st_size
                    count += 1
                    continue
                data = fetch(TREK.format(layer=layer, z=z, row=row, col=col))
                if data:
                    total += save(data, path, keep_png, is_grey=True)
                    count += 1
        print(f"{name}: {count} tiles, {total / 1e6:.2f} MB")
    total = count = 0
    for z in COLOUR_ZOOMS:
        for col, row in mercator_tiles(WALK_AREA, z):
            path = TILE_DIR / "colour" / str(z) / str(col) / f"{row}.jpg"
            if path.exists() and not args.refresh:
                total += path.stat().st_size
                count += 1
                continue
            data = fetch(COLOUR.format(z=z, col=col, row=row))
            if data:
                total += save(data, path, False, is_grey=False)
                count += 1
    print(f"colour: {count} tiles, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
