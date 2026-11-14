// @ts-check
/**
 * Visor view: a curved helmet visor drawn over the journey map, showing only
 * the critical information. A browser SIMULATION of what a helmet display
 * could show, toggled for demonstration; there is no helmet or headset. The
 * map stays visible all round: the visor is a rim and its readouts, and the
 * walker sits low in it so most of the visor shows the ground ahead.
 *
 * Shape: a wide visor, rounder on top and flatter at the chin, like the
 * curved polycarbonate visors of NASA's suits (NASA TechPort project 94571
 * developed such a visor that darkens itself; that project is about tint,
 * not about a display).
 *
 * On the visor, following its curve:
 * - top: a compass tape with the heading, and a diamond where the next stop lies;
 * - left: the next stop, its distance and walking time;
 * - right: the space weather level, its source, and a drill's countdown;
 * - chin: two gauges along the bottom of the visor against NASA's limits (time
 *   out of 8 h, distance from base of 2 km; both lunar figures), and a
 *   "simulation" label;
 * - the visor's rim glows amber for caution and pink for no-go.
 * Drawn in a fixed 1200 × 750 box, scaled to fit the screen.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { formatDuration } from '../../lib/mars.js';
import { gauge, relativeBearing, tapeTicks } from './visor-model.js';

/** @typedef {import('./journey-hud.js').WeatherSummary} WeatherSummary */
/**
 * @typedef {object} VisorStatus
 * @property {string | null} nextName Null when the walk is complete.
 * @property {number} metresToGo
 * @property {number} minutesToGo
 * @property {WeatherSummary} weather
 * @property {number} outMinutes Simulated time since the walk began.
 * @property {number} outLimitMinutes NASA's longest walk (EVA).
 * @property {number} baseM Straight-line distance back to the start, in metres.
 * @property {number} baseLimitM NASA's farthest straight-line distance from base.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 1200;
const HEIGHT = 750;
const CENTRE_X = WIDTH / 2;
/** The visor: an upper half-ellipse (taller) and a lower one (flatter), meeting at VISOR_MID_Y. */
const VISOR_MID_Y = 400;
const VISOR_RX = 560;
const VISOR_TOP_RY = 360;
const VISOR_CHIN_RY = 260;
const VISOR_PATH = `M ${CENTRE_X - VISOR_RX} ${VISOR_MID_Y} A ${VISOR_RX} ${VISOR_TOP_RY} 0 0 1 ${CENTRE_X + VISOR_RX} ${VISOR_MID_Y}`
  + ` A ${VISOR_RX} ${VISOR_CHIN_RY} 0 0 1 ${CENTRE_X - VISOR_RX} ${VISOR_MID_Y} Z`;
/** Compass tape: an arc of a circle centred below the visor, so it bows with the visor's top. */
const TAPE_CENTRE_Y = 900;
const TAPE_RADIUS = 800;
/** The tape shows this many degrees either side of the heading... */
const TAPE_HALF_SPAN_DEG = 45;
/** ...spread over this much of the arc either side. */
const TAPE_HALF_ARC_DEG = 25;
const TAPE_STEP_DEG = 5;
const TAPE_TICK_COUNT = (2 * TAPE_HALF_SPAN_DEG) / TAPE_STEP_DEG + 1;
/** Gauges, their labels and the bottom label follow the chin: ellipses inside it, as [rx, ry]. */
const GAUGE_ELLIPSE = [VISOR_RX - 40, VISOR_CHIN_RY - 34];
const LABEL_ELLIPSE = [VISOR_RX - 78, VISOR_CHIN_RY - 70];
const SIM_LABEL_ELLIPSE = [VISOR_RX - 120, VISOR_CHIN_RY - 72];
/** Space between text and the visor's edge, in box units: room for the side toggle on the right. */
const EDGE_MARGIN = 110;
/** Where the walker sits in the box: low in the visor, so most of it shows the ground ahead. */
const WALKER_Y = 470;

/**
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @param {(Node | string)[]} [children]
 * @returns {SVGElement}
 */
function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  node.append(...children);
  return /** @type {SVGElement} */ (node);
}

/**
 * A point on a circle. Angles are clockwise from the +x axis, as SVG draws them.
 * @param {number} centreY
 * @param {number} radius
 * @param {number} angleDeg
 */
function onCircle(centreY, radius, angleDeg) {
  const radians = (angleDeg * Math.PI) / 180;
  return { x: CENTRE_X + radius * Math.cos(radians), y: centreY + radius * Math.sin(radians) };
}

/**
 * An arc of an ellipse centred on the visor's middle, drawn in the direction from one angle to the other.
 * @param {number[]} radii [rx, ry]
 * @param {number} fromDeg Angle clockwise from the +x axis (90 is the bottom).
 * @param {number} toDeg
 * @returns {string} SVG path data.
 */
function chinArc([rx, ry], fromDeg, toDeg) {
  const point = (/** @type {number} */ angleDeg) => {
    const radians = (angleDeg * Math.PI) / 180;
    return `${(CENTRE_X + rx * Math.cos(radians)).toFixed(1)} ${(VISOR_MID_Y + ry * Math.sin(radians)).toFixed(1)}`;
  };
  return `M ${point(fromDeg)} A ${rx} ${ry} 0 0 ${toDeg > fromDeg ? 1 : 0} ${point(toDeg)}`;
}

/**
 * An arc of a circle centred at (CENTRE_X, centreY), drawn left to right along the bottom or the top.
 * @param {number} centreY
 * @param {number} radius
 * @param {number} fromDeg
 * @param {number} toDeg
 * @returns {string} SVG path data.
 */
function arc(centreY, radius, fromDeg, toDeg) {
  const from = onCircle(centreY, radius, fromDeg);
  const to = onCircle(centreY, radius, toDeg);
  const sweep = toDeg > fromDeg ? 1 : 0;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} A ${radius} ${radius} 0 0 ${sweep} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

/**
 * Where the visor's left edge is at a height, so text can follow its curve.
 * @param {number} y
 * @returns {number} x of the left edge; the right edge is WIDTH minus this.
 */
function visorLeftEdge(y) {
  const ry = y < VISOR_MID_Y ? VISOR_TOP_RY : VISOR_CHIN_RY;
  const share = Math.min(1, Math.abs(y - VISOR_MID_Y) / ry);
  return CENTRE_X - VISOR_RX * Math.sqrt(1 - share * share);
}

/**
 * A text line set in from the visor's edge.
 * @param {'left' | 'right'} side
 * @param {number} y
 * @param {string} className
 */
function edgeText(side, y, className) {
  const inset = visorLeftEdge(y) + EDGE_MARGIN;
  return svg('text', { x: side === 'left' ? inset : WIDTH - inset, y, class: className, 'text-anchor': side === 'left' ? 'start' : 'end' });
}

/**
 * A gauge along the chin, with its label on an arc just inside it.
 * @param {string} id
 * @param {number} fromDeg
 * @param {number} toDeg
 */
function chinGauge(id, fromDeg, toDeg) {
  // Gauges fill left to right whichever side they are on, so the arc is drawn left to right.
  const [left, right] = fromDeg > toDeg ? [fromDeg, toDeg] : [toDeg, fromDeg];
  const track = chinArc(GAUGE_ELLIPSE, left, right);
  const fill = svg('path', { d: track, class: 'visor-gauge-fill', pathLength: 1 });
  const textPath = svg('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' });
  const group = svg('g', { class: 'visor-gauge' }, [
    svg('path', { d: track, class: 'visor-gauge-track' }),
    fill,
    svg('path', { id, d: chinArc(LABEL_ELLIPSE, left, right), class: 'visor-guide' }),
    svg('text', { class: 'visor-gauge-label' }, [textPath]),
  ]);
  return { group, fill, textPath };
}

/**
 * Build the visor (hidden until shown) inside a container.
 * @param {HTMLElement} container
 * @param {{ onTogglePlay: () => void, onDrill: () => void }} handlers
 */
export function createVisorView(container, handlers) {
  // Compass tape: a pool of ticks, moved every frame rather than rebuilt.
  const ticks = Array.from({ length: TAPE_TICK_COUNT }, () => {
    const line = svg('line', { x1: CENTRE_X, x2: CENTRE_X, class: 'visor-tick' });
    const label = svg('text', { x: CENTRE_X, y: TAPE_CENTRE_Y - TAPE_RADIUS + 52, class: 'visor-tick-label', 'text-anchor': 'middle' });
    const group = svg('g', {}, [line, label]);
    return { group, line, label };
  });
  const nextMarker = svg('path', { d: `M ${CENTRE_X} ${TAPE_CENTRE_Y - TAPE_RADIUS - 14} l 12 14 l -12 14 l -12 -14 Z`, class: 'visor-next-marker' });
  const headingText = svg('text', { x: CENTRE_X, y: 210, class: 'visor-heading', 'text-anchor': 'middle' });

  const nextLabel = edgeText('left', 280, 'visor-label');
  nextLabel.textContent = 'NEXT STOP';
  const nextName = edgeText('left', 322, 'visor-value-sm');
  const nextDistance = edgeText('left', 378, 'visor-value');
  const nextTime = edgeText('left', 416, 'visor-value-sm');

  const weatherLabel = edgeText('right', 280, 'visor-label');
  const weatherLevel = edgeText('right', 332, 'visor-value');
  const weatherText = edgeText('right', 372, 'visor-text');
  const weatherTime = edgeText('right', 406, 'visor-text');

  const alertText = svg('text', { x: CENTRE_X, y: 290, class: 'visor-alert-text', 'text-anchor': 'middle' });
  const outGauge = chinGauge('visor-out-guide', 162, 112);
  const baseGauge = chinGauge('visor-base-guide', 18, 68);
  const simulationPath = svg('path', { id: 'visor-sim-guide', d: chinArc(SIM_LABEL_ELLIPSE, 108, 72), class: 'visor-guide' });
  const simulationText = svg('textPath', { href: '#visor-sim-guide', startOffset: '50%', 'text-anchor': 'middle' }, ['SIMULATED VISOR']);

  const rim = svg('path', { d: VISOR_PATH, class: 'visor-rim' });
  const drawing = svg('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'visor-drawing', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet',
  }, [
    svg('defs', {}, [
      svg('radialGradient', { id: 'visor-shade', cx: '50%', cy: '52%', r: '58%' }, [
        svg('stop', { offset: '0.72', class: 'visor-shade-clear' }),
        svg('stop', { offset: '1', class: 'visor-shade-edge' }),
      ]),
    ]),
    svg('path', { d: VISOR_PATH, fill: 'url(#visor-shade)' }),
    svg('path', { d: arc(VISOR_MID_Y + 100, 450, 205, 232), class: 'visor-glare' }),
    rim,
    svg('path', { d: arc(TAPE_CENTRE_Y, TAPE_RADIUS, -90 - TAPE_HALF_ARC_DEG, -90 + TAPE_HALF_ARC_DEG), class: 'visor-tape' }),
    ...ticks.map((tick) => tick.group),
    svg('path', { d: `M ${CENTRE_X - 12} ${TAPE_CENTRE_Y - TAPE_RADIUS - 30} h 24 l -12 16 Z`, class: 'visor-caret' }),
    nextMarker,
    headingText,
    nextLabel, nextName, nextDistance, nextTime,
    weatherLabel, weatherLevel, weatherText, weatherTime,
    alertText,
    outGauge.group, baseGauge.group,
    simulationPath, svg('text', { class: 'visor-sim' }, [simulationText]),
  ]);

  const playButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } });
  playButton.addEventListener('click', handlers.onTogglePlay);
  const drillButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } }, [icon('flare'), 'Simulate alert']);
  drillButton.addEventListener('click', handlers.onDrill);
  // Screen readers get the same facts in words, announced only when the stop or the level changes.
  const summary = el('p', { className: 'visually-hidden', attrs: { 'aria-live': 'polite' } });
  const root = el('section', { className: 'visor', attrs: { 'aria-label': 'Visor view (simulated)' } }, [
    drawing,
    summary,
    el('div', { className: 'visor-controls is-left' }, [playButton]),
    el('div', { className: 'visor-controls is-right' }, [drillButton]),
  ]);
  root.hidden = true;
  container.append(root);
  let summaryText = '';

  return {
    /** @param {boolean} isShown */
    setShown(isShown) {
      root.hidden = !isShown;
    },
    isShown: () => !root.hidden,
    /**
     * Where the walker should sit on screen: low in the visor, wherever the scaled box lands.
     * @returns {number} Pixels from the top of the window.
     */
    walkerY() {
      const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
      return (window.innerHeight - HEIGHT * scale) / 2 + WALKER_Y * scale;
    },
    /** @param {boolean} isPlaying */
    setPlaying(isPlaying) {
      playButton.replaceChildren(icon(isPlaying ? 'pause' : 'play_arrow'), isPlaying ? 'Pause' : 'Walk');
    },
    /**
     * Turn the compass tape. Called every frame.
     * @param {number} headingDeg Where the wearer faces.
     * @param {number | null} nextBearingDeg Bearing to the next stop, or null when there is none.
     */
    setHeading(headingDeg, nextBearingDeg) {
      const visible = tapeTicks(headingDeg, TAPE_HALF_SPAN_DEG, TAPE_STEP_DEG);
      const arcPerDeg = TAPE_HALF_ARC_DEG / TAPE_HALF_SPAN_DEG;
      ticks.forEach((tick, index) => {
        const data = visible[index];
        tick.group.style.display = data ? '' : 'none';
        if (!data) return;
        const isMajor = data.label !== null;
        tick.group.setAttribute('transform', `rotate(${(data.offsetDeg * arcPerDeg).toFixed(2)} ${CENTRE_X} ${TAPE_CENTRE_Y})`);
        tick.line.setAttribute('y1', String(TAPE_CENTRE_Y - TAPE_RADIUS));
        tick.line.setAttribute('y2', String(TAPE_CENTRE_Y - TAPE_RADIUS + (isMajor ? 22 : 12)));
        tick.label.textContent = data.label ?? '';
      });
      headingText.textContent = `${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`;
      nextMarker.style.display = nextBearingDeg === null ? 'none' : '';
      if (nextBearingDeg === null) return;
      const offset = relativeBearing(headingDeg, nextBearingDeg);
      const isOffTape = Math.abs(offset) > TAPE_HALF_SPAN_DEG;
      const shown = Math.max(-TAPE_HALF_SPAN_DEG, Math.min(TAPE_HALF_SPAN_DEG, offset));
      nextMarker.classList.toggle('is-off-tape', isOffTape);
      nextMarker.setAttribute('transform', `rotate(${(shown * arcPerDeg).toFixed(2)} ${CENTRE_X} ${TAPE_CENTRE_Y})`);
    },
    /** @param {VisorStatus} status */
    setStatus(status) {
      nextName.textContent = status.nextName ?? 'Walk complete';
      nextDistance.textContent = status.nextName === null ? '' : `${Math.round(status.metresToGo)} m`;
      nextTime.textContent = status.nextName === null ? '' : `${Math.ceil(status.minutesToGo)} min walk`;

      const { weather } = status;
      const source = { live: 'LIVE', stored: 'STORED', drill: 'DRILL' }[weather.source];
      weatherLabel.textContent = `SPACE WEATHER · ${source}`;
      weatherLevel.textContent = { go: '✓ CLEAR', caution: '! CAUTION', 'no-go': '✕ TAKE SHELTER', unknown: '? UNKNOWN' }[weather.level];
      weatherLevel.setAttribute('class', `visor-value is-${weather.level}`);
      // One short line fits on the visor: the first sentence.
      weatherText.textContent = weather.text.split('. ')[0].replace(/\.$/, '');
      weatherTime.textContent = weather.source === 'drill' ? weather.asOf.replace(' (simulated time)', '') : '';
      rim.setAttribute('class', `visor-rim is-${weather.level}`);
      alertText.textContent = weather.level === 'no-go' ? 'TAKE SHELTER' : '';

      const out = gauge(status.outMinutes, status.outLimitMinutes);
      outGauge.fill.style.strokeDasharray = `${out.share.toFixed(3)} 1`;
      outGauge.group.setAttribute('class', `visor-gauge is-${out.level}`);
      outGauge.textPath.textContent = `OUT ${formatDuration(status.outMinutes)} / ${status.outLimitMinutes / 60} h`;
      const base = gauge(status.baseM, status.baseLimitM);
      baseGauge.fill.style.strokeDasharray = `${base.share.toFixed(3)} 1`;
      baseGauge.group.setAttribute('class', `visor-gauge is-${base.level}`);
      baseGauge.textPath.textContent = `BASE ${Math.round(status.baseM)} m / ${status.baseLimitM / 1000} km`;

      const nextSummary = `${status.nextName ? `Next stop: ${status.nextName}.` : 'Walk complete.'} Space weather: ${weather.level}.`;
      if (nextSummary !== summaryText) { summaryText = nextSummary; summary.textContent = nextSummary; }
    },
  };
}
