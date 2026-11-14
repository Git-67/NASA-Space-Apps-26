// @ts-check
/**
 * The "where" side of the panel: stop checklist, walking sections, hazards,
 * packing list and the details of one stop. Presentation only; the numbers
 * come from plan-model.js.
 */
import { el } from '../../lib/dom.js';
import { formatDuration } from '../../lib/mars.js';
import { listDangers, listKit } from './plan-model.js';
import { renderElevationProfile } from './elevation-profile.js';

/** @typedef {import('./plan-model.js').Route} Route */
/** @typedef {import('./plan-model.js').Plan} Plan */
/** @typedef {import('./plan-model.js').Stop} Stop */

const DIFFICULTY_LABEL = { easier: 'Easier', moderate: 'Moderate', hard: 'Hard' };
const DIFFICULTY_BADGE = { easier: 'badge-success', moderate: 'badge-warning', hard: 'badge-error' };
const TERRAIN_LABEL = { transition: 'Edge of the ridges', ridge: 'Ridge', hollow: 'Sandy hollow' };

/**
 * Draw the stop checklist. The first stop is the start and cannot be removed.
 * @param {HTMLElement} container
 * @param {Route} route
 * @param {string[]} selectedStopIds
 * @param {(stopId: string, isSelected: boolean) => void} onToggle
 * @param {(stopId: string) => void} onShowDetails
 */
export function renderStopList(container, route, selectedStopIds, onToggle, onShowDetails) {
  const list = el('ol', { className: 'stop-list' });
  route.stops.forEach((stop, index) => {
    const isStart = index === 0;
    const checkbox = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', id: `stop-${stop.id}` } }));
    checkbox.checked = isStart || selectedStopIds.includes(stop.id);
    checkbox.disabled = isStart;
    checkbox.addEventListener('change', () => onToggle(stop.id, checkbox.checked));

    const details = el('button', { className: 'button-link', text: 'Details', attrs: { type: 'button', 'aria-label': `Details for ${stop.name}` } });
    details.addEventListener('click', () => onShowDetails(stop.id));

    list.append(el('li', { className: 'stop-item' }, [
      checkbox,
      el('label', { attrs: { for: `stop-${stop.id}` } }, [
        el('span', { className: 'stop-name', text: `${index + 1}. ${stop.name}` }),
        el('span', { className: 'stop-summary', text: isStart ? `${stop.summary} · start and finish` : stop.summary }),
      ]),
      details,
    ]));
  });
  container.replaceChildren(list);
}

/**
 * Draw the walking sections, totals, hazards, packing list and elevation profile.
 * @param {{ sections: HTMLElement, totals: HTMLElement, profile: HTMLElement, dangers: HTMLElement, kit: HTMLElement }} targets
 * @param {Route} route
 * @param {Plan} plan
 */
export function renderPlan(targets, route, plan) {
  if (plan.sections.length === 0) {
    targets.sections.replaceChildren(el('p', { className: 'chart-state', text: 'Tick at least one stop beyond the start to plan a walk.' }));
  } else {
    const rows = plan.sections.map((section) => el('tr', {}, [
      el('th', { attrs: { scope: 'row' } }, [
        el('span', { className: 'section-name', text: section.isReturn ? `Return to ${section.toName}` : `${section.fromName} to ${section.toName}` }),
      ]),
      el('td', { className: 'numeric', text: `${Math.round(section.distanceM)}` }),
      el('td', { className: 'numeric', text: `+${Math.round(section.ascentM)}` }),
      el('td', { className: 'numeric', text: formatDuration(section.walkMinutes) }),
      el('td', {}, [el('span', { className: `badge ${DIFFICULTY_BADGE[section.difficulty]}`, text: DIFFICULTY_LABEL[section.difficulty] })]),
    ]));
    targets.sections.replaceChildren(el('div', { className: 'table-scroll' }, [
      el('table', { className: 'data-table' }, [
        el('caption', { className: 'visually-hidden', text: 'Walking sections of the plan' }),
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Section', attrs: { scope: 'col' } }),
          el('th', { className: 'numeric', text: 'Distance (m)', attrs: { scope: 'col' } }),
          el('th', { className: 'numeric', text: 'Climb (m)', attrs: { scope: 'col' } }),
          el('th', { className: 'numeric', text: 'Walking time', attrs: { scope: 'col' } }),
          el('th', { text: 'Difficulty', attrs: { scope: 'col' } }),
        ])]),
        el('tbody', {}, rows),
      ]),
    ]));
  }

  const tile = (/** @type {string} */ label, /** @type {string} */ value, /** @type {string} */ unit) => el('div', { className: 'stat-tile' }, [
    el('span', { className: 'stat-label', text: label }),
    el('span', { className: 'stat-value' }, [value, el('span', { className: 'stat-unit', text: unit })]),
  ]);
  targets.totals.replaceChildren(
    tile('Total time (estimate)', formatDuration(plan.totalMinutes), ''),
    tile('Distance', String(Math.round(plan.distanceM)), ' m'),
    tile('Total climb', String(Math.round(plan.ascentM)), ' m'),
    tile('Work at stops', formatDuration(plan.workMinutes), ''),
  );

  targets.profile.replaceChildren(renderElevationProfile(route, plan));

  targets.dangers.replaceChildren(el('ul', { className: 'note-list' }, listDangers(plan).map((danger) => el('li', {}, [
    el('strong', { text: danger.title }),
    el('p', { text: danger.detail }),
    el('p', { className: 'basis', text: `Basis: ${danger.basis}` }),
  ]))));

  targets.kit.replaceChildren(el('ul', { className: 'kit-list' }, listKit(plan).map((entry) => el('li', {}, [
    el('span', { text: entry.item }),
    el('span', { className: 'kit-for', text: entry.forStops.length > 0 ? `for ${entry.forStops.join(', ')}` : 'every walk' }),
  ]))));
}

/**
 * Show what is known about one stop.
 * @param {HTMLElement} container
 * @param {Route} route
 * @param {Stop} stop
 */
export function renderStopDetails(container, route, stop) {
  const point = route.points[stop.pointIndex];
  const source = el('a', { className: 'button-link', text: stop.sourceLabel, attrs: { href: stop.sourceUrl, rel: 'noopener' } });
  container.replaceChildren(
    el('p', { className: 'eyebrow', text: `Stop ${route.stops.indexOf(stop) + 1} · ${TERRAIN_LABEL[stop.terrain]}` }),
    el('h3', { text: stop.name }),
    el('p', { className: 'telemetry', text: `${point.lat.toFixed(5)}°, ${point.lon.toFixed(5)}° · ${Math.round(point.elevationM)} m · Curiosity sol ${point.sol}` }),
    el('h4', { text: 'What Curiosity found' }),
    el('p', { text: stop.found }),
    el('p', { className: 'data-source-caption' }, ['Source: ', source, '.']),
    el('h4', { text: 'What a person could do here' }),
    el('p', { text: stop.taskOurs }),
    el('p', { className: 'basis', text: `Our own suggestion, not a NASA statement. Assumed time at this stop: ${stop.workMinutesOurs} min.` }),
  );
}
