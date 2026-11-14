// @ts-check
/**
 * An icon from Google's Material Symbols (Outlined), the icon set chosen in
 * DESIGN.md (Apache License 2.0), drawn as an inline SVG from the paths in
 * icon-paths.js (scripts/vendor_icons.py). No font is loaded, so an icon can
 * never appear as its name in plain text, online or offline.
 * Icons are decoration: the control beside or around them always carries its
 * own text or accessible name, so they are hidden from screen readers.
 */
import { ICON_PATHS, ICON_VIEW_BOX } from './icon-paths.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {string} name Material Symbols name, for example "layers". Must be in scripts/vendor_icons.py.
 * @returns {SVGSVGElement}
 * @throws {Error} When the icon was not bundled: a programming error, caught in testing.
 */
export function icon(name) {
  const path = ICON_PATHS[name];
  if (!path) throw new Error(`Icon "${name}" is not bundled. Add it to scripts/vendor_icons.py and run it.`);
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(SVG_NS, 'svg'));
  svg.setAttribute('viewBox', ICON_VIEW_BOX);
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shape = document.createElementNS(SVG_NS, 'path');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}

/**
 * Draw the icons written into the page's HTML as `<span data-icon="name"></span>`.
 * @param {ParentNode} root
 */
export function drawPageIcons(root) {
  for (const placeholder of root.querySelectorAll('[data-icon]')) {
    placeholder.replaceWith(icon(/** @type {HTMLElement} */ (placeholder).dataset.icon ?? ''));
  }
}
