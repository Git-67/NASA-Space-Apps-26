// @ts-check
/**
 * Pure logic for "hold and slide": the control that ends a walk.
 * The handle must be held still for a moment, then slid to the far end of its
 * track. A stray touch, a tap or a brush across the screen does neither.
 */

/** The handle must be held this long before it will move, in milliseconds. */
export const HOLD_BEFORE_SLIDE_MS = 500;
/** How far along the track the handle must get to confirm: nearly the whole way. */
export const SLIDE_COMPLETE_AT = 0.95;
/** How far one press of the arrow key moves the handle, as a share of the track. */
export const KEY_STEP = 0.08;

/**
 * How far along its track the handle is.
 * @param {number} startX Where the pointer was when the handle became free to move, in pixels.
 * @param {number} currentX Where the pointer is now, in pixels.
 * @param {number} travelPx How far the handle can travel, in pixels.
 * @returns {number} From 0 (start) to 1 (far end). Sliding backwards past the start stays at 0.
 */
export function slideProgress(startX, currentX, travelPx) {
  if (travelPx <= 0) return 0;
  return Math.min(1, Math.max(0, (currentX - startX) / travelPx));
}

/**
 * @param {number} progress From 0 to 1.
 * @returns {boolean} Whether the handle has been slid far enough to confirm.
 */
export function isSlideComplete(progress) {
  return progress >= SLIDE_COMPLETE_AT;
}
