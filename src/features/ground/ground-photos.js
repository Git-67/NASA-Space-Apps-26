// @ts-check
/**
 * ground-photos (DESIGN.md, ground-view): one ground photo at a time, with
 * buttons to turn left and right through the directions Curiosity
 * photographed from a stop. Used in the ground view dialog, and on arrival at
 * a stop during a journey.
 *
 * Photos: Curiosity's left navigation camera, NASA/JPL-Caltech raw images,
 * stored smaller with the site so they work offline. The direction shown is
 * derived and approximate (ground-model.js).
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { compassName, turnFrame } from './ground-model.js';

/** @typedef {import('./ground-model.js').GroundView} GroundView */

/**
 * Format an ISO time as a plain Earth date, for example "6 Nov 2025".
 * @param {string} isoUtc
 * @returns {string} The date, or an empty string when the time cannot be read.
 */
function earthDate(isoUtc) {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Create a photo pane.
 * @param {{ isCompact?: boolean }} [options] `isCompact`: a shorter photo and a one-line credit, for use inside another dialog.
 * @returns {{ element: HTMLElement, show: (stopName: string, view: GroundView) => void, turn: (step: number) => void }}
 *   `show` fills the pane with a stop's photos; `turn` steps left (-1) or right (+1).
 */
export function createGroundPhotos({ isCompact = false } = {}) {
  const photo = /** @type {HTMLImageElement} */ (el('img', { className: 'ground-photo', attrs: { alt: '' } }));
  const failed = el('p', { className: 'chart-state ground-failed', text: 'This photo could not be loaded.' });
  const direction = el('p', { className: 'ground-direction', attrs: { 'aria-live': 'polite' } });
  const position = el('span', { className: 'ground-position' });
  const leftButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } }, [icon('arrow_back'), 'Turn left']);
  const rightButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } }, ['Turn right', icon('arrow_forward')]);
  const taken = el('p', { className: 'telemetry' });
  const credit = el('p', { className: 'data-source-caption' });
  const element = el('div', { className: `ground-photos${isCompact ? ' is-compact' : ''}` }, [
    el('div', { className: 'ground-frame' }, [photo, failed, direction]),
    el('div', { className: 'ground-controls' }, [leftButton, position, rightButton]),
    taken,
    credit,
  ]);

  /** @type {GroundView | null} */
  let view = null;
  let index = 0;
  let stopName = '';

  /** Show the current photo and everything said about it. */
  const draw = () => {
    if (!view) return;
    const frame = view.frames[index];
    const compass = compassName(frame.bearingDeg);
    failed.hidden = true;
    photo.hidden = false;
    photo.src = frame.file;
    photo.alt = `Curiosity's ${view.camera.toLowerCase()} view from ${stopName}, looking about ${compass}.`;
    direction.textContent = `Looking about ${compass} (${Math.round(frame.bearingDeg)}°)`;
    position.textContent = `${index + 1} of ${view.frames.length}`;
    const time = frame.localMarsTime ? ` · ${frame.localMarsTime} local Mars time` : '';
    const date = earthDate(frame.takenUtc);
    taken.textContent = `Sol ${frame.sol}${time}${date ? ` · ${date} on Earth` : ''}`;
    const original = el('a', { className: 'button-link', text: 'Original at NASA', attrs: { href: frame.originalUrl, target: '_blank', rel: 'noopener' } });
    credit.replaceChildren(
      isCompact
        ? `Curiosity, ${view.camera.toLowerCase()}. ${frame.credit}. Raw image. Direction approximate, worked out by us. `
        : `Curiosity, ${view.camera.toLowerCase()}. ${frame.credit}. A raw image: unprocessed, black and white, made smaller here. `,
      original,
      '.',
    );
    // Fetch the photos either side now, so turning does not wait for them.
    for (const step of [-1, 1]) new Image().src = view.frames[turnFrame(index, step, view.frames.length)].file;
  };
  /** @param {number} step */
  const turn = (step) => {
    if (!view) return;
    index = turnFrame(index, step, view.frames.length);
    draw();
  };

  photo.addEventListener('error', () => { photo.hidden = true; failed.hidden = false; });
  leftButton.addEventListener('click', () => turn(-1));
  rightButton.addEventListener('click', () => turn(1));

  return {
    element,
    turn,
    show(name, groundView) {
      view = groundView;
      stopName = name;
      // Open on the photo that looks lowest: it shows the most ground, which is what a walker wants first.
      index = groundView.frames.reduce((lowest, frame, i) => (frame.elevationDeg < groundView.frames[lowest].elevationDeg ? i : lowest), 0);
      const hasSeveral = groundView.frames.length > 1;
      leftButton.hidden = !hasSeveral;
      rightButton.hidden = !hasSeveral;
      draw();
    },
  };
}
