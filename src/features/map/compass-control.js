// @ts-check
/**
 * map-control (DESIGN.md): the compass button. It appears once the visitor
 * has turned the map with two fingers, its arrow pointing to north, and
 * pressing it puts north back at the top.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';

/**
 * @param {() => void} onFaceNorth Called when the button is pressed.
 * @returns {{ control: L.Control, show: (mapAngleDeg: number) => void }}
 */
export function createCompassControl(onFaceNorth) {
  const arrow = icon('navigation');
  const button = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'map-compass',
    attrs: { type: 'button', 'aria-label': 'Put north at the top of the map', title: 'North up' },
  }, [arrow, el('span', { className: 'map-compass-label', text: 'N' })]));
  button.hidden = true;
  button.addEventListener('click', onFaceNorth);
  L.DomEvent.disableClickPropagation(button);
  const CompassControl = L.Control.extend({ onAdd: () => button });
  return {
    control: new CompassControl({ position: 'topleft' }),
    /** @param {number} mapAngleDeg How far the map is turned, degrees clockwise; 0 hides the button. */
    show(mapAngleDeg) {
      button.hidden = mapAngleDeg === 0;
      // The map turned clockwise by this much, so north on it now points this way on the screen.
      arrow.style.rotate = `${mapAngleDeg.toFixed(0)}deg`;
    },
  };
}
