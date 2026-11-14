// @ts-check
/**
 * Load every prepared file the briefing page uses, and check each one's shape
 * at the boundary. The route and the weather are required; the map layers and
 * the space weather record are optional, so a missing one only switches off
 * its own part of the page.
 */
import { loadJson } from '../lib/load-json.js';
import { parseDemCalibration, parseLandmarks } from '../features/map/map-layer-data.js';
import { parseSpaceWeather } from '../features/conditions/space-weather-model.js';

/** @typedef {import('../features/plan/plan-model.js').Route} Route */
/** @typedef {import('../features/conditions/conditions-model.js').WeatherRecord} WeatherRecord */
/** @typedef {import('../features/map/map-layer-data.js').Place} Place */
/** @typedef {import('../features/map/map-layer-data.js').DemCalibration} DemCalibration */
/** @typedef {import('../features/conditions/space-weather-model.js').SpaceWeather} SpaceWeather */
/**
 * @typedef {object} BriefingData
 * @property {Route} route
 * @property {WeatherRecord[]} records
 * @property {Place[] | Error} places
 * @property {DemCalibration | Error} calibration
 * @property {SpaceWeather | Error} spaceWeather
 */

const ROUTE_FILE = 'data/processed/route.json';
const WEATHER_FILE = 'data/processed/weather.json';
const LANDMARKS_FILE = 'data/processed/landmarks.json';
const DEM_CALIBRATION_FILE = 'data/processed/dem_calibration.json';
const SPACE_WEATHER_FILE = 'data/processed/space_weather.json';

/**
 * @param {any} data
 * @returns {Route}
 */
function parseRoute(data) {
  const isValid = Array.isArray(data?.points) && Array.isArray(data?.stops) && data.points.length >= 2 && data.stops.length >= 1
    && data.points.every((/** @type {any} */ point) => Array.isArray(point?.track));
  if (!isValid) throw new Error('The route file is empty or damaged. Run scripts/prepare_route.py again.');
  return data;
}

/**
 * @param {any} data
 * @returns {WeatherRecord[]}
 */
function parseWeather(data) {
  if (!Array.isArray(data?.records) || data.records.length === 0) {
    throw new Error('The weather file is empty or damaged. Run scripts/prepare_weather.py again.');
  }
  return data.records;
}

/**
 * Load and check an optional file. Failure is returned, not thrown.
 * @template T
 * @param {string} path
 * @param {(data: any) => T} parse
 * @returns {Promise<T | Error>}
 */
async function loadOptional(path, parse) {
  try {
    return parse(await loadJson(path));
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Load everything the page needs.
 * @returns {Promise<BriefingData>}
 * @throws {Error} When a required file cannot be loaded.
 */
export async function loadBriefingData() {
  const [routeData, weatherData, places, calibration, spaceWeather] = await Promise.all([
    loadJson(ROUTE_FILE),
    loadJson(WEATHER_FILE),
    loadOptional(LANDMARKS_FILE, parseLandmarks),
    loadOptional(DEM_CALIBRATION_FILE, parseDemCalibration),
    loadOptional(SPACE_WEATHER_FILE, parseSpaceWeather),
  ]);
  return { route: parseRoute(routeData), records: parseWeather(weatherData), places, calibration, spaceWeather };
}
