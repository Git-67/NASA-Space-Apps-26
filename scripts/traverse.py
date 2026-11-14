"""Curiosity's driven path between waypoints, from the mission's traverse file.

Dataset: MSL_traverse.json from Curiosity's public location map on mars.nasa.gov.
         One line per drive, in driving order, each point as (lon, lat, elevation m).
         Checked on 14 Nov 2026: every drive ends exactly (0.00 m) on a waypoint
         of MSL_waypoints.json, so drive n is the path between the waypoint it
         starts from and the waypoint it ends on.

The waypoint file alone joins each pair of waypoints with a straight line,
which cuts corners and crosses itself where the rover turned. The drives give
the path the rover actually took.
"""
from __future__ import annotations

import math
from typing import Any

from mars_data import MARS_RADIUS_M, distance_m

# Drive lines are simplified to within this distance of the original, in metres.
# Some drives have thousands of points; 0.25 m is well under the width of a walker's path.
SIMPLIFY_TOLERANCE_M = 0.25
# A drive's end counts as reaching a waypoint when it is closer than this, in metres.
MATCH_TOLERANCE_M = 0.5


def drive_points(feature: dict[str, Any]) -> list[list[float]]:
    """All points of one drive as (lon, lat, elevation), joining multi-part lines."""
    geometry = feature["geometry"]
    if geometry["type"] == "LineString":
        return geometry["coordinates"]
    return [point for part in geometry["coordinates"] for point in part]


def _offset_m(origin: list[float], point: list[float]) -> tuple[float, float]:
    """East and north offset in metres from origin to point, on a local flat approximation."""
    lat0 = math.radians(origin[1])
    east = math.radians(point[0] - origin[0]) * MARS_RADIUS_M * math.cos(lat0)
    north = math.radians(point[1] - origin[1]) * MARS_RADIUS_M
    return east, north


def simplify(points: list[list[float]], tolerance_m: float = SIMPLIFY_TOLERANCE_M) -> list[list[float]]:
    """Douglas-Peucker simplification in metres. Keeps the first and last point."""
    if len(points) < 3:
        return points
    origin = points[0]
    xy = [_offset_m(origin, point) for point in points]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        (x1, y1), (x2, y2) = xy[first], xy[last]
        length = math.hypot(x2 - x1, y2 - y1)
        worst, worst_index = 0.0, -1
        for i in range(first + 1, last):
            x, y = xy[i]
            if length == 0:
                gap = math.hypot(x - x1, y - y1)
            else:
                gap = abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / length
            if gap > worst:
                worst, worst_index = gap, i
        if worst > tolerance_m:
            keep[worst_index] = True
            stack.extend([(first, worst_index), (worst_index, last)])
    return [point for point, kept in zip(points, keep) if kept]


def path_length_m(points: list[list[float]]) -> float:
    """Great-circle length of a line of (lon, lat, ...) points, in metres."""
    return sum(distance_m(a[1], a[0], b[1], b[0]) for a, b in zip(points, points[1:]))


def legs_between(waypoints: list[dict[str, Any]], drives: list[dict[str, Any]]) -> list[list[list[float]]]:
    """For each pair of consecutive waypoints, the drive that joins them.

    Args:
        waypoints: Consecutive waypoints (properties with lat and lon), in driving order.
        drives: Every feature of the traverse file, in driving order.

    Returns:
        One full-resolution line per pair, as (lon, lat, elevation) points.

    Raises:
        ValueError: when no drive starts at one waypoint and ends at the next.
    """
    ends = [drive_points(drive) for drive in drives]
    legs = []
    for start, end in zip(waypoints, waypoints[1:]):
        match = next((
            points for points in ends
            if distance_m(points[0][1], points[0][0], start["lat"], start["lon"]) < MATCH_TOLERANCE_M
            and distance_m(points[-1][1], points[-1][0], end["lat"], end["lon"]) < MATCH_TOLERANCE_M
        ), None)
        if match is None:
            raise ValueError(f"No drive joins the waypoints of sols {start['sol']} and {end['sol']}")
        legs.append(match)
    return legs
