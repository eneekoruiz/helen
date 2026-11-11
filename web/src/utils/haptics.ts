'use client';

/**
 * Native-Feel Haptic Feedback Engine wrapper around the HTML5 vibration API.
 */

export function hapticLight() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(10);
    } catch (e) {
      // Ignore vibration exceptions (some browsers restrict without interaction)
    }
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([10, 30, 10]);
    } catch (e) {
      // Ignore
    }
  }
}

export function hapticError() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([50, 50, 50]);
    } catch (e) {
      // Ignore
    }
  }
}
