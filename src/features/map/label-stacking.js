// @ts-check
/**
 * Keep map labels from covering each other.
 * Three of the stops sit within about 50 m, so at most zoom levels their name
 * labels would land on top of one another. Labels are placed top to bottom;
 * one that would overlap a label already placed moves down below it.
 */

/** @typedef {{ x: number, y: number, width: number, height: number }} LabelBox Screen box in pixels; x, y is the top-left corner. */

/**
 * @param {LabelBox} a
 * @param {LabelBox} b
 * @returns {boolean} Whether the two boxes overlap.
 */
function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * How far to move each label down so that no two overlap.
 * @param {LabelBox[]} boxes Where each label would sit with no adjustment.
 * @param {number} gapPx Space to leave between stacked labels, in pixels.
 * @returns {number[]} Downward shift in pixels for each box, in the order given.
 */
export function stackLabels(boxes, gapPx) {
  const order = boxes.map((_, index) => index).sort((a, b) => boxes[a].y - boxes[b].y);
  /** @type {LabelBox[]} */
  const placed = [];
  const shifts = boxes.map(() => 0);
  for (const index of order) {
    const box = { ...boxes[index] };
    let blocker = placed.find((other) => overlaps(box, other));
    while (blocker) {
      box.y = blocker.y + blocker.height + gapPx;
      blocker = placed.find((other) => overlaps(box, other));
    }
    shifts[index] = box.y - boxes[index].y;
    placed.push(box);
  }
  return shifts;
}
