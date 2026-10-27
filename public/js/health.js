/* ============================================================
   Kaloriq – Health Connect (Android)
   Liest heute Schritte und das letzte Gewicht. Keine Schreibzugriffe.
   ============================================================ */

/** Rohe Brücke – auch wenn Health Connect (noch) nicht verfügbar ist. */
function rawBridge() {
  if (typeof window === 'undefined') return null;
  return window.AndroidHealth || null;
}

function bridge() {
  const b = rawBridge();
  return b && typeof b.isAvailable === 'function' && b.isAvailable() ? b : null;
}

/** true, wenn die App die Health-Connect-Brücke überhaupt mitbringt (APK). */
export function healthBridgePresent() {
  const b = rawBridge();
  return Boolean(b && typeof b.isAvailable === 'function');
}

export function healthAvailable() {
  try {
    return Boolean(bridge());
  } catch {
    return false;
  }
}

/**
 * Status für die Oberfläche:
 * { sdk: 'available' | 'update_required' | 'unavailable' | 'error',
 *   steps: boolean, weight: boolean, error: string|null }
 */
export function healthStatus() {
  const b = rawBridge();
  const empty = { sdk: 'unavailable', steps: false, weight: false, error: null };
  if (!b || typeof b.status !== 'function') return empty;
  try {
    const data = JSON.parse(b.status());
    return {
      sdk: data?.sdk || 'error',
      steps: Boolean(data?.steps),
      weight: Boolean(data?.weight),
      error: data?.error || null,
    };
  } catch {
    return { ...empty, sdk: 'error' };
  }
}

export function healthHasPermissions() {
  try {
    return Boolean(bridge()?.hasPermissions?.());
  } catch {
    return false;
  }
}

/** Fragt beide Berechtigungen an; liefert { granted, steps, weight }. */
export function requestHealthPermissions() {
  return new Promise((resolve, reject) => {
    const b = bridge();
    if (!b) {
      reject(new Error('Health Connect ist auf diesem Gerät nicht verfügbar.'));
      return;
    }
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      if (window.__kaloriqHealthPermission === handler) delete window.__kaloriqHealthPermission;
      resolve(value);
    };
    const handler = (result) => finish({
      granted: Boolean(result?.granted),
      steps: Boolean(result?.steps),
      weight: Boolean(result?.weight),
    });
    window.__kaloriqHealthPermission = handler;
    try {
      b.requestPermissions();
    } catch (err) {
      done = true;
      reject(err);
      return;
    }
    setTimeout(() => finish({ granted: false, steps: false, weight: false }), 60000);
  });
}

/** Öffnet Health Connect bzw. den Play-Store-Eintrag. */
export function openHealthSettings() {
  const b = rawBridge();
  try {
    b?.openSettings?.();
  } catch {
    /* egal */
  }
}

/**
 * Liest Schritte und Gewicht. Beide Werte werden getrennt geliefert:
 * { steps: number|null, weight: number|null, errors: string[] }
 */
export function readHealthToday() {
  return new Promise((resolve, reject) => {
    const b = bridge();
    if (!b) {
      reject(new Error('Health Connect ist auf diesem Gerät nicht verfügbar.'));
      return;
    }
    let done = false;
    const cleanup = () => {
      if (window.__kaloriqHealthData === onData) delete window.__kaloriqHealthData;
      if (window.__kaloriqHealthError === onError) delete window.__kaloriqHealthError;
    };
    const onData = (data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({
        steps: Number.isFinite(Number(data?.steps)) ? Number(data.steps) : null,
        weight: Number.isFinite(Number(data?.weight)) ? Number(data.weight) : null,
        errors: Array.isArray(data?.errors) ? data.errors : [],
        date: data?.date || '',
      });
    };
    const onError = (err) => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error(err?.message || 'Health Connect konnte nicht gelesen werden.'));
    };
    window.__kaloriqHealthData = onData;
    window.__kaloriqHealthError = onError;
    try {
      b.readToday();
    } catch (err) {
      done = true;
      cleanup();
      reject(err);
      return;
    }
    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error('Zeitüberschreitung bei Health Connect.'));
    }, 20000);
  });
}
