// @ts-check
/**
 * ground-view (DESIGN.md): what Curiosity saw from a stop, in a dialog opened
 * from a stop's camera badge on the map. The photos themselves, and the
 * buttons to turn, are in ground-photos.js.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { createGroundPhotos } from './ground-photos.js';

/** @typedef {import('./ground-model.js').GroundView} GroundView */

const TITLE_ID = 'ground-view-title';

/**
 * Create the viewer. The dialog is added to the page once and reused.
 * @returns {{ open: (stopName: string, view: GroundView) => void }}
 */
export function createGroundViewer() {
  const title = el('h2', { className: 'ground-title', attrs: { id: TITLE_ID } });
  const closeButton = el('button', { className: 'button-icon', attrs: { type: 'button', 'aria-label': 'Close the ground view' } }, [icon('close')]);
  const photos = createGroundPhotos();
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'ground-dialog', attrs: { 'aria-labelledby': TITLE_ID } }, [
    el('header', { className: 'ground-header' }, [
      el('div', {}, [el('p', { className: 'eyebrow', text: 'Ground view' }), title]),
      closeButton,
    ]),
    photos.element,
    el('p', { className: 'basis', text: 'What Curiosity saw from this spot. Directions are approximate: worked out by us from the rover\'s heading and its camera\'s angle.' }),
  ]));
  document.body.append(dialog);

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') photos.turn(-1);
    if (event.key === 'ArrowRight') photos.turn(1);
  });
  // A click on the dimmed page behind the dialog closes it, as people expect of a photo viewer.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  return {
    open(name, groundView) {
      title.textContent = name;
      photos.show(name, groundView);
      if (!dialog.open) dialog.showModal();
    },
  };
}
