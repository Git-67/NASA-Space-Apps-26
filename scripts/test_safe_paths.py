"""Tests for the A* safest-path search (safe_paths.py), on small made-up networks.

Run:  python3 -m unittest discover scripts
TEST DATA ONLY: the places below are invented, about 11 m apart near Gale Crater.
"""
from __future__ import annotations

import heapq
import itertools
import math
import random
import unittest

from safe_paths import Network

# One step of 0.0001 degrees is about 5.9 m on Mars.
STEP_DEG = 0.0001
BASE_LON, BASE_LAT = 137.38, -4.80


def grid_network(size: int, steep: set[tuple[int, int]], seed: int) -> Network:
    """A size x size grid of places joined to their neighbours (diagonals included), some edges left out at random.

    Edges touching a cell in `steep` are left out, as add_drive leaves out ground beyond the suit limit.
    """
    rng = random.Random(seed)
    network = Network()
    index: dict[tuple[int, int], int] = {}
    for x, y in itertools.product(range(size), repeat=2):
        index[(x, y)] = network.place_at([BASE_LON + x * STEP_DEG * 2, BASE_LAT + y * STEP_DEG * 2, 0.0])
    for (x, y), a in index.items():
        for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
            other = (x + dx, y + dy)
            if other not in index or (x, y) in steep or other in steep or rng.random() < 0.2:
                continue
            b = index[other]
            length = network.straight_m(a, b)
            network.edges[a].append((b, length, 10.0, "easier"))
            network.edges[b].append((a, length, 10.0, "easier"))
    return network


def dijkstra_length(network: Network, start: int, goal: int) -> float:
    """Reference shortest distance, by plain Dijkstra, to check A* against."""
    best = {start: 0.0}
    queue = [(0.0, start)]
    while queue:
        cost, node = heapq.heappop(queue)
        if node == goal:
            return cost
        if cost > best[node]:
            continue
        for other, length, _, _ in network.edges[node]:
            if cost + length < best.get(other, math.inf):
                best[other] = cost + length
                heapq.heappush(queue, (cost + length, other))
    return math.inf


def path_length(network: Network, path: list[tuple[int, float, str]]) -> float:
    return sum(network.straight_m(a[0], b[0]) for a, b in zip(path, path[1:]))


class SafestPathTest(unittest.TestCase):
    def test_a_star_finds_the_shortest_path(self) -> None:
        for seed in range(20):
            network = grid_network(8, set(), seed)
            rng = random.Random(seed)
            start, goal = rng.sample(range(len(network.places)), 2)
            expected = dijkstra_length(network, start, goal)
            if math.isinf(expected):
                with self.assertRaises(ValueError):
                    network.safest(start, goal)
                continue
            path = network.safest(start, goal)
            self.assertEqual((path[0][0], path[-1][0]), (start, goal))
            self.assertAlmostEqual(path_length(network, path), expected, places=6)

    def test_never_crosses_ground_beyond_the_suit_limit(self) -> None:
        # A steep wall down the middle with one gap at the top: the path must go round through the gap.
        wall = {(3, y) for y in range(0, 6)}
        network = grid_network(7, wall, seed=1)
        start = network.nearest(BASE_LAT, BASE_LON)
        goal = network.nearest(BASE_LAT, BASE_LON + 6 * STEP_DEG * 2)
        path = network.safest(start, goal)
        wall_places = {network.nearest(BASE_LAT + y * STEP_DEG * 2, BASE_LON + 3 * STEP_DEG * 2) for (_, y) in wall}
        self.assertFalse(wall_places & {place for place, _, _ in path})

    def test_explores_fewer_places_than_dijkstra(self) -> None:
        network = grid_network(12, set(), seed=3)
        start = network.nearest(BASE_LAT, BASE_LON)
        goal = network.nearest(BASE_LAT + 11 * STEP_DEG * 2, BASE_LON + 11 * STEP_DEG * 2)
        network.safest(start, goal)
        guided = network.explored
        original = Network.straight_m
        try:
            Network.straight_m = lambda self, a, b: 0.0  # no guess: plain Dijkstra
            network.safest(start, goal)
        finally:
            Network.straight_m = original
        self.assertLess(guided, network.explored)


if __name__ == "__main__":
    unittest.main()
