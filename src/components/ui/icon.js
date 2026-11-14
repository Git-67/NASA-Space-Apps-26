// @ts-check
/**
 * An icon from Google's Material Symbols (Outlined), the icon set chosen in
 * DESIGN.md. Apache License 2.0; the font is loaded from Google Fonts in
 * index.html. Icons are decoration: the control beside or around them always
 * carries its own text or accessible name, so they are hidden from screen readers.
 */
import { el } from '../../lib/dom.js';

/**
 * @param {string} name Material Symbols ligature name, for example "layers".
 * @returns {HTMLElement}
 */
export function icon(name) {
  return el('span', { className: 'icon', text: name, attrs: { 'aria-hidden': 'true' } });
}
