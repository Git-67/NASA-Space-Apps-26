"""Collect ground photos for each stop: what Curiosity saw from that spot.

Dataset:  Curiosity (MSL) raw images, left navigation camera (NAV_LEFT_B), from
          NASA's raw image service https://mars.nasa.gov/api/v1/raw_image_items/.
          Credit, per image, as the service gives it: NASA/JPL-Caltech.
          Raw images are unprocessed and uncalibrated, and black and white.
Inputs:   data/processed/route.json (the five curated stops),
          data/processed/rover_stops.json (places Curiosity parked),
          data/raw/msl_waypoints.json (the rover's heading at each stop).
Outputs:  data/processed/ground_views.json (which photos, and where each looks),
          data/processed/ground/<stop id>/<n>.jpg (the photos, made smaller).

How photos are tied to a stop: each image carries the rover's site and drive
numbers, and so does each waypoint. Only images taken at the stop's own site
and drive, on the sol the rover arrived or the two sols after, are used.

Which way a photo looks (DERIVED, approximate):
  compass bearing = rover heading (waypoint `yaw`) + camera azimuth (`mast_az`).
  `mast_az` is measured from the rover's own forward direction: the same parked
  pose (azimuth 90.0, elevation -28.7) appears at stops where the rover faced
  different ways. The sum ignores the rover's tilt, which reaches about 15
  degrees here, so the bearing can be several degrees out. The page says "about".

Choice of photos: full-width frames looking near the horizon, one for each of
FRAMES_PER_STOP evenly spaced compass directions (the nearest frame to each).

The photos are made smaller (WIDTH_PX wide, JPEG) so the site still works
offline without a large download; each entry links to NASA's original.

Run:  python3 scripts/prepare_ground_views.py   (after prepare_rover_stops.py; needs the internet)
"""
from __future__ import annotations

import io
import json
import shutil
import urllib.request
from typing import Any

from PIL import Image

from mars_data import PROCESSED_DIR, RAW_DIR, REPO_ROOT, write_processed

API_URL = (
    "https://mars.nasa.gov/api/v1/raw_image_items/?order=sol%20asc&per_page=100&page={page}"
    "&condition_1=msl:mission&condition_2={first_sol}:sol:gte&condition_3={last_sol}:sol:lte"
    "&condition_4={camera}:instrument&search=&extended=thumbnail::sample_type::noteq"
)
CAMERA = "NAV_LEFT_B"
CAMERA_NAME = "Left navigation camera"
OUTPUT_FILE = "ground_views.json"
IMAGE_DIR = PROCESSED_DIR / "ground"
# The rover often images a stop over the sols after it arrives.
SOLS_AFTER_ARRIVAL = 2
FRAMES_PER_STOP = 8
# A photo further than this from its compass direction is not used for it.
MAX_OFF_DIRECTION_DEG = 30.0
# Looking near the horizon: lower than this is the rover's own deck, higher is sky.
MIN_ELEVATION_DEG, MAX_ELEVATION_DEG = -20.0, 20.0
FULL_WIDTH_PX = 1024
WIDTH_PX = 640
JPEG_QUALITY = 72
# Two positions closer than this, in degrees, are the same waypoint (about 6 cm on Mars).
POSITION_MATCH_DEG = 1e-6
_USER_AGENT = "Mozilla/5.0 (compatible; data-preparation-script)"


def fetch(url: str) -> bytes:
    """Download a URL. HTTPS only."""
    request = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def images_for_sols(first_sol: int, last_sol: int) -> list[dict[str, Any]]:
    """Every navigation camera image taken between two sols, following the service's pages."""
    items: list[dict[str, Any]] = []
    page = 0
    while True:
        answer = json.loads(fetch(API_URL.format(page=page, first_sol=first_sol, last_sol=last_sol, camera=CAMERA)))
        items.extend(answer["items"])
        if not answer.get("more"):
            return items
        page += 1


def angle_between(a: float, b: float) -> float:
    """Smallest angle between two bearings, in degrees (0 to 180)."""
    diff = abs(a - b) % 360
    return min(diff, 360 - diff)


def frame_width(item: dict[str, Any]) -> int:
    """Width of the image in pixels, from its `subframe_rect` "(x,y,width,height)"."""
    try:
        return int(str(item["subframe_rect"]).strip("()").split(",")[2])
    except (IndexError, ValueError):
        return 0


def usable_frames(items: list[dict[str, Any]], site: int, drive: int, yaw_deg: float) -> list[dict[str, Any]]:
    """Full-width frames taken at this stop looking near the horizon, each with its compass bearing.

    Args:
        items: Images from the raw image service.
        site, drive: The stop's position numbers; only images that carry the same pair are kept.
        yaw_deg: The rover's heading at the stop, degrees clockwise from north.
    """
    frames = []
    for item in items:
        if item.get("site") != site or item.get("drive") != drive or frame_width(item) < FULL_WIDTH_PX:
            continue
        extended = item.get("extended") or {}
        try:
            azimuth, elevation = float(extended["mast_az"]), float(extended["mast_el"])
        except (KeyError, TypeError, ValueError):
            continue
        if not MIN_ELEVATION_DEG <= elevation <= MAX_ELEVATION_DEG:
            continue
        frames.append({"item": item, "bearingDeg": (yaw_deg + azimuth) % 360, "elevationDeg": elevation})
    return frames


def choose_frames(frames: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    """Pick the frame nearest each of `count` evenly spaced compass directions, in turning order.

    A direction with no frame within MAX_OFF_DIRECTION_DEG is left out, and no frame is used twice.
    """
    chosen: list[dict[str, Any]] = []
    for step in range(count):
        direction = step * 360 / count
        candidates = [f for f in frames if f not in chosen and angle_between(f["bearingDeg"], direction) <= MAX_OFF_DIRECTION_DEG]
        if candidates:
            chosen.append(min(candidates, key=lambda f: angle_between(f["bearingDeg"], direction)))
    return sorted(chosen, key=lambda f: f["bearingDeg"])


def find_waypoint(stop: dict[str, Any], waypoints: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    """The waypoint a stop sits on: by its site and drive (`rmc`) when it has one, else by its position.

    Curated stops name their waypoint. Stops where the rover parked carry only the waypoint's own
    latitude and longitude, copied unchanged by prepare_rover_stops.py, so an exact match is expected.
    """
    if "rmc" in stop:
        return waypoints.get(stop["rmc"])
    for waypoint in waypoints.values():
        if abs(waypoint["lat"] - stop["lat"]) < POSITION_MATCH_DEG and abs(waypoint["lon"] - stop["lon"]) < POSITION_MATCH_DEG:
            return waypoint
    return None


def local_mars_time(lmst: str) -> str:
    """The clock time "HH:MM" from the service's local Mars time, for example "Sol-04560M13:34:21.6"."""
    _, _, clock = lmst.partition("M")
    return clock[:5]


def save_smaller(data: bytes, path: Any) -> int:
    """Store an image WIDTH_PX wide as a JPEG and return its size in bytes."""
    image = Image.open(io.BytesIO(data)).convert("L")
    height = round(image.height * WIDTH_PX / image.width)
    buffer = io.BytesIO()
    image.resize((WIDTH_PX, height), Image.LANCZOS).save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(buffer.getvalue())
    return len(buffer.getvalue())


def main() -> None:
    waypoints = {f["properties"]["RMC"]: f["properties"]
                 for f in json.loads((RAW_DIR / "msl_waypoints.json").read_text(encoding="utf-8"))["features"]}
    curated = json.loads((PROCESSED_DIR / "route.json").read_text(encoding="utf-8"))["stops"]
    parked = json.loads((PROCESSED_DIR / "rover_stops.json").read_text(encoding="utf-8"))["stops"]

    if IMAGE_DIR.exists():
        shutil.rmtree(IMAGE_DIR)
    views: dict[str, Any] = {}
    total_bytes = 0
    for stop in [*curated, *parked]:
        waypoint = find_waypoint(stop, waypoints)
        if waypoint is None:
            print(f"  {stop['id']}: its waypoint was not found, skipped")
            continue
        site, drive = int(waypoint["site"]), int(waypoint["drive"])
        sol = int(waypoint["sol"])
        frames = choose_frames(
            usable_frames(images_for_sols(sol, sol + SOLS_AFTER_ARRIVAL), site, drive, float(waypoint["yaw"])),
            FRAMES_PER_STOP,
        )
        if not frames:
            print(f"  {stop['id']}: no usable photos")
            continue
        entries = []
        for number, frame in enumerate(frames, start=1):
            item = frame["item"]
            file_path = IMAGE_DIR / stop["id"] / f"{number}.jpg"
            total_bytes += save_smaller(fetch(item["https_url"]), file_path)
            entries.append({
                "file": str(file_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "bearingDeg": round(frame["bearingDeg"], 1),
                "elevationDeg": round(frame["elevationDeg"], 1),
                "sol": int(item["sol"]),
                "takenUtc": item["date_taken"],
                "localMarsTime": local_mars_time(str((item.get("extended") or {}).get("lmst", ""))),
                "credit": item.get("image_credit") or "NASA/JPL-Caltech",
                "imageId": item["imageid"],
                "originalUrl": item["https_url"],
            })
        views[stop["id"]] = {"camera": CAMERA_NAME, "frames": entries}
        print(f"  {stop['id']}: {len(entries)} photos, sol {entries[0]['sol']}")

    path = write_processed(OUTPUT_FILE, {
        "about": "Ground photos at each stop: Curiosity's left navigation camera, taken at the stop's own site and drive. "
                 "bearingDeg is DERIVED (rover heading + camera azimuth), approximate, degrees clockwise from north. "
                 "Built by scripts/prepare_ground_views.py.",
        "source": {
            "name": "Curiosity raw images",
            "provider": "NASA/JPL-Caltech, Mars Science Laboratory",
            "url": "https://mars.nasa.gov/msl/multimedia/raw-images/",
        },
        "views": views,
    })
    print(f"Wrote {path.relative_to(REPO_ROOT)}: {len(views)} stops, {sum(len(v['frames']) for v in views.values())} photos, "
          f"{total_bytes / 1e6:.1f} MB of images")


if __name__ == "__main__":
    main()
