// @ts-check
/**
 * The connection status in the top bar: whether the page is reading live NASA
 * data or the copy stored with the site, and a button to switch.
 * The badge never says LIVE unless the data really is live (DESIGN.md, badge-live).
 */
import { el } from '../../lib/dom.js';

/** @typedef {import('../../lib/connection.js').ConnectionMode} ConnectionMode */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * "2026-11-14" as "14 NOV 2026", for the badge.
 * @param {string} date
 * @returns {string}
 */
export function badgeDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Show the current mode on the connection button.
 * @param {{ status: HTMLElement, toggle: HTMLButtonElement }} elements The badge, and the button holding it.
 * @param {{ mode: ConnectionMode | 'checking', dataTo: string | null, note?: string }} state
 *   `dataTo`: the newest date the page's data reaches. `note` explains a forced offline mode.
 */
export function renderConnection({ status, toggle }, { mode, dataTo, note }) {
  document.documentElement.dataset.connection = mode;
  toggle.disabled = mode === 'checking';
  const action = /** @type {HTMLElement} */ (toggle.querySelector('.connection-action'));
  if (mode === 'checking') {
    status.textContent = 'CHECKING LINK…';
    action.textContent = '';
    toggle.setAttribute('aria-label', 'Checking the link to NASA');
    return;
  }
  const isOnline = mode === 'online';
  const detail = isOnline ? ' · NASA' : ` · DATA TO ${dataTo ? badgeDate(dataTo) : '?'}`;
  // The detail and the action text drop out on narrow screens (CSS); the label and title keep the whole story.
  status.replaceChildren(isOnline ? 'LIVE' : 'OFFLINE', el('span', { className: 'connection-detail', text: detail }));
  action.textContent = isOnline ? 'Go offline' : 'Go online';
  const explanation = note ?? (isOnline ? 'Reading live data from NASA.' : 'Showing the data stored with the site.');
  toggle.setAttribute('aria-label', `${isOnline ? 'Live' : 'Offline'}${detail}. ${explanation} ${action.textContent}.`);
  toggle.title = explanation;
  toggle.setAttribute('aria-pressed', String(!isOnline));
}
