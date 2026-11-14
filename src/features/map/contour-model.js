// @ts-check
/**
 * Contour lines from a grid of values, by marching squares.
 *
 * The grid here is one NASA Mars Trek elevation tile: 8-bit grey levels, one
 * per pixel, where each level stands for a fixed step of elevation (see
 * data/processed/dem_calibration.json). Because the levels are whole numbers,
 * a contour is drawn halfway between two neighbouring levels (at k + 0.5), so
 * every line is a real boundary between two steps of the source data and no
 * line is invented between them.
 *
 * Coordinates: grid units, x to the right and y down, with the value of grid
 * cell (column, row) sitting at the cell's centre (column + 0.5, row + 0.5).
 */

/**
 * Which cell edges a contour crosses, for each of the 16 corner patterns.
 * Corner bits: top-left 8, top-right 4, bottom-right 2, bottom-left 1 (set when above the level).
 * Edges: 0 top, 1 right, 2 bottom, 3 left. Saddles (5 and 10) are resolved separately.
 * @type {number[][][]}
 */
const EDGE_PAIRS = [
  [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [], [[0, 2]], [[0, 3]],
  [[0, 3]], [[0, 2]], [], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2]], [],
];

/**
 * Point where the level crosses one edge of a cell, by linear interpolation.
 * @param {number} edge 0 top, 1 right, 2 bottom, 3 left.
 * @param {number} column Cell's left column.
 * @param {number} row Cell's top row.
 * @param {number[]} corners Values at top-left, top-right, bottom-right, bottom-left.
 * @param {number} level The contour level.
 * @returns {[number, number]} x and y in grid units.
 */
function crossing(edge, column, row, corners, level) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const share = (/** @type {number} */ from, /** @type {number} */ to) => (level - from) / (to - from);
  const left = column + 0.5;
  const top = row + 0.5;
  if (edge === 0) return [left + share(topLeft, topRight), top];
  if (edge === 1) return [left + 1, top + share(topRight, bottomRight)];
  if (edge === 2) return [left + share(bottomLeft, bottomRight), top + 1];
  return [left, top + share(topLeft, bottomLeft)];
}

/**
 * Edge pairs for one cell, with saddles split according to the cell's centre value.
 * @param {number} pattern Corner pattern, 0 to 15.
 * @param {number} centre Mean of the four corners.
 * @param {number} level The contour level.
 * @returns {number[][]} Pairs of edges joined by a line segment.
 */
function edgePairsFor(pattern, centre, level) {
  const isCentreAbove = centre > level;
  if (pattern === 5) return isCentreAbove ? [[0, 3], [2, 1]] : [[0, 1], [3, 2]];
  if (pattern === 10) return isCentreAbove ? [[0, 1], [3, 2]] : [[0, 3], [2, 1]];
  return EDGE_PAIRS[pattern];
}

/**
 * Trace the contour line segments of one level across a grid.
 * @param {ArrayLike<number>} values Grid values, row by row. NaN marks "no data"; cells touching it are skipped.
 * @param {number} width Number of columns.
 * @param {number} height Number of rows.
 * @param {number} level The value the line follows.
 * @returns {number[]} Segments as a flat list: x1, y1, x2, y2, then the next segment.
 */
export function traceLevel(values, width, height, level) {
  /** @type {number[]} */
  const segments = [];
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const at = row * width + column;
      const corners = [values[at], values[at + 1], values[at + width + 1], values[at + width]];
      if (corners.some(Number.isNaN)) continue;
      const pattern = (corners[0] > level ? 8 : 0) | (corners[1] > level ? 4 : 0)
        | (corners[2] > level ? 2 : 0) | (corners[3] > level ? 1 : 0);
      if (pattern === 0 || pattern === 15) continue;
      const centre = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
      for (const [from, to] of edgePairsFor(pattern, centre, level)) {
        segments.push(...crossing(from, column, row, corners, level), ...crossing(to, column, row, corners, level));
      }
    }
  }
  return segments;
}

/**
 * Trace every contour of a grid of whole-number levels: one line between each
 * pair of neighbouring levels present in the grid.
 * @param {ArrayLike<number>} values Grid values (whole numbers), row by row. NaN marks "no data".
 * @param {number} width Number of columns.
 * @param {number} height Number of rows.
 * @returns {{ level: number, segments: number[] }[]} One entry per level boundary, lowest first.
 *   `level` is the boundary in grid units (for example 52.5 between levels 52 and 53).
 */
export function traceStepContours(values, width, height) {
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (Number.isNaN(value)) continue;
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
  }
  /** @type {{ level: number, segments: number[] }[]} */
  const contours = [];
  for (let step = lowest; step < highest; step += 1) {
    const level = step + 0.5;
    contours.push({ level, segments: traceLevel(values, width, height, level) });
  }
  return contours;
}

/**
 * Join loose segments that share end points into continuous lines.
 * Neighbouring cells compute a shared crossing with the same arithmetic, so
 * matching end points are equal and can be matched exactly.
 * @param {number[]} segments Flat list: x1, y1, x2, y2, then the next segment.
 * @returns {number[][]} Lines as flat lists of x, y pairs.
 */
export function chainSegments(segments) {
  const count = segments.length / 4;
  const key = (/** @type {number} */ x, /** @type {number} */ y) => `${x.toFixed(4)},${y.toFixed(4)}`;
  /** @type {Map<string, number[]>} */
  const byEnd = new Map();
  for (let i = 0; i < count; i += 1) {
    for (const end of [0, 1]) {
      const k = key(segments[i * 4 + end * 2], segments[i * 4 + end * 2 + 1]);
      byEnd.set(k, [...(byEnd.get(k) ?? []), i]);
    }
  }
  const used = new Uint8Array(count);
  /** @type {number[][]} */
  const lines = [];
  /**
   * Walk from a point along unused segments, appending points.
   * @param {number[]} line Line being built; its last pair is the current end.
   */
  const extend = (line) => {
    for (;;) {
      const next = (byEnd.get(key(line[line.length - 2], line[line.length - 1])) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [x1, y1, x2, y2] = segments.slice(next * 4, next * 4 + 4);
      const isForward = key(x1, y1) === key(line[line.length - 2], line[line.length - 1]);
      line.push(...(isForward ? [x2, y2] : [x1, y1]));
    }
  };
  for (let i = 0; i < count; i += 1) {
    if (used[i]) continue;
    used[i] = 1;
    const line = segments.slice(i * 4, i * 4 + 4);
    extend(line);
    // Then grow the other end, by reversing, extending and reversing back.
    const reversed = [];
    for (let j = line.length - 2; j >= 0; j -= 2) reversed.push(line[j], line[j + 1]);
    extend(reversed);
    lines.push(reversed);
  }
  return lines;
}

/**
 * Round the corners of a line by Chaikin's corner cutting. Each pass replaces
 * every corner with two points a quarter of the way along its sides, so the
 * line never moves more than half a grid step from where it was traced.
 * Open lines keep their end points; closed loops stay closed.
 * @param {number[]} line Flat list of x, y pairs.
 * @param {number} passes How many times to cut the corners.
 * @returns {number[]} The rounded line.
 */
export function smoothLine(line, passes) {
  let current = line;
  for (let pass = 0; pass < passes; pass += 1) {
    const n = current.length / 2;
    if (n < 3) return current;
    const isClosed = current[0] === current[current.length - 2] && current[1] === current[current.length - 1];
    /** @type {number[]} */
    const next = isClosed ? [] : [current[0], current[1]];
    for (let i = 0; i < n - 1; i += 1) {
      const [ax, ay, bx, by] = current.slice(i * 2, i * 2 + 4);
      next.push(0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by, 0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by);
    }
    if (isClosed) next.push(next[0], next[1]);
    else next.push(current[current.length - 2], current[current.length - 1]);
    current = next;
  }
  return current;
}
