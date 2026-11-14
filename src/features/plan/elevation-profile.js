// @ts-check
/**
 * Elevation profile: height of the walk against distance walked, drawn as an
 * inline SVG so no charting library is needed.
 *
 * Data: safe_paths.json profiles (elevation from the Curiosity traverse file,
 * metres; distance along the path, metres). Derived.
 */
import { el } from '../../lib/dom.js';

/** @typedef {import('./plan-model.js').Plan} Plan */

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 360;
const HEIGHT = 150;
/** Room around the plot for axis labels, in SVG units. */
const PAD = { top: 18, right: 14, bottom: 26, left: 58 };

/**
 * Create an SVG element with attributes.
 * @param {string} tag
 * @param {Record<string, string | number>} attrs
 * @param {string} [text]
 * @returns {SVGElement}
 */
function svg(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Heights along the outward walk, in visiting order, with each stop's position,
 * joined from the legs' precomputed profiles.
 * @param {Plan} plan
 * @returns {{ series: { walkedM: number, elevationM: number }[], marks: { walkedM: number, elevationM: number, number: number }[] }}
 */
export function walkProfile(plan) {
  /** @type {{ walkedM: number, elevationM: number }[]} */
  const series = [];
  const marks = [];
  let offset = 0;
  for (const section of plan.sections.filter((item) => !item.isReturn)) {
    const profile = section.path.profile;
    if (marks.length === 0) marks.push({ walkedM: 0, elevationM: profile[0][1], number: 1 });
    profile.forEach(([walked, height], index) => {
      if (index > 0 || series.length === 0) series.push({ walkedM: offset + walked, elevationM: height });
    });
    offset += section.distanceM;
    // Numbered by visiting order, matching the badges on the map.
    marks.push({ walkedM: offset, elevationM: profile[profile.length - 1][1], number: marks.length + 1 });
  }
  return { series, marks };
}

/**
 * Draw the profile of the outward walk, in visiting order.
 * @param {Plan} plan The current plan.
 * @returns {HTMLElement} A figure holding the chart and its text alternative.
 */
export function renderElevationProfile(plan) {
  const { series, marks } = walkProfile(plan);
  const figure = el('figure', { className: 'profile' });
  if (series.length < 2) {
    figure.append(el('p', { className: 'chart-state', text: 'Add a stop to see the climb.' }));
    return figure;
  }

  const points = series.map((item) => ({ alongM: item.walkedM, elevationM: item.elevationM }));
  const heights = points.map((point) => point.elevationM);
  const low = Math.min(...heights);
  const high = Math.max(...heights);
  const length = points[points.length - 1].alongM;
  const x = (/** @type {number} */ along) => PAD.left + (along / length) * (WIDTH - PAD.left - PAD.right);
  const y = (/** @type {number} */ height) => HEIGHT - PAD.bottom - ((height - low) / (high - low || 1)) * (HEIGHT - PAD.top - PAD.bottom);

  const summary = `Elevation on the way out: from ${Math.round(heights[0])} m to ${Math.round(heights[heights.length - 1])} m over ${Math.round(length)} m, lowest ${Math.round(low)} m, highest ${Math.round(high)} m.`;
  const chart = svg('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: 'img', 'aria-label': summary, class: 'profile-chart' });

  for (const height of [low, high]) {
    chart.append(svg('line', { x1: PAD.left, x2: WIDTH - PAD.right, y1: y(height), y2: y(height), class: 'chart-grid' }));
    chart.append(svg('text', { x: PAD.left - 6, y: y(height) + 4, 'text-anchor': 'end', class: 'chart-axis-label' }, `${Math.round(height)} m`));
  }
  chart.append(svg('text', { x: PAD.left, y: HEIGHT - 6, class: 'chart-axis-label' }, '0 m'));
  chart.append(svg('text', { x: WIDTH - PAD.right, y: HEIGHT - 6, 'text-anchor': 'end', class: 'chart-axis-label' }, `${Math.round(length)} m walked`));

  chart.append(svg('polyline', {
    points: points.map((point) => `${x(point.alongM).toFixed(1)},${y(point.elevationM).toFixed(1)}`).join(' '),
    class: 'chart-line',
  }));

  for (const mark of marks) {
    chart.append(svg('circle', { cx: x(mark.walkedM), cy: y(mark.elevationM), r: 4, class: 'chart-point' }));
    chart.append(svg('text', { x: x(mark.walkedM), y: y(mark.elevationM) - 8, 'text-anchor': 'middle', class: 'chart-point-label' }, String(mark.number)));
  }

  figure.append(chart, el('figcaption', {
    className: 'data-source-caption',
    text: 'Height on the way out, on the safest paths. Source: Curiosity traverse, NASA/JPL-Caltech.',
  }));
  return figure;
}
