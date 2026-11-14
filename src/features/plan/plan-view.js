// @ts-check
/**
 * The "where" side of the panel: walking sections, hazards, packing list and
 * the tasks at each stop. Presentation only; the numbers
 * come from plan-model.js.
 */
import { el } from '../../lib/dom.js';
import { formatDuration } from '../../lib/mars.js';
import { listDangers, listKit } from './plan-model.js';
import { renderElevationProfile } from './elevation-profile.js';

/** @typedef {import('./plan-model.js').Route} Route */
/** @typedef {import('./plan-model.js').Plan} Plan */

const DIFFICULTY_LABEL = { easier: 'Easier', moderate: 'Moderate', hard: 'Hard' };
const DIFFICULTY_BADGE = { easier: 'badge-success', moderate: 'badge-warning', hard: 'badge-error' };
const TERRAIN_LABEL = { transition: 'Edge of the ridges', ridge: 'Ridge', hollow: 'Sandy hollow', track: 'On Curiosity\'s tracks' };

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
        el('th', { text: 'Leg', attrs: { scope: 'col' } }),
        el('th', { className: 'numeric', text: 'Distance (m)', attrs: { scope: 'col' } }),
        el('th', { className: 'numeric', text: 'Climb (m)', attrs: { scope: 'col' } }),
        el('th', { className: 'numeric', text: 'Time', attrs: { scope: 'col' } }),
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
    targets.sections.replaceChildren(el('p', { className: 'chart-state', text: 'Add a stop to plan a walk.' }));
  } else {
    // The sections are read on the map (hover, tap or focus a section). The table stays
    // as the accessible view DESIGN.md requires for every map, closed by default.
    targets.sections.replaceChildren(el('details', { className: 'disclosure' }, [
      el('summary', { text: 'Legs as a table' }),
      renderSectionTable(plan),
    ]));
  }

  const tile = (/** @type {string} */ label, /** @type {string} */ value, /** @type {string} */ unit) => el('div', { className: 'stat-tile' }, [
    el('span', { className: 'stat-label', text: label }),
    el('span', { className: 'stat-value' }, [value, el('span', { className: 'stat-unit', text: unit })]),
  ]);
  targets.totals.replaceChildren(
    tile('Time out (est.)', formatDuration(plan.totalMinutes), ''),
    tile('Round trip', String(Math.round(plan.distanceM)), ' m'),
    tile('Climb', String(Math.round(plan.ascentM)), ' m'),
  );

  targets.profile.replaceChildren(renderElevationProfile(plan));

  const dangers = listDangers(plan);
  targets.dangers.replaceChildren(el('ul', { className: 'carousel', attrs: { 'aria-label': `${dangers.length} dangers. Scroll sideways.` } },
    dangers.map((danger, index) => el('li', { className: 'carousel-card', attrs: { 'aria-label': `${index + 1} of ${dangers.length}` } }, [
      el('p', { className: 'eyebrow', text: `${index + 1} / ${dangers.length}` }),
      el('strong', { text: danger.title }),
      el('p', { text: danger.detail }),
      el('p', { className: 'basis', text: `Basis: ${danger.basis}` }),
    ]))));

  targets.kit.replaceChildren(el('ul', { className: 'kit-list' }, listKit(plan).map((entry) => el('li', {}, [
    el('span', { text: entry.item }),
    el('span', { className: 'kit-for', text: entry.forStops.length > 0 ? `for ${entry.forStops.join(', ')}` : 'always' }),
  ]))));
}

/**
 * The tasks for the walk, stop by stop in visiting order. Each stop is one tappable row
 * (number, name, time there) that opens to why it matters (with its source) and its tasks;
 * the stop chosen on the map opens by itself. Only one screen of rows, however many stops.
 * @param {HTMLElement} container
 * @param {Plan} plan
 * @param {string | null} focusedId Stop to open, for example one chosen on the map.
 */
export function renderTasks(container, plan, focusedId) {
  container.replaceChildren(el('ol', { className: 'task-groups' }, plan.stops.map((stop, index) => {
    const details = el('details', { className: 'disclosure task-group' }, [
      el('summary', {}, [
        el('span', { className: 'stop-number', text: String(index + 1), attrs: { 'aria-hidden': 'true' } }),
        el('span', { className: 'task-group-name', text: stop.name }),
        el('span', { className: 'task-group-time', text: `${stop.workMinutesOurs} min` }),
      ]),
      el('p', { className: 'eyebrow', text: TERRAIN_LABEL[stop.terrain] }),
      el('p', { className: 'task-why' }, [el('strong', { text: 'Why: ' }), stop.found]),
      el('ul', { className: 'task-list' }, stop.tasksOurs.map((task) => el('li', { text: task }))),
      el('a', { className: 'button-link source-link', text: `Source: ${stop.sourceLabel}`, attrs: { href: stop.sourceUrl, rel: 'noopener' } }),
    ]);
    if (stop.id === focusedId) details.setAttribute('open', '');
    return el('li', { className: stop.id === focusedId ? 'is-focused' : '', attrs: { id: `tasks-${stop.id}` } }, [details]);
  })));
}

/**
 * The sol's mission (ours): what today's walk is for, and a way back to it after the stops were changed.
 * @param {HTMLElement} container
 * @param {{ sol: number, title: string, goal: string, isFollowed: boolean }} mission
 * @param {() => void} onUse Called to go back to the mission's stops.
 */
export function renderMission(container, mission, onUse) {
  const children = [
    el('p', { className: 'eyebrow', text: `Mission for sol ${mission.sol} · ours` }),
    el('p', { className: 'mission-title', text: mission.title }),
    el('p', { className: 'mission-goal', text: mission.goal }),
  ];
  if (!mission.isFollowed) {
    const button = el('button', { className: 'button-secondary', text: 'Use this mission', attrs: { type: 'button' } });
    button.addEventListener('click', onUse);
    children.push(button);
  }
  container.replaceChildren(...children);
}
