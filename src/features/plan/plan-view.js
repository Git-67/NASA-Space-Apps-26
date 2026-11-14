// @ts-check
/**
 * The "where" side of the panel: stop checklist, walking sections, hazards,
 * packing list and the details of one stop. Presentation only; the numbers
 * come from plan-model.js.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
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
 * Draw the stop checklist in visiting order. The first stop is the start: it
 * cannot be removed or moved. Every other stop can be ticked, and moved earlier
 * or later in the walk.
 * @param {HTMLElement} container
 * @param {Route} route
 * @param {{ order: string[], selectedIds: string[] }} choice All stop ids in visiting order, and which are ticked.
 * @param {{ onToggle: (stopId: string, isSelected: boolean) => void, onMove: (stopId: string, step: -1 | 1) => void,
 *   onShowDetails: (stopId: string) => void }} handlers
 */
export function renderStopList(container, route, choice, handlers) {
  const list = el('ol', { className: 'stop-list' });
  const stops = choice.order.map((id) => route.stops.find((stop) => stop.id === id)).filter((stop) => stop !== undefined);
  stops.forEach((stop, position) => {
    const isStart = stop === route.stops[0];
    const number = route.stops.indexOf(stop) + 1;
    const checkbox = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', id: `stop-${stop.id}` } }));
    checkbox.checked = isStart || choice.selectedIds.includes(stop.id);
    checkbox.disabled = isStart;
    checkbox.addEventListener('change', () => handlers.onToggle(stop.id, checkbox.checked));

    const moveButton = (/** @type {-1 | 1} */ step, /** @type {string} */ iconName, /** @type {string} */ label, /** @type {boolean} */ isDisabled) => {
      const button = /** @type {HTMLButtonElement} */ (el('button', { className: 'button-icon', attrs: { type: 'button', 'aria-label': `${label}: ${stop.name}` } }, [icon(iconName)]));
      button.disabled = isDisabled;
      button.addEventListener('click', () => handlers.onMove(stop.id, step));
      return button;
    };
    const details = el('button', { className: 'button-link', text: 'Details', attrs: { type: 'button', 'aria-label': `Details for ${stop.name}` } });
    details.addEventListener('click', () => handlers.onShowDetails(stop.id));

    list.append(el('li', { className: 'stop-item' }, [
      checkbox,
      el('label', { attrs: { for: `stop-${stop.id}` } }, [
        el('span', { className: 'stop-name', text: `${number}. ${stop.name}` }),
        el('span', { className: 'stop-summary', text: isStart ? `${stop.summary} · start and finish` : stop.summary }),
      ]),
      isStart ? el('span') : el('span', { className: 'stop-move' }, [
        moveButton(-1, 'arrow_upward', 'Visit earlier', position <= 1),
        moveButton(1, 'arrow_downward', 'Visit later', position === stops.length - 1),
      ]),
      details,
    ]));
  });
  container.replaceChildren(list);
}

/**
 * The plan's sections as a table: the accessible view of what the map shows on hover.
 * @param {Plan} plan
 * @returns {HTMLElement}
 */
function renderSectionTable(plan) {
  const rows = plan.sections.map((section) => el('tr', {}, [
    el('th', { attrs: { scope: 'row' } }, [
      el('span', { className: 'section-name', text: section.isReturn ? `Return to ${section.toName}` : `${section.fromName} to ${section.toName}` }),
    ]),
    el('td', { className: 'numeric', text: `${Math.round(section.distanceM)}` }),
    el('td', { className: 'numeric', text: `+${Math.round(section.ascentM)}` }),
    el('td', { className: 'numeric', text: formatDuration(section.walkMinutes) }),
    el('td', {}, [el('span', { className: `badge ${DIFFICULTY_BADGE[section.difficulty]}`, text: DIFFICULTY_LABEL[section.difficulty] })]),
  ]));
  return el('div', { className: 'table-scroll' }, [
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
  ]);
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
    // The sections are read on the map (hover, tap or focus a section). The table stays
    // as the accessible view DESIGN.md requires for every map, closed by default.
    targets.sections.replaceChildren(el('details', { className: 'table-toggle' }, [
      el('summary', { className: 'button-link', text: 'View sections as a table' }),
      renderSectionTable(plan),
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

  const dangers = listDangers(plan);
  targets.dangers.replaceChildren(el('ul', { className: 'carousel', attrs: { 'aria-label': `${dangers.length} dangers, scroll sideways for more` } },
    dangers.map((danger, index) => el('li', { className: 'carousel-card', attrs: { 'aria-label': `${index + 1} of ${dangers.length}` } }, [
      el('p', { className: 'eyebrow', text: `${index + 1} / ${dangers.length}` }),
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
