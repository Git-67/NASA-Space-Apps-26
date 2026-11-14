// @ts-check
/**
 * Dark and light theme switching (see "Themes" in DESIGN.md).
 * The site follows the visitor's system setting until they use the toggle;
 * after that their choice is remembered on this device.
 */

const STORAGE_KEY = 'sol-stroll-theme';
/** @typedef {'dark' | 'light'} Theme */

/**
 * Read the remembered theme. Storage can be blocked (private windows), so failure is not an error.
 * @returns {Theme | null}
 */
function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Apply a theme to the page and describe the toggle's next action to assistive technology.
 * @param {Theme} theme
 * @param {HTMLElement} button
 */
function applyTheme(theme, button) {
  document.documentElement.dataset.theme = theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.textContent = theme === 'dark' ? '☀' : '☾';
}

/**
 * Wire up the theme toggle button.
 * @param {HTMLElement} button The toggle in the top navigation.
 */
export function initThemeToggle(button) {
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(readStoredTheme() ?? (systemPrefersLight ? 'light' : 'dark'), button);

  button.addEventListener('click', () => {
    /** @type {Theme} */
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next, button);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The theme still changes for this visit; it just will not be remembered.
    }
  });
}
