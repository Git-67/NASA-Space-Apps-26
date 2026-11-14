// @ts-check
/**
 * Elevation profile: height of the rover's path against distance walked,
 * drawn as an inline SVG so no charting library is needed.
 *
 * Data: route.json. Elevation is the source's `elev_geoid` field in metres;
 * distance is derived along the waypoints, in metres.
 */
import { el } from '../../lib/dom.js';

/** @typedef {import('./plan-model.js').Route} Route */
/** @typedef {import('./plan-model.js').Plan} Plan */

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 360;
const HEIGHT = 150;
/** Room around the plot for axis labels, in SVG units. */
const PAD = { top: 18, right: 14, bottom: 26, left: 46 };

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
 * Draw the profile from the start to the furthest stop in the plan.
 * @param {Route} route The prepared route.
 * @param {Plan} plan The current plan.
 * @returns {HTMLElement} A figure holding the chart and its text alternative.
 */
export function renderElevationProfile(route, plan) {
  const lastStop = plan.stops[plan.stops.length - 1];
  const points = route.points.slice(0, lastStop.pointIndex + 1);
  const figure = el('figure', { className: 'profile' });
  if (points.length < 2) {
    figure.append(el('p', { className: 'chart-state', text: 'Select a stop beyond the start to see the climb.' }));
    return figure;
  }

  const heights = points.map((point) => point.elevationM);
  const low = Math.min(...heights);
  const high = Math.max(...heights);
  const length = points[points.length - 1].alongM;
  const x = (/** @type {number} */ along) => PAD.left + (along / length) * (WIDTH - PAD.left - PAD.right);
  const y = (/** @type {number} */ height) => HEIGHT - PAD.bottom - ((height - low) / (high - low || 1)) * (HEIGHT - PAD.top - PAD.bottom);

  const summary = `Elevation along the route: from ${Math.round(heights[0])} m to ${Math.round(heights[heights.length - 1])} m over ${Math.round(length)} m, lowest ${Math.round(low)} m, highest ${Math.round(high)} m.`;
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

  for (const stop of plan.stops) {
    const point = route.points[stop.pointIndex];
    const number = route.stops.indexOf(stop) + 1;
    chart.append(svg('circle', { cx: x(point.alongM), cy: y(point.elevationM), r: 4, class: 'chart-point' }));
    chart.append(svg('text', { x: x(point.alongM), y: y(point.elevationM) - 8, 'text-anchor': 'middle', class: 'chart-point-label' }, String(number)));
  }

  figure.append(chart, el('figcaption', {
    className: 'data-source-caption',
    text: 'Elevation along Curiosity\'s path, in metres as recorded in the waypoint file. Numbers mark the stops. Source: Curiosity waypoints, NASA/JPL-Caltech.',
  }));
  return figure;
}
