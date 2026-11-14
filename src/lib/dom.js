// @ts-check
/**
 * Build a DOM element without innerHTML, so data can never be parsed as markup.
 * @param {string} tag Element name, for example "li".
 * @param {{ className?: string, text?: string, attrs?: Record<string, string> }} [options]
 * @param {(Node | string)[]} [children] Child nodes or strings, appended in order.
 * @returns {HTMLElement} The new element.
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/**
 * Find an element that the page is required to contain.
 * @param {string} id The element's id.
 * @returns {HTMLElement} The element.
 * @throws {Error} When the page has no such element, which is a programming error.
 */
export function requireElement(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Page is missing the #${id} element.`);
  return node;
}
