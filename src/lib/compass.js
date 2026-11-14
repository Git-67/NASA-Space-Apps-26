// @ts-check
/**
 * Which way the device is facing, from its compass, where it has one.
 *
 * Phones and tablets report an absolute heading through the Device
 * Orientation API: iOS as `webkitCompassHeading` (after the visitor allows
 * it), others as `alpha` on the `deviceorientationabsolute` event. Laptops
 * have no compass, so callers fall back to the direction of travel.
 */

/**
 * Start listening to the compass.
 * Call from a click or tap: iOS only asks for permission during one.
 * @param {(headingDeg: number) => void} onHeading Called with compass degrees, 0 north, clockwise.
 * @returns {Promise<(() => void) | null>} A function that stops listening, or null if there is no usable compass.
 */
export async function startCompass(onHeading) {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return null;
  const Orientation = /** @type {{ requestPermission?: () => Promise<string> }} */ (/** @type {unknown} */ (window.DeviceOrientationEvent));
  if (typeof Orientation.requestPermission === 'function') {
    try {
      if ((await Orientation.requestPermission()) !== 'granted') return null;
    } catch {
      return null;
    }
  }
  /** @param {Event} event */
  const handle = (event) => {
    const orientation = /** @type {DeviceOrientationEvent & { webkitCompassHeading?: number }} */ (event);
    if (typeof orientation.webkitCompassHeading === 'number') onHeading(orientation.webkitCompassHeading);
    else if (orientation.absolute && typeof orientation.alpha === 'number') onHeading((360 - orientation.alpha) % 360);
  };
  const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(eventName, handle);
  return () => window.removeEventListener(eventName, handle);
}
