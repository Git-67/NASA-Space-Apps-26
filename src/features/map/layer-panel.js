// @ts-check
/**
 * map-layer-panel (DESIGN.md): choose the imagery and switch map overlays on and off.
 * It starts closed, as a 44px "Layers" button, so it never covers the map
 * until asked; this is also how it collapses on small screens.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';

/**
 * @typedef {object} LayerChoice
 * @property {string} id Stable identifier, used in element IDs.
 * @property {string} label Name shown to the visitor: mission and instrument, per DESIGN.md.
 * @property {string} icon Material Symbols name shown before the label.
 * @property {string} note One or two sentences: the source and what the visitor should know.
 * @property {string} [unavailableReason] When set, the option is disabled and this says why.
 */

/**
 * @typedef {object} LayerPanel
 * @property {L.Control} control The Leaflet control to add to the map.
 * @property {(id: string, message: string) => void} setStatus Show a loading or error line under an option; an empty message clears it.
 */

/**
 * One radio button or checkbox row with its note and status line.
 * @param {'radio' | 'checkbox'} type
 * @param {LayerChoice} choice
 * @param {boolean} isChecked
 * @param {(isChecked: boolean) => void} onChange
 * @returns {{ row: HTMLElement, input: HTMLInputElement, status: HTMLElement }}
 */
function choiceRow(type, choice, isChecked, onChange) {
  const inputId = `layer-${choice.id}`;
  const input = /** @type {HTMLInputElement} */ (el('input', { attrs: { type, id: inputId, name: type === 'radio' ? 'map-imagery' : inputId } }));
  input.checked = isChecked;
  input.disabled = Boolean(choice.unavailableReason);
  input.addEventListener('change', () => onChange(input.checked));
  const status = el('p', { className: 'map-layer-status', attrs: { 'aria-live': 'polite' }, text: choice.unavailableReason ?? '' });
  const row = el('div', { className: 'map-layer-choice' }, [
    el('div', { className: 'check-row' }, [input, el('label', { attrs: { for: inputId } }, [icon(choice.icon), choice.label])]),
    el('p', { className: 'basis', text: choice.note }),
    status,
  ]);
  return { row, input, status };
}

/**
 * Build the layer panel.
 * @param {object} options
 * @param {LayerChoice[]} options.imagery Basemap choices; the first starts selected.
 * @param {LayerChoice[]} options.overlays Overlays; all start switched off.
 * @param {(id: string) => void} options.onImageryChange Called with the chosen imagery's ID.
 * @param {(id: string, isShown: boolean) => void} options.onOverlayChange Called when an overlay is switched.
 * @returns {LayerPanel}
 */
export function createLayerPanel({ imagery, overlays, onImageryChange, onOverlayChange }) {
  /** @type {Map<string, { input: HTMLInputElement, status: HTMLElement }>} */
  const rows = new Map();
  const imageryRows = imagery.map((choice, index) => {
    const built = choiceRow('radio', choice, index === 0, (isChecked) => { if (isChecked) onImageryChange(choice.id); });
    rows.set(choice.id, built);
    return built.row;
  });
  const overlayRows = overlays.map((choice) => {
    const built = choiceRow('checkbox', choice, false, (isChecked) => onOverlayChange(choice.id, isChecked));
    rows.set(choice.id, built);
    return built.row;
  });

  const panel = el('details', { className: 'map-layer-panel' }, [
    el('summary', { className: 'map-layer-toggle' }, [icon('layers'), 'Layers']),
    el('div', { className: 'map-layer-body' }, [
      el('fieldset', {}, [el('legend', { text: 'Imagery' }), ...imageryRows]),
      el('fieldset', {}, [el('legend', { text: 'Show on the map' }), ...overlayRows]),
    ]),
  ]);
  // Clicks, drags and scrolling inside the panel must not pan or zoom the map underneath.
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);

  const PanelControl = L.Control.extend({ onAdd: () => panel });

  return {
    control: new PanelControl({ position: 'topleft' }),
    setStatus(id, message) {
      const row = rows.get(id);
      if (row) row.status.textContent = message;
    },
  };
}
