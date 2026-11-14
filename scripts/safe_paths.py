"""Find the safest walking path between stops, over ground Curiosity drove.

Why only rover-driven ground: it is the only ground near the stops that a
machine is known to have crossed, and Curiosity recorded its tilt on it. The
elevation data we can carry offline resolves height only in 18.6 m steps (see
calibrate_dem.py), far too coarse to judge slopes a walker would meet, so
open, undriven ground is never used.

Network:  every Curiosity drive that touches the study area (traverse file),
          resampled to points about 2 m apart. Points of different drives
          closer than JOIN_M are treated as one place: JOIN_M is the rover's
          width (2.8 m, NASA/JPL MSL press kit), so two tracks that close
          overlap the ground the rover's own body covered.
Rules:    NASA's, from the Exploration EVA System Concept of Operations
          (EVA-EXP-0042 Rev B, section 4.2.1.3): the suit is planned to walk
          slopes of up to 20 degrees, and Apollo 15 crews crossed about 17.
          A drive is rated by the rover tilt at the waypoint it ended on:
          under 17 easier, 17 to 20 harder, 20 or more beyond the suit limit.
          Ground beyond the limit is NOT USED. These are lunar figures; NASA
          has set none for Mars.
Search:   Dijkstra's shortest path by distance over the usable ground. NASA
          publishes no weighting between the two usable classes, so none is
          invented: the safest path is the shortest one within NASA's limits.

Units: metres and degrees. Coordinates as the sources give them.
"""
from __future__ import annotations

import heapq
import math
from typing import Any

from mars_data import distance_m
from traverse import drive_points

# Curiosity's width in metres (NASA/JPL MSL landing press kit: 9 ft 1 in, 2.8 m).
# Tracks closer than this lie within the rover's own footprint, so they connect.
JOIN_M = 2.8
# Spacing of network points along each drive, in metres.
STEP_M = 2.0
# NASA EVA-EXP-0042 Rev B, section 4.2.1.3 (lunar): Apollo 15 crossed slopes of about 17 degrees;
# the suit is planned for slopes up to 20. Must match plan-model.js.
MODERATE_TILT_DEG = 17.0
HARD_TILT_DEG = 20.0
# Classes a walker may use. Ground beyond NASA's suit limit is left out of the network.
USABLE = {"easier", "moderate"}
# Only drives with a point inside this box (south, west, north, east) join the network.
AREA = (-4.83, 137.36, -4.78, 137.41)


def rate(tilt_deg: float) -> str:
    """Difficulty class for a rover tilt in degrees."""
    if tilt_deg >= HARD_TILT_DEG:
        return "hard"
    if tilt_deg >= MODERATE_TILT_DEG:
        return "moderate"
    return "easier"


def resample(points: list[list[float]], step_m: float) -> list[list[float]]:
    """Points along a line about step_m apart, keeping both ends. Points are (lon, lat, elevation)."""
    out = [points[0]]
    for a, b in zip(points, points[1:]):
        length = distance_m(a[1], a[0], b[1], b[0])
        pieces = max(1, int(length // step_m))
        for k in range(1, pieces + 1):
            t = k / pieces
            out.append([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
    return out


class Network:
    """Rover-driven ground as a graph of places joined by drive segments."""

    def __init__(self) -> None:
        self.places: list[list[float]] = []  # (lon, lat, elevation) of each place
        self.edges: dict[int, list[tuple[int, float, float, str]]] = {}  # place -> (other, length m, tilt deg, class)
        self._grid: dict[tuple[int, int], list[int]] = {}

    def _cell(self, lon: float, lat: float) -> tuple[int, int]:
        size_deg = math.degrees(JOIN_M / 3_389_500.0)
        return int(lon // size_deg), int(lat // size_deg)

    def place_at(self, point: list[float]) -> int:
        """The place within JOIN_M of a point, created if there is none."""
        cx, cy = self._cell(point[0], point[1])
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for index in self._grid.get((cx + dx, cy + dy), []):
                    other = self.places[index]
                    if distance_m(other[1], other[0], point[1], point[0]) <= JOIN_M:
                        return index
        self.places.append(point)
        index = len(self.places) - 1
        self._grid.setdefault((cx, cy), []).append(index)
        self.edges[index] = []
        return index

    def add_drive(self, points: list[list[float]], tilt_deg: float) -> None:
        """Add one drive, every segment carrying the drive's tilt."""
        nodes = [self.place_at(p) for p in resample(points, STEP_M)]
        difficulty = rate(tilt_deg)
        if difficulty not in USABLE:
            return
        for a, b in zip(nodes, nodes[1:]):
            if a == b:
                continue
            pa, pb = self.places[a], self.places[b]
            length = distance_m(pa[1], pa[0], pb[1], pb[0])
            self.edges[a].append((b, length, tilt_deg, difficulty))
            self.edges[b].append((a, length, tilt_deg, difficulty))

    def nearest(self, lat: float, lon: float) -> int:
        """The place closest to a position."""
        return min(range(len(self.places)), key=lambda i: distance_m(self.places[i][1], self.places[i][0], lat, lon))

    def safest(self, start: int, goal: int) -> list[tuple[int, float, str]]:
        """Shortest path as (place, tilt of the step into it, class), start first.

        Raises:
            ValueError: when the two places are not connected.
        """
        best = {start: 0.0}
        came: dict[int, tuple[int, float, str]] = {}
        queue = [(0.0, start)]
        while queue:
            cost, node = heapq.heappop(queue)
            if node == goal:
                break
            if cost > best[node]:
                continue
            for other, length, tilt, difficulty in self.edges[node]:
                new = cost + length
                if new < best.get(other, math.inf):
                    best[other] = new
                    came[other] = (node, tilt, difficulty)
                    heapq.heappush(queue, (new, other))
        if goal not in best:
            raise ValueError("The two stops are not joined by rover-driven ground")
        path = [(goal, came[goal][1] if goal in came else 0.0, came[goal][2] if goal in came else "easier")]
        node = goal
        while node != start:
            previous, _, _ = came[node]
            step = came.get(previous)
            path.append((previous, step[1] if step else 0.0, step[2] if step else "easier"))
            node = previous
        return list(reversed(path))


def build_network(drives: list[dict[str, Any]], waypoints: list[dict[str, Any]]) -> Network:
    """The network of every drive in AREA, each with the tilt of the waypoint it ended on."""
    south, west, north, east = AREA
    network = Network()
    for drive in drives:
        points = drive_points(drive)
        if not any(south < p[1] < north and west < p[0] < east for p in points):
            continue
        end = points[-1]
        ending = min(waypoints, key=lambda w: abs(w["lat"] - end[1]) + abs(w["lon"] - end[0]))
        network.add_drive(points, float(ending["tilt"]))
    return network
