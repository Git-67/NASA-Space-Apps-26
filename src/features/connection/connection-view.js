// @ts-check
/**
 * The signal status in the top bar: whether the page is reading live NASA
 * data or the copy stored with the site. It only reports; the page switches
 * by itself (src/lib/connection.js).
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
 * Show the current signal.
 * @param {{ status: HTMLElement, box: HTMLElement }} elements The badge, and the element holding it.
 * @param {{ mode: ConnectionMode | 'checking', dataTo: string | null, note?: string }} state
 *   `dataTo`: the newest date the page's data reaches. `note` explains a problem with the live data.
 */
export function renderConnection({ status, box }, { mode, dataTo, note }) {
  document.documentElement.dataset.connection = mode;
  if (mode === 'checking') {
    status.textContent = 'CHECKING SIGNAL…';
    box.title = 'Checking the link to NASA.';
    return;
  }
  const isOnline = mode === 'online';
  const detail = isOnline ? ' · NASA' : ` · DATA TO ${dataTo ? badgeDate(dataTo) : '?'}`;
  // The detail drops out on narrow screens (CSS); the spoken label and the title keep the whole story.
  status.replaceChildren(isOnline ? 'LIVE' : 'NO SIGNAL', el('span', { className: 'connection-detail', text: detail }));
  const explanation = note ?? (isOnline
    ? 'Signal found. Reading live data from NASA.'
    : 'No signal. Showing the data stored with the site. It will go live by itself when the signal returns.');
  box.setAttribute('aria-label', `${isOnline ? 'Live' : 'No signal'}${detail}. ${explanation}`);
  box.title = explanation;
}
