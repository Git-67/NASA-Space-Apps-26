// @ts-check
/**
 * Read the compact column format the data scripts write (scripts/mars_data.py,
 * to_columns): column names once, then one row of values per record.
 */

/**
 * Turn column data back into records.
 * @param {any} data `{ columns: string[], rows: unknown[][] }`.
 * @returns {Record<string, any>[]} One object per row, keyed by column name.
 * @throws {Error} When the data is not in that shape.
 */
export function fromColumns(data) {
  const columns = data?.columns;
  const rows = data?.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.some((row) => !Array.isArray(row) || row.length !== columns.length)) {
    throw new Error('Expected columns and rows of equal length.');
  }
  return rows.map((row) => Object.fromEntries(columns.map((name, index) => [name, row[index]])));
}
