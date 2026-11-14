// @ts-check
/**
 * Choose and order the stops: a search box with a dropdown of stops not yet in
 * the walk (and a recommended plan at the top), then the walk itself as a
 * numbered list in visiting order with move and remove buttons.
 *
 * The search box follows the ARIA combobox pattern: arrow keys move through
 * the options, Enter picks one, Escape closes the list. It is built once, so
 * typing is never interrupted when the rest of the page redraws.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';

/** @typedef {import('./plan-model.js').Route} Route */
/** @typedef {import('./plan-model.js').Stop} Stop */
/**
 * @typedef {object} PickerHandlers
 * @property {(stopId: string) => void} onAdd Add a stop at the end of the walk.
 * @property {() => void} onRecommended Replace the walk with the recommended plan.
 * @property {(stopId: string) => void} onRemove Take a stop out of the walk.
 * @property {(stopId: string, step: -1 | 1) => void} onMove Move a stop earlier (-1) or later (1).
 * @property {(stopId: string) => void} onFocus Show a stop's tasks and its leg on the map.
 */

const RECOMMENDED_ID = 'recommended';

/**
 * Does a stop match what was typed? Matches anywhere in the name or summary, ignoring case.
 * @param {Stop} stop
 * @param {string} query
 * @returns {boolean}
 */
export function matchesQuery(stop, query) {
  const text = `${stop.name} ${stop.summary}`.toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).every((word) => text.includes(word));
}

/**
 * Build the picker.
 * @param {HTMLElement} container
 * @param {Route} route
 * @param {string} recommendedLabel Text of the recommended option, for example "All 5 stops, safest order (2.0 km)".
 * @param {PickerHandlers} handlers
 * @returns {{ update: (visitOrder: string[], focusedId: string | null) => void }}
 */
export function createStopPicker(container, route, recommendedLabel, handlers) {
  const input = /** @type {HTMLInputElement} */ (el('input', {
    className: 'text-input', attrs: {
      id: 'stop-search', type: 'search', role: 'combobox', autocomplete: 'off',
      'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'stop-options', placeholder: 'Search stops',
    },
  }));
  const listbox = el('ul', { className: 'combobox-options', attrs: { id: 'stop-options', role: 'listbox', 'aria-label': 'Stops' } });
  listbox.hidden = true;
  const walkList = el('ol', { className: 'stop-list' });
  container.replaceChildren(
    el('div', { className: 'field' }, [el('label', { text: 'Add a stop', attrs: { for: 'stop-search' } }), el('div', { className: 'combobox' }, [input, listbox])]),
    walkList,
  );

  /** @type {string[]} */
  let visitOrder = [];
  /** @type {{ id: string, label: string, detail: string }[]} */
  let options = [];
  let activeIndex = -1;

  const close = () => {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };

  /** @param {string} id */
  const choose = (id) => {
    if (id === RECOMMENDED_ID) handlers.onRecommended();
    else handlers.onAdd(id);
    input.value = '';
    close();
  };

  const renderOptions = () => {
    const available = route.stops.filter((stop, index) => index > 0 && !visitOrder.includes(stop.id) && matchesQuery(stop, input.value));
    options = [
      ...(input.value.trim() === '' ? [{ id: RECOMMENDED_ID, label: 'Recommended plan', detail: recommendedLabel }] : []),
      ...available.map((stop) => ({ id: stop.id, label: stop.name, detail: stop.summary })),
    ];
    activeIndex = Math.min(activeIndex, options.length - 1);
    listbox.replaceChildren(...(options.length === 0
      ? [el('li', { className: 'combobox-empty', text: 'No more stops match.' })]
      : options.map((option, index) => {
        const item = el('li', {
          className: `combobox-option${option.id === RECOMMENDED_ID ? ' is-recommended' : ''}${index === activeIndex ? ' is-active' : ''}`,
          attrs: { id: `stop-option-${option.id}`, role: 'option', 'aria-selected': String(index === activeIndex) },
        }, [
          option.id === RECOMMENDED_ID ? icon('star') : icon('add_location'),
          el('span', {}, [el('span', { className: 'stop-name', text: option.label }), el('span', { className: 'stop-summary', text: option.detail })]),
        ]);
        // mousedown, not click, so the input keeps focus and the list does not close first.
        item.addEventListener('mousedown', (event) => { event.preventDefault(); choose(option.id); });
        return item;
      })));
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `stop-option-${options[activeIndex].id}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const open = () => {
    renderOptions();
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('focus', open);
  input.addEventListener('input', () => { activeIndex = -1; open(); });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (listbox.hidden) open();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + step + options.length) % Math.max(options.length, 1);
      renderOptions();
    } else if (event.key === 'Enter' && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex].id);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  return {
    update(order, focusedId) {
      visitOrder = order;
      if (!listbox.hidden) renderOptions();
      const start = route.stops[0];
      const rows = [start.id, ...order].map((id, position) => {
        const stop = /** @type {Stop} */ (route.stops.find((item) => item.id === id));
        const isStart = position === 0;
        const button = (/** @type {string} */ iconName, /** @type {string} */ label, /** @type {boolean} */ isDisabled, /** @type {() => void} */ action) => {
          const node = /** @type {HTMLButtonElement} */ (el('button', { className: 'button-icon', attrs: { type: 'button', 'aria-label': `${label}: ${stop.name}` } }, [icon(iconName)]));
          node.disabled = isDisabled;
          node.addEventListener('click', action);
          return node;
        };
        const name = el('button', { className: 'stop-focus', attrs: { type: 'button', 'aria-label': `Show tasks and leg for ${stop.name}` } }, [
          el('span', { className: 'stop-name', text: stop.name }),
          el('span', { className: 'stop-summary', text: isStart ? 'Start and finish' : stop.summary }),
        ]);
        name.addEventListener('click', () => handlers.onFocus(stop.id));
        return el('li', { className: `stop-item${stop.id === focusedId ? ' is-focused' : ''}` }, [
          el('span', { className: 'stop-number', text: String(position + 1), attrs: { 'aria-hidden': 'true' } }),
          name,
          isStart ? el('span') : el('span', { className: 'stop-move' }, [
            button('arrow_upward', 'Visit earlier', position <= 1, () => handlers.onMove(stop.id, -1)),
            button('arrow_downward', 'Visit later', position === order.length, () => handlers.onMove(stop.id, 1)),
            button('close', 'Remove', false, () => handlers.onRemove(stop.id)),
          ]),
        ]);
      });
      walkList.replaceChildren(...rows);
      walkList.setAttribute('aria-label', `Your walk: ${order.length + 1} stops in visiting order`);
    },
  };
}
