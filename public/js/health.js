/* ============================================================
   Kaloriq – Health Connect (Android)
   Liest heute Schritte und das letzte Gewicht. Keine Schreibzugriffe.
   ============================================================ */

function bridge() {
  if (typeof window === 'undefined') return null;
  const b = window.AndroidHealth;
  return b && typeof b.isAvailable === 'function' && b.isAvailable() ? b : null;
}

export function healthAvailable() {
  try {
    return Boolean(bridge());
  } catch {
    return false;
  }
}

export function healthHasPermissions() {
  try {
    return Boolean(bridge()?.hasPermissions?.());
  } catch {
    return false;
  }
}

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
    const handler = (result) => finish(Boolean(result?.granted));
    window.__kaloriqHealthPermission = handler;
    try {
      b.requestPermissions();
    } catch (err) {
      done = true;
      reject(err);
      return;
    }
    setTimeout(() => finish(false), 60000);
  });
}

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
      resolve(data || {});
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
