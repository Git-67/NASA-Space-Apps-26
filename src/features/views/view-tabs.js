// @ts-check
/**
 * The three views of the page and the tabs in the top nav that switch them:
 * Map (the map alone, with the verdict pop-up), Briefing and Weather
 * (dashboards). One view shows at a time.
 *
 * The view is kept in the address (#map, #briefing, #weather), so a reload or
 * a shared link opens the same view.
 */

/** @typedef {'map' | 'briefing' | 'weather'} ViewId */

/** Every view, in tab order. The first is shown when the address names none. */
export const VIEW_IDS = /** @type {const} */ (['map', 'briefing', 'weather']);

/**
 * Read the view named in an address fragment.
 * @param {string} hash The fragment, for example "#weather".
 * @returns {ViewId} The named view, or the first view when the fragment names none.
 */
export function viewFromHash(hash) {
  const name = hash.replace(/^#/, '');
  return /** @type {ViewId} */ (VIEW_IDS.find((id) => id === name) ?? VIEW_IDS[0]);
}

/**
 * Wire up the nav tabs and anything else on the page that switches view.
 * @param {(view: ViewId) => void} onShow Called each time a view is shown, including the first.
 * @returns {{ show: (view: ViewId) => void, current: () => ViewId }}
 */
export function initViewTabs(onShow) {
  const tabs = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.nav-tabs [role="tab"]')]);
  /** @type {ViewId} */
  let current = VIEW_IDS[0];

  /** @param {ViewId} view */
  const show = (view) => {
    current = view;
    for (const tab of tabs) {
      const isSelected = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !isSelected;
    }
    // Styles that depend on the view (the footer, the page's scrolling) read this.
    document.body.dataset.view = view;
    if (viewFromHash(window.location.hash) !== view || window.location.hash === '') {
      window.history.replaceState(null, '', `#${view}`);
    }
    window.scrollTo(0, 0);
    onShow(view);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(viewFromHash(`#${tab.dataset.view}`)));
    // Arrow keys move between tabs, as the tab pattern expects.
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      show(viewFromHash(`#${next.dataset.view}`));
    });
  });
  // Buttons inside a view that lead to another ("See it on the map").
  for (const button of document.querySelectorAll('[data-show-view]')) {
    button.addEventListener('click', () => show(viewFromHash(`#${/** @type {HTMLElement} */ (button).dataset.showView}`)));
  }
  window.addEventListener('hashchange', () => {
    const view = viewFromHash(window.location.hash);
    if (view !== current) show(view);
  });

  show(viewFromHash(window.location.hash));
  return { show, current: () => current };
}
