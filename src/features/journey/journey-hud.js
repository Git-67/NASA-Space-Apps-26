// @ts-check
/**
 * What the walker sees during "Begin journey", over a full-screen map:
 * a large End button and a north arrow (top left), space weather (top right),
 * the next stop and walk controls (bottom), and the pop-ups
 * (journey-dialogs.js). Large targets and high-contrast panels, for gloved
 * hands and dusty visors. Presentation only; the timing lives in journey-mode.js.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { createJourneyDialogs } from './journey-dialogs.js';
import { createVisorView } from './visor-view.js';
import { isSoundMuted, setSoundMuted } from '../../lib/sound.js';

/**
 * @typedef {object} WeatherSummary
 * @property {'go' | 'caution' | 'no-go' | 'unknown'} level
 * @property {string} text One line, from the verdict's space weather rule.
 * @property {'live' | 'stored' | 'drill'} source Read live from NASA, the copy stored with the site, or a simulated alert.
 * @property {string} asOf When the data was read, how recent it is, or when a drill ends.
 */

const LEVEL_SYMBOL = { go: '✓', caution: '!', 'no-go': '✕', unknown: '?' };
const LEVEL_LABEL = { go: 'Clear', caution: 'Caution', 'no-go': 'Take shelter', unknown: 'Unknown' };
const SOURCE_BADGE = { live: 'LIVE · SPACE WEATHER', stored: 'STORED · SPACE WEATHER', drill: 'SIMULATED ALERT' };

/** DESIGN.md buttons, in the large size journey mode uses (`button-large`). */
const SECONDARY = 'button-secondary button-large';

/**
 * Build the overlay (hidden until a journey starts) and add it to the page.
 * @param {{ onEnd: () => void, onTogglePlay: () => void, onSpeed: () => void, onRecentre: () => void, onDrill: () => void, onVisor: () => void }} handlers
 */
export function createJourneyHud(handlers) {
  const endButton = el('button', { className: `${SECONDARY} journey-end`, attrs: { type: 'button' } }, [icon('close'), 'End journey']);
  endButton.addEventListener('click', handlers.onEnd);
  const northArrow = el('span', { className: 'journey-north-arrow' }, [icon('arrow_upward')]);
  const north = el('p', { className: 'journey-north', attrs: { role: 'img', 'aria-label': 'North arrow: the map turns so you face up the screen' } }, [northArrow, 'N']);
  // Only the alert itself is announced; the time line changes every simulated minute.
  const weatherBody = el('div', { className: 'journey-weather-body', attrs: { 'aria-live': 'polite' } });
  const weatherTime = el('p', { className: 'journey-weather-time' });
  const weather = el('section', { className: 'journey-weather', attrs: { 'aria-label': 'Space weather' } }, [weatherBody, weatherTime]);
  let weatherKey = '';
  const playButton = el('button', { className: SECONDARY, attrs: { type: 'button' } });
  playButton.addEventListener('click', handlers.onTogglePlay);
  const speedButton = el('button', { className: SECONDARY, attrs: { type: 'button' } });
  speedButton.addEventListener('click', handlers.onSpeed);
  const drillButton = el('button', { className: SECONDARY, attrs: { type: 'button' } }, [icon('flare'), 'Simulate alert']);
  drillButton.addEventListener('click', handlers.onDrill);
  // Small round toggles on the right edge: the simulated visor (for a demo) and sound.
  const visorButton = el('button', {
    className: 'journey-side-toggle',
    attrs: { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Visor view (simulated)', title: 'Visor view (simulated)' },
  }, [icon('visibility')]);
  visorButton.addEventListener('click', handlers.onVisor);
  const soundButton = el('button', { className: 'journey-side-toggle', attrs: { type: 'button' } });
  const showSound = () => {
    const isMuted = isSoundMuted();
    soundButton.replaceChildren(icon(isMuted ? 'volume_off' : 'volume_up'));
    soundButton.setAttribute('aria-pressed', String(!isMuted));
    soundButton.setAttribute('aria-label', 'Sound');
    soundButton.setAttribute('title', isMuted ? 'Sound off' : 'Sound on');
  };
  soundButton.addEventListener('click', () => { setSoundMuted(!isSoundMuted()); showSound(); });
  showSound();
  const recentreButton = el('button', { className: SECONDARY, attrs: { type: 'button' } }, [icon('my_location'), 'Re-centre']);
  recentreButton.addEventListener('click', handlers.onRecentre);
  recentreButton.hidden = true;
  const next = el('p', { className: 'journey-next', attrs: { 'aria-live': 'polite' } });
  const facing = el('p', { className: 'journey-facing' });
  // A hazard just ahead (steep ground, sand), in words with a warning icon; empty otherwise.
  const hazardText = el('span');
  const hazard = el('p', { className: 'journey-hazard', attrs: { role: 'status' } }, [icon('warning'), hazardText]);
  hazard.hidden = true;
  const dialogs = createJourneyDialogs();

  const top = el('div', { className: 'journey-top' }, [el('div', { className: 'journey-top-left' }, [endButton, north]), weather]);
  const bottom = el('div', { className: 'journey-bottom' }, [
    el('p', { className: 'journey-sim', text: 'Simulation · not a real position' }),
    hazard,
    next,
    facing,
    el('div', { className: 'journey-controls' }, [playButton, speedButton, drillButton, recentreButton]),
  ]);
  const root = el('div', { className: 'journey-hud' }, [top, bottom]);
  const visor = createVisorView(root, { onTogglePlay: handlers.onTogglePlay, onDrill: handlers.onDrill });
  root.append(el('div', { className: 'journey-side' }, [visorButton, soundButton]));
  // The pop-ups come last, so they sit above the visor as well as the panels.
  root.append(dialogs.element);
  root.hidden = true;
  document.body.append(root);

  return {
    dialogs,
    visor,
    /** @param {boolean} isVisor Show the visor in place of the panels, with the map shrunk to its minimap. */
    setVisor(isVisor) {
      document.body.classList.toggle('is-visor', isVisor);
      visor.setShown(isVisor);
      visorButton.setAttribute('aria-pressed', String(isVisor));
      this.placeMinimap();
    },
    /** Put the map into the visor's minimap circle (journey.css reads these), after the screen changes size too. */
    placeMinimap() {
      const { left, top, size } = visor.minimapRect();
      document.body.style.setProperty('--minimap-left', `${left.toFixed(1)}px`);
      document.body.style.setProperty('--minimap-top', `${top.toFixed(1)}px`);
      document.body.style.setProperty('--minimap-size', `${size.toFixed(1)}px`);
    },
    /** @param {boolean} isShown */
    setShown(isShown) {
      root.hidden = !isShown;
      if (isShown) endButton.focus();
      else dialogs.close();
    },
    /** @param {boolean} isPlaying @param {number} speed Times faster than real walking. */
    setControls(isPlaying, speed) {
      playButton.replaceChildren(icon(isPlaying ? 'pause' : 'play_arrow'), isPlaying ? 'Pause' : 'Walk');
      speedButton.replaceChildren(icon('fast_forward'), `${speed}× speed`);
      speedButton.setAttribute('aria-label', `Simulation speed ${speed} times real time. Change speed.`);
    },
    /**
     * @param {{ nextName: string | null, metresToGo: number, minutesToGo: number,
     *   facingFrom: 'compass' | 'travel', enlargement: number }} status enlargement: times the imagery is enlarged.
     */
    setStatus({ nextName, metresToGo, minutesToGo, facingFrom, enlargement }) {
      next.textContent = nextName === null ? 'Walk complete.' : `Next: ${nextName} · ${Math.round(metresToGo)} m · ${Math.ceil(minutesToGo)} min`;
      const facingText = facingFrom === 'compass' ? 'Map turns with this device\'s compass' : 'Map turns to your direction of travel';
      // Said here because the map's own notice is hidden in journey mode (DESIGN.md, map-notice).
      facing.textContent = enlargement > 1 ? `${facingText} · imagery enlarged ${enlargement}×` : facingText;
    },
    /**
     * Warn of a hazard just ahead, in both views, or clear the warning.
     * @param {string | null} text What and how far, such as "Steep ground (hard) in 18 m"; null for none.
     */
    setHazard(text) {
      hazard.hidden = text === null;
      hazardText.textContent = text ?? '';
      visor.setHazard(text);
    },
    /** @param {number} mapAngleDeg The map's screen angle, degrees clockwise; north points this way. */
    setNorth(mapAngleDeg) {
      northArrow.style.rotate = `${mapAngleDeg.toFixed(0)}deg`;
    },
    /** @param {WeatherSummary} summary */
    setWeather(summary) {
      weatherTime.textContent = summary.asOf;
      const key = `${summary.source}|${summary.level}|${summary.text}`;
      if (key === weatherKey) return;
      weatherKey = key;
      weather.dataset.level = summary.level;
      weather.dataset.source = summary.source;
      weatherBody.replaceChildren(
        el('p', { className: 'badge-live', text: SOURCE_BADGE[summary.source] }),
        el('p', { className: 'journey-weather-level' }, [
          el('span', { className: 'reason-symbol', text: LEVEL_SYMBOL[summary.level], attrs: { 'aria-hidden': 'true' } }),
          LEVEL_LABEL[summary.level],
        ]),
        el('p', { className: 'journey-weather-text', text: summary.text }),
      );
    },
    /** @param {boolean} isFollowing Whether the map follows the walker; if not, offer "Re-centre". */
    setFollowing(isFollowing) {
      recentreButton.hidden = isFollowing;
    },
    /**
     * How much of the screen the panels cover, so the walker is kept in the clear area between them.
     * @returns {{ top: number, bottom: number }} Pixels from the top and bottom edges.
     */
    insets() {
      // With the visor on, the map is the minimap and nothing covers it: the walker sits at its centre.
      if (visor.isShown()) return { top: 0, bottom: 0 };
      return { top: top.getBoundingClientRect().bottom, bottom: window.innerHeight - bottom.getBoundingClientRect().top };
    },
  };
}
