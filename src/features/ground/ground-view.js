// @ts-check
/**
 * ground-view (DESIGN.md): what Curiosity saw from a stop. A dialog with one
 * photo at a time and two buttons to turn left and right through the
 * directions the rover photographed.
 *
 * Photos: Curiosity's left navigation camera, NASA/JPL-Caltech raw images,
 * stored smaller with the site so they work offline. Each links to NASA's
 * original. The direction shown is derived and approximate (ground-model.js).
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { compassName, turnFrame } from './ground-model.js';

/** @typedef {import('./ground-model.js').GroundView} GroundView */

const TITLE_ID = 'ground-view-title';

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
 * Create the viewer. The dialog is added to the page once and reused.
 * @returns {{ open: (stopName: string, view: GroundView) => void }}
 */
export function createGroundViewer() {
  const title = el('h2', { className: 'ground-title', attrs: { id: TITLE_ID } });
  const closeButton = el('button', { className: 'button-icon', attrs: { type: 'button', 'aria-label': 'Close the ground view' } }, [icon('close')]);
  const photo = /** @type {HTMLImageElement} */ (el('img', { className: 'ground-photo', attrs: { alt: '' } }));
  const failed = el('p', { className: 'chart-state ground-failed', text: 'This photo could not be loaded.' });
  const direction = el('p', { className: 'ground-direction', attrs: { 'aria-live': 'polite' } });
  const position = el('span', { className: 'ground-position' });
  const leftButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } }, [icon('arrow_back'), 'Turn left']);
  const rightButton = el('button', { className: 'button-secondary button-large', attrs: { type: 'button' } }, ['Turn right', icon('arrow_forward')]);
  const taken = el('p', { className: 'telemetry' });
  const credit = el('p', { className: 'data-source-caption' });
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'ground-dialog', attrs: { 'aria-labelledby': TITLE_ID } }, [
    el('header', { className: 'ground-header' }, [
      el('div', {}, [el('p', { className: 'eyebrow', text: 'Ground view' }), title]),
      closeButton,
    ]),
    el('div', { className: 'ground-frame' }, [photo, failed, direction]),
    el('div', { className: 'ground-controls' }, [leftButton, position, rightButton]),
    taken,
    credit,
    el('p', { className: 'basis', text: 'What Curiosity saw from this spot. Directions are approximate: worked out by us from the rover\'s heading and its camera\'s angle.' }),
  ]));
  document.body.append(dialog);

  /** @type {GroundView | null} */
  let view = null;
  let index = 0;
  let stopName = '';

  /** Show the current photo and everything said about it. */
  const show = () => {
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
    credit.replaceChildren(
      `Curiosity, ${view.camera.toLowerCase()}. ${frame.credit}. A raw image: unprocessed, black and white, made smaller here. `,
      el('a', { className: 'button-link', text: 'Original at NASA', attrs: { href: frame.originalUrl, target: '_blank', rel: 'noopener' } }),
      '.',
    );
    // Fetch the photos either side now, so turning does not wait for them.
    for (const step of [-1, 1]) new Image().src = view.frames[turnFrame(index, step, view.frames.length)].file;
  };
  /** @param {number} step */
  const turn = (step) => {
    if (!view) return;
    index = turnFrame(index, step, view.frames.length);
    show();
  };

  photo.addEventListener('error', () => { photo.hidden = true; failed.hidden = false; });
  leftButton.addEventListener('click', () => turn(-1));
  rightButton.addEventListener('click', () => turn(1));
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') turn(-1);
    if (event.key === 'ArrowRight') turn(1);
  });
  // A click on the dimmed page behind the dialog closes it, as people expect of a photo viewer.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  return {
    open(name, groundView) {
      view = groundView;
      stopName = name;
      // Open on the photo that looks lowest: it shows the most ground, which is what a walker wants first.
      index = groundView.frames.reduce((lowest, frame, i) => (frame.elevationDeg < groundView.frames[lowest].elevationDeg ? i : lowest), 0);
      title.textContent = name;
      const hasSeveral = groundView.frames.length > 1;
      leftButton.hidden = !hasSeveral;
      rightButton.hidden = !hasSeveral;
      show();
      if (!dialog.open) dialog.showModal();
    },
  };
}
