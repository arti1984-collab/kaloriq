/* ============================================================
   Kaloriq – Health Connect (Android)
   Liest Schritte, Gewicht und Aktivitäten. Schreibt Nährwerte und
   Wasser nur auf ausdrücklichen Wunsch.
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
 *   steps, weight, exercise, nutrition, hydration: boolean, error: string|null }
 */
export function healthStatus() {
  const b = rawBridge();
  const empty = {
    sdk: 'unavailable', steps: false, weight: false,
    exercise: false, nutrition: false, hydration: false, error: null,
  };
  if (!b || typeof b.status !== 'function') return empty;
  try {
    const data = JSON.parse(b.status());
    return {
      sdk: data?.sdk || 'error',
      steps: Boolean(data?.steps),
      weight: Boolean(data?.weight),
      exercise: Boolean(data?.exercise),
      nutrition: Boolean(data?.nutrition),
      hydration: Boolean(data?.hydration),
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

/** Gemeinsamer Ablauf für alle Berechtigungs-Dialoge. */
function askPermissions(group, start) {
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
    const handler = (result) => {
      if (result?.scope && result.scope !== group) return;
      finish({
        granted: Boolean(result?.granted),
        steps: Boolean(result?.steps),
        weight: Boolean(result?.weight),
        exercise: Boolean(result?.exercise),
        nutrition: Boolean(result?.nutrition),
        hydration: Boolean(result?.hydration),
      });
    };
    window.__kaloriqHealthPermission = handler;
    try {
      start(b);
    } catch (err) {
      done = true;
      reject(err);
      return;
    }
    setTimeout(() => finish({
      granted: false, steps: false, weight: false,
      exercise: false, nutrition: false, hydration: false,
    }), 60000);
  });
}

/** Fragt Schritte und Gewicht an; liefert { granted, steps, weight, … }. */
export function requestHealthPermissions() {
  return askPermissions('read', (b) => b.requestPermissions());
}

/**
 * Fragt zusätzliche Berechtigungen an.
 * @param {'exercise'|'write'} group Aktivitäten lesen bzw. Nährwerte/Wasser schreiben
 */
export function requestHealthExtras(group) {
  return askPermissions(group, (b) => {
    if (typeof b.requestExtras !== 'function') {
      throw new Error('Diese Health-Connect-Funktion braucht die aktuelle App-Version.');
    }
    b.requestExtras(group);
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

/**
 * Schreibt Nährwerte und/oder Wasser eines Tages.
 * @param {{date:string, kcal:number, protein:number, carbs:number, fat:number,
 *          water:number, nutrition:boolean, hydration:boolean}} payload
 * @returns {Promise<{written:string[]}>}
 */
export function writeHealthDay(payload) {
  return new Promise((resolve, reject) => {
    const b = bridge();
    if (!b || typeof b.writeDay !== 'function') {
      reject(new Error('Diese Health-Connect-Funktion braucht die aktuelle App-Version.'));
      return;
    }
    let done = false;
    const cleanup = () => {
      if (window.__kaloriqHealthWrite === handler) delete window.__kaloriqHealthWrite;
    };
    const handler = (result) => {
      if (done) return;
      done = true;
      cleanup();
      if (result?.ok) resolve({ written: Array.isArray(result.written) ? result.written : [] });
      else reject(new Error(result?.error || 'Schreiben nach Health Connect fehlgeschlagen.'));
    };
    window.__kaloriqHealthWrite = handler;
    try {
      b.writeDay(JSON.stringify(payload));
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
      reject(new Error('Zeitüberschreitung beim Schreiben.'));
    }, 25000);
  });
}

/**
 * Liest Aktivitäten der letzten Tage.
 * @returns {Promise<{workouts: Array<{title:string,date:string,minutes:number,kcal:number|null}>, today:string, error:string|null}>}
 */
export function readHealthWorkouts(days = 7) {
  return new Promise((resolve, reject) => {
    const b = bridge();
    if (!b || typeof b.readWorkouts !== 'function') {
      reject(new Error('Diese Health-Connect-Funktion braucht die aktuelle App-Version.'));
      return;
    }
    let done = false;
    const cleanup = () => {
      if (window.__kaloriqHealthWorkouts === handler) delete window.__kaloriqHealthWorkouts;
    };
    const handler = (result) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({
        workouts: Array.isArray(result?.workouts) ? result.workouts : [],
        today: result?.today || '',
        error: result?.error || null,
      });
    };
    window.__kaloriqHealthWorkouts = handler;
    try {
      b.readWorkouts(Number(days) || 7);
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
      reject(new Error('Zeitüberschreitung beim Lesen der Aktivitäten.'));
    }, 25000);
  });
}
