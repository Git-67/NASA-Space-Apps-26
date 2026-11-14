// @ts-check
/**
 * Heading-up map for journey mode: the map turns so the way the walker faces
 * is up the screen.
 *
 * Leaflet 1.9 cannot rotate a map, and the plugins that can would be a new
 * dependency, so the map's box is turned with CSS instead:
 * - The box becomes a square as wide as the screen's diagonal, centred on the
 *   screen, so no corner is ever left empty whatever the angle.
 * - Dragging is corrected so the map moves under the finger, not along the
 *   box's turned axes (`predrag` on Leaflet's drag handler, the hook Leaflet's
 *   own map-bounds limit uses).
 * - Zooming by pinch or wheel zooms about the centre, and double-tap zoom is
 *   off: Leaflet works out a pointer's map position from the unturned box.
 * - Taps on map features would land in the wrong place for the same reason;
 *   journey.css turns them off while walking (also fewer mis-taps in dust).
 * Text on the map is turned back the other way, so it stays upright.
 *
 * Speed: turning a screen-sized map is the costliest thing journey mode does.
 * The angle is set on the box itself (not through a CSS variable, which made
 * every tile restyle), only for turns of a degree or more, and the few text
 * labels are turned back one by one.
 */
import L from '../../lib/leaflet.js';

/** Turns smaller than this, in degrees, are not drawn: a degree is not visible, and each redraw is costly. */
const MIN_TURN_DEG = 1;
/** Map text that is turned back to stay upright. */
const UPRIGHT_SELECTOR = '.map-label, .map-waypoint';

/**
 * @typedef {object} LeafletDraggable The parts of Leaflet's private drag handler this file corrects.
 * @property {(type: string, handler: () => void) => void} on
 * @property {L.Point} _startPos Map pane position when the drag began.
 * @property {L.Point} _newPos Map pane position Leaflet is about to set.
 * @property {{ x: number, y: number }} _parentScale The box's on-screen size over its own size.
 */

/**
 * Add rotation to a map.
 * @param {L.Map} map
 * @param {HTMLElement} container The map's box.
 */
export function createMapRotation(map, container) {
  let isOn = false;
  /** Screen angle of the map, degrees clockwise. Minus the walker's heading. */
  let angleDeg = 0;

  const dragging = /** @type {{ _draggable?: LeafletDraggable }} */ (/** @type {unknown} */ (map.dragging))._draggable;
  dragging?.on('predrag', () => {
    if (!isOn || !dragging) return;
    const radians = (angleDeg * Math.PI) / 180;
    // Leaflet scaled the finger's movement by the turned box's bounding size; undo that, then
    // turn the movement into the box's own axes.
    const dx = (dragging._newPos.x - dragging._startPos.x) * dragging._parentScale.x;
    const dy = (dragging._newPos.y - dragging._startPos.y) * dragging._parentScale.y;
    dragging._newPos = dragging._startPos.add(L.point(
      dx * Math.cos(radians) + dy * Math.sin(radians),
      -dx * Math.sin(radians) + dy * Math.cos(radians),
    ));
  });

  /** Turn every map label back by the map's angle, so it reads upright. */
  const straighten = () => {
    const upright = `${(-angleDeg).toFixed(1)}deg`;
    for (const label of container.querySelectorAll(UPRIGHT_SELECTOR)) /** @type {HTMLElement} */ (label).style.rotate = upright;
  };

  /** Size the box to the screen's diagonal. */
  const fit = () => {
    const parent = container.parentElement;
    if (!parent) return;
    const side = Math.ceil(Math.hypot(parent.clientWidth, parent.clientHeight));
    container.style.setProperty('--map-turned-side', `${side}px`);
    map.invalidateSize({ animate: false });
  };

  return {
    /** @param {boolean} isTurning Whether the map may turn (journey mode). */
    setEnabled(isTurning) {
      isOn = isTurning;
      container.classList.toggle('is-turnable', isTurning);
      map.options.touchZoom = isTurning ? 'center' : true;
      map.options.scrollWheelZoom = isTurning ? 'center' : true;
      if (isTurning) map.doubleClickZoom.disable();
      else map.doubleClickZoom.enable();
      if (!isTurning) {
        angleDeg = 0;
        container.style.removeProperty('--map-turned-side');
        container.style.rotate = '';
        for (const label of container.querySelectorAll(UPRIGHT_SELECTOR)) /** @type {HTMLElement} */ (label).style.rotate = '';
        map.invalidateSize({ animate: false });
        return;
      }
      fit();
    },
    /** Refit after the screen changes size. */
    fit() {
      if (isOn) fit();
    },
    /** @param {number} nextAngleDeg Screen angle of the map, degrees clockwise. */
    setAngle(nextAngleDeg) {
      if (!isOn || Math.abs(nextAngleDeg - angleDeg) < MIN_TURN_DEG) return;
      angleDeg = nextAngleDeg;
      container.style.rotate = `${angleDeg.toFixed(1)}deg`;
      straighten();
    },
    /** Turn map text upright again, after labels are redrawn. */
    straightenText() {
      if (isOn) straighten();
    },
    /** @returns {number} Screen angle of the map, degrees clockwise. */
    angle() {
      return angleDeg;
    },
    /**
     * Turn an offset on the screen into the same offset in the map box's own axes.
     * @param {{ x: number, y: number }} screen Pixels, x right and y down.
     * @returns {L.Point}
     */
    toBox(screen) {
      const radians = (angleDeg * Math.PI) / 180;
      return L.point(
        screen.x * Math.cos(radians) + screen.y * Math.sin(radians),
        -screen.x * Math.sin(radians) + screen.y * Math.cos(radians),
      );
    },
  };
}
