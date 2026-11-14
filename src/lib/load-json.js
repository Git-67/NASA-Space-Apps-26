// @ts-check
/**
 * Load one of the prepared data files.
 * Paths are relative because GitHub Pages serves the site from a sub-path.
 * @param {string} relativePath Path from the site root, for example "data/processed/route.json".
 * @returns {Promise<any>} The parsed file. Callers validate its shape.
 * @throws {Error} With a plain-language message when the file cannot be loaded or parsed.
 */
export async function loadJson(relativePath) {
  let response;
  try {
    response = await fetch(relativePath);
  } catch {
    throw new Error(`Could not reach ${relativePath}. Check your connection and try again.`);
  }
  if (!response.ok) {
    throw new Error(`Could not load ${relativePath} (status ${response.status}).`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${relativePath} is not valid JSON.`);
  }
}
