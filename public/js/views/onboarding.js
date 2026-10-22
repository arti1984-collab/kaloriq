/* ============================================================
   Kaloriq – Onboarding (Plan erstellen)
   ============================================================ */
import { store } from '../store.js';
import { ACTIVITY, GOALS, computeTargets, bmi, bmiCategory, healthyWeightRange, projection } from '../calc.js';
import { esc, fmt, icon, toast } from '../ui.js';
import { locale } from '../i18n.js';

let step = 0;
let draft = null;

function ensureDraft() {
  if (draft) return draft;
  const p = store.get().profile;
  draft = { ...p, rate: p.rate || 0.5, name: p.name || '' };
  return draft;
}

const STEP_TITLES = ['Willkommen', 'Über dich', 'Alltag', 'Dein Ziel', 'Dein Plan'];

export function renderOnboarding(root) {
  const d = ensureDraft();
  const total = 5;
  const pct = Math.round(((step + 1) / total) * 100);

  root.innerHTML = `
    <div class="onb">
      <div class="onb-top">
        <div class="onb-logo">K</div>
        <div class="onb-progress"><i style="width:${pct}%"></i></div>
        <span class="tiny muted nowrap">${step + 1}/${total}</span>
      </div>
      <div class="onb-main">${stepView(d)}</div>
      <div class="onb-foot">
        ${step > 0 ? '<button class="btn" data-back>Zurück</button>' : ''}
        <button class="btn btn-primary btn-block" data-next>
          ${step === total - 1 ? 'Plan starten' : 'Weiter'} ${icon('right')}
        </button>
        ${step === 0 ? '<p class="tiny muted center">Deine Daten bleiben ausschließlich auf diesem Gerät.</p>' : ''}
      </div>
    </div>`;

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  // Auswahl-Buttons (Geschlecht, Aktivität, Ziel)
  qa('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.choice;
      draft[field] = field === 'goal' ? value : value;
      if (field === 'goal') {
        if (value === 'lose' && d.targetWeight >= d.weight) d.targetWeight = Math.round((d.weight - 5) * 10) / 10;
        if (value === 'gain' && d.targetWeight <= d.weight) d.targetWeight = Math.round((d.weight + 5) * 10) / 10;
      }
      if (field === 'sex' || field === 'activity' || field === 'goal') {
        qa(`[data-field="${field}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      }
    });
  });

  q('[data-back]')?.addEventListener('click', () => {
    step = Math.max(0, step - 1);
    renderOnboarding(root);
  });

  q('[data-next]').addEventListener('click', () => {
    if (!validate(root, d)) return;
    if (step === total - 1) {
      store.saveProfile({ ...d, rate: Number(d.rate) || 0.5 });
      store.finishOnboarding();
      return;
    }
    step++;
    renderOnboarding(root);
  });

  // Live-Vorschau der Rate
  const rate = q('[data-rate]');
  rate?.addEventListener('input', () => {
    d.rate = Number(rate.value);
    const out = q('[data-rate-out]');
    if (out) out.textContent = fmt(d.rate, 1) + ' kg / Woche';
    const preview = q('[data-rate-preview]');
    if (preview) preview.textContent = fmt(calcDelta(d), 0) + ' kcal pro Tag';
  });

  // Einheiten-Hinweise
  qa('input[type="number"]').forEach((input) => {
    input.addEventListener('blur', () => {
      const key = input.name;
      if (!key) return;
      let v = Number(input.value.replace(',', '.'));
      if (Number.isFinite(v)) {
        if (key === 'height') v = Math.min(230, Math.max(120, v));
        if (key === 'weight' || key === 'targetWeight') v = Math.min(300, Math.max(30, v));
        if (key === 'age') v = Math.min(99, Math.max(14, v));
        input.value = String(v);
        d[key] = v;
      }
    });
  });
}

function calcDelta(d) {
  const t = computeTargets(d);
  return t.deficit;
}

function validate(root, d) {
  const read = (name) => {
    const input = root.querySelector(`[name="${name}"]`);
    if (!input) return d[name];
    const v = Number(String(input.value).replace(',', '.'));
    return Number.isFinite(v) ? v : d[name];
  };

  if (step === 0) {
    const nameInput = root.querySelector('[name="name"]');
    if (nameInput) d.name = nameInput.value.trim().slice(0, 40);
    return true;
  }

  if (step === 1) {
    d.age = read('age');
    d.height = read('height');
    d.weight = read('weight');
    d.targetWeight = read('targetWeight');
    if (!(d.age >= 14 && d.age <= 99)) return fail('Bitte ein Alter zwischen 14 und 99 angeben.');
    if (!(d.height >= 120 && d.height <= 230)) return fail('Bitte eine Größe zwischen 120 und 230 cm angeben.');
    if (!(d.weight >= 30 && d.weight <= 300)) return fail('Bitte ein Gewicht zwischen 30 und 300 kg angeben.');
    if (!(d.targetWeight >= 30 && d.targetWeight <= 300)) return fail('Bitte ein Zielgewicht zwischen 30 und 300 kg angeben.');
    return true;
  }

  if (step === 3) {
    if (d.goal !== 'maintain') {
      d.rate = Number(String(root.querySelector('[data-rate]')?.value || d.rate).replace(',', '.'));
      if (!(d.rate > 0.05 && d.rate <= 1.2)) return fail('Bitte eine Rate zwischen 0,1 und 1,2 kg pro Woche wählen.');
    }
    return true;
  }

  return true;
}

function fail(message) {
  toast(message, 'err');
  return false;
}

/* ---------------- Schritte ---------------- */

function stepView(d) {
  switch (step) {
    case 0:
      return `
        <h1>Abnehmen, zunehmen oder einfach <em>besser essen</em>.</h1>
        <p class="lead">Kalorien, Makros, Wasser und Fasten an einem Ort – inklusive KI-Foto-Erkennung. In zwei Minuten steht dein Plan.</p>
        <div class="card" style="margin-top:26px">
          <div class="field">
            <label for="name">Wie sollen wir dich nennen? <span class="muted">(optional)</span></label>
            <input class="input" id="name" name="name" autocomplete="given-name" placeholder="Dein Vorname" value="${esc(d.name)}">
          </div>
          <div class="vstack small muted">
            <span>✓ Kein Konto, keine Cloud</span>
            <span>✓ Alle Daten bleiben auf deinem Handy</span>
            <span>✓ Funktioniert auch offline</span>
          </div>
        </div>`;

    case 1: {
      const b = bmi({ height: d.height, weight: d.weight });
      const cat = bmiCategory(b);
      return `
        <h1>Ein paar <em>Eckdaten</em></h1>
        <p class="lead">Damit wir deinen Grundumsatz berechnen können.</p>

        <div class="section-title">Geschlecht</div>
        <div class="chips" style="margin-bottom:18px">
          <button class="chip" data-field="sex" data-choice="female" aria-pressed="${d.sex === 'female'}">♀ Weiblich</button>
          <button class="chip" data-field="sex" data-choice="male" aria-pressed="${d.sex === 'male'}">♂ Männlich</button>
        </div>

        <div class="card">
          <div class="input-group" style="gap:12px">
            <div class="field grow" style="margin-bottom:8px">
              <label for="age">Alter</label>
              <input class="input" id="age" name="age" type="number" inputmode="numeric" value="${d.age}">
            </div>
            <div class="field grow" style="margin-bottom:8px">
              <label for="height">Größe (cm)</label>
              <input class="input" id="height" name="height" type="number" inputmode="decimal" value="${d.height}">
            </div>
          </div>
          <div class="input-group" style="gap:12px">
            <div class="field grow" style="margin-bottom:0">
              <label for="weight">Gewicht (kg)</label>
              <input class="input" id="weight" name="weight" type="number" inputmode="decimal" step="0.1" value="${d.weight}">
            </div>
            <div class="field grow" style="margin-bottom:0">
              <label for="targetWeight">Zielgewicht (kg)</label>
              <input class="input" id="targetWeight" name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${d.targetWeight}">
            </div>
          </div>
          <div class="divider"></div>
          <div class="hstack">
            <span class="pill ${cat.tone === 'ok' ? '' : cat.tone === 'danger' ? 'danger' : 'warn'}">BMI ${fmt(b, 1)} · ${cat.label}</span>
            <span class="tiny muted">Normal: ${fmt(healthyWeightRange(d)[0], 1)}–${fmt(healthyWeightRange(d)[1], 1)} kg</span>
          </div>
        </div>`;
    }

    case 2:
      return `
        <h1>Wie <em>aktiv</em> bist du?</h1>
        <p class="lead">Alltag zählt mehr als Sport. Wähle, was die meiste Zeit auf dich zutrifft.</p>
        <div style="margin-top:20px">
          ${ACTIVITY.map((a) => `
            <button class="choice" type="button" data-field="activity" data-choice="${a.id}" aria-pressed="${d.activity === a.id}">
              <span class="ico">${activityEmoji(a.id)}</span>
              <span class="grow"><span class="t">${esc(a.label)}</span><span class="s">${esc(a.desc)}</span></span>
              <span class="dot"></span>
            </button>`).join('')}
        </div>
        <p class="tiny muted center" style="margin-top:14px">Sportliche Einheiten kannst du später zusätzlich als Aktivität eintragen.</p>`;

    case 3:
      return `
        <h1>Was ist dein <em>Ziel</em>?</h1>
        <p class="lead">Du kannst das jederzeit im Profil anpassen.</p>
        <div style="margin-top:20px">
          ${GOALS.map((g) => `
            <button class="choice" type="button" data-field="goal" data-choice="${g.id}" aria-pressed="${d.goal === g.id}">
              <span class="ico">${g.icon}</span>
              <span class="grow"><span class="t">${esc(g.label)}</span><span class="s">${esc(g.desc)}</span></span>
              <span class="dot"></span>
            </button>`).join('')}
        </div>
        ${d.goal === 'maintain' ? '' : `
          <div class="card" style="margin-top:14px">
            <div class="hstack" style="justify-content:space-between;margin-bottom:8px">
              <span class="small" style="font-weight:620">Tempo</span>
              <span class="pill" data-rate-out>${fmt(d.rate, 1)} kg / Woche</span>
            </div>
            <input type="range" data-rate min="0.1" max="1" step="0.1" value="${d.rate}" style="width:100%;accent-color:var(--accent)">
            <p class="tiny muted" style="margin-top:8px">
              0,5 kg/Woche gilt als nachhaltig. Dein Defizit: <b data-rate-preview>${fmt(calcDelta(d), 0)} kcal pro Tag</b>
            </p>
          </div>`}`;

    case 4: {
      const t = computeTargets(d);
      const proj = projection(d);
      return `
        <h1>Dein <em>Plan</em> steht</h1>
        <p class="lead">Tagesziel basierend auf ${fmt(t.bmr)} kcal Grundumsatz und ${fmt(t.tdee)} kcal Gesamtumsatz.</p>

        <div class="card center" style="margin-top:18px;padding:22px">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:650">Tägliches Kalorienziel</div>
          <div class="big-num" style="margin:6px 0 2px">${fmt(t.kcal)}</div>
          <div class="small muted">kcal ${d.goal === 'lose' ? '· Defizit ' + fmt(Math.abs(t.deficit)) : d.goal === 'gain' ? '· Überschuss ' + fmt(t.deficit) : '· Erhaltung'}</div>
          <div class="divider"></div>
          <div class="hstack" style="justify-content:space-around">
            <div><div class="tiny muted">Protein</div><div style="font-weight:700">${fmt(t.protein)} g</div></div>
            <div><div class="tiny muted">Kohlenhydrate</div><div style="font-weight:700">${fmt(t.carbs)} g</div></div>
            <div><div class="tiny muted">Fett</div><div style="font-weight:700">${fmt(t.fat)} g</div></div>
          </div>
        </div>

        <div class="card">
          <div class="row static" style="padding-left:0;padding-right:0">
            <span class="grow"><span class="t">Zielgewicht</span><span class="s">${fmt(d.targetWeight, 1)} kg</span></span>
            <span class="v">${proj.days > 0 ? '≈ ' + proj.days + ' Tage' : 'erreicht'}</span>
          </div>
          ${proj.date ? `<div class="row static" style="padding-left:0;padding-right:0;border-bottom:0">
            <span class="grow"><span class="t">Voraussichtlich</span><span class="s">bei gleichbleibendem Tempo</span></span>
            <span class="v">${proj.date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>` : ''}
          <div class="row static" style="padding-left:0;padding-right:0;border-bottom:0">
            <span class="grow"><span class="t">Wasser</span><span class="s">empfohlen pro Tag</span></span>
            <span class="v">${fmt(t.water)} ml</span>
          </div>
        </div>
        <p class="tiny muted center" style="margin-top:14px">Richtwerte, keine medizinische Beratung.</p>`;
    }

    default:
      return '';
  }
}

function activityEmoji(id) {
  return { sedentary: '🪑', light: '🚶', moderate: '🚴', active: '🏃', very: '🏋️' }[id] || '🚶';
}
