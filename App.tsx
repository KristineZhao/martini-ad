import React, { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";

/* ---------------- time helpers ---------------- */
const t2m = (s) => {
  if (!s) return null;
  const [a, b] = s.split(":").map(Number);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return a * 60 + b;
};
const seqAbs = (arr) => {
  let prev = null;
  return arr.map((v) => {
    if (v == null) return null;
    let x = v;
    if (prev != null) while (x < prev) x += 1440;
    prev = x;
    return x;
  });
};
const fHM = (m) => {
  if (m == null) return "—";
  const neg = m < 0;
  const a = Math.abs(Math.round(m));
  return (neg ? "-" : "") + Math.floor(a / 60) + "h" + String(a % 60).padStart(2, "0");
};
const fClk = (mAbs) => {
  if (mAbs == null) return "—";
  const day = Math.floor(mAbs / 1440);
  const m = ((mAbs % 1440) + 1440) % 1440;
  let h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ap = h >= 12 ? "P" : "A";
  h = h % 12; if (h === 0) h = 12;
  return h + ":" + mm + ap + (day > 0 ? "+1" : "");
};
const nowHHMM = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
const money = (n) => "$" + (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const money2 = (n) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const addMin = (hhmm, mins) => {
  const t = t2m(hhmm);
  if (t == null) return "";
  const v = (((t + mins) % 1440) + 1440) % 1440;
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
};

/* ---------------- default rule profiles ---------------- */
const DEFAULT_PROFILES = [
  {
    id: "sag", name: "SAG-AFTRA Day Performer", short: "SAG-AFTRA",
    base: 8, m1: 1.5, t2: 12, m2: 2, t3: null, m3: 2.5,
    mealInt: 6, penMode: "escalating", pens: [25, 35, 50, 50, 75],
    turnaround: 12, forcedCap: 900,
    note: "TV/Theatrical defaults (2026 agreement). Meal due within 6h of call; 2nd meal within 6h of 1st meal-in.",
  },
  {
    id: "iatse", name: "IATSE Crew (Basic Agreement)", short: "IATSE",
    base: 8, m1: 1.5, t2: 12, m2: 2, t3: null, m3: 2.5,
    mealInt: 6, penMode: "escalating", pens: [7.5, 10, 12.5, 12.5, 25],
    turnaround: 10, forcedCap: null,
    note: "West Coast Basic Agreement defaults. Golden-hour tiers vary by local — set OT tier 3 to match yours.",
  },
  {
    id: "nonu", name: "Non-union (CA-style)", short: "NON-UNION",
    base: 8, m1: 1.5, t2: 12, m2: 2, t3: null, m3: 2.5,
    mealInt: 5, penMode: "hourPay", pens: [],
    turnaround: 0, forcedCap: null,
    note: "CA labor-law flavor: meal before end of 5th hour; missed meal = 1 hour premium pay.",
  },
];

const DEFAULT_BANDS = [
  { id: "b2", label: "Age 2–5", workS: 3, workN: 3, set: 6 },
  { id: "b6", label: "Age 6–8", workS: 4, workN: 6, set: 8 },
  { id: "b9", label: "Age 9–15", workS: 5, workN: 7, set: 9 },
  { id: "b16", label: "Age 16–17", workS: 6, workN: 8, set: 10 },
];

/* ---------------- sample day ---------------- */
let _id = 100;
const nid = () => String(++_id);

const SAMPLE_PEOPLE = [
  { id: nid(), name: "M. Chen — Lead", dept: "Cast", profileId: "sag", rate: 1246, minorBand: "", call: "07:00", m1o: "13:45", m1i: "14:30", m2o: "", m2i: "", wrap: "20:15", next: "" },
  { id: nid(), name: "E. Park — Kid (10)", dept: "Cast", profileId: "sag", rate: 1246, minorBand: "b9", call: "08:00", m1o: "13:45", m1i: "14:30", m2o: "", m2i: "", wrap: "18:45", next: "" },
  { id: nid(), name: "T. Okafor — Gaffer", dept: "G+E", profileId: "iatse", rate: 560, minorBand: "", call: "06:30", m1o: "13:00", m1i: "13:45", m2o: "", m2i: "", wrap: "21:00", next: "06:30" },
  { id: nid(), name: "R. Silva — Key Grip", dept: "G+E", profileId: "iatse", rate: 540, minorBand: "", call: "06:30", m1o: "13:00", m1i: "13:45", m2o: "", m2i: "", wrap: "", next: "07:00" },
  { id: nid(), name: "A. Wu — Sound Mixer", dept: "Sound", profileId: "nonu", rate: 500, minorBand: "", call: "07:00", m1o: "13:45", m1i: "14:30", m2o: "", m2i: "", wrap: "19:30", next: "" },
];

const SAMPLE_SCENES = [
  { id: nid(), num: "12", slug: "KITCHEN — breakfast argument", ie: "INT", dn: "DAY", pages: "1 3/8", est: 90, done: true },
  { id: nid(), num: "12A", slug: "KITCHEN — insert, burnt toast", ie: "INT", dn: "DAY", pages: "1/8", est: 25, done: true },
  { id: nid(), num: "14", slug: "BACKYARD — the confession", ie: "EXT", dn: "DAY", pages: "2 2/8", est: 150, done: false },
  { id: nid(), num: "15", slug: "HALLWAY — she overhears", ie: "INT", dn: "NIGHT", pages: "5/8", est: 60, done: false },
  { id: nid(), num: "16", slug: "PORCH — martini shot", ie: "EXT", dn: "NIGHT", pages: "1", est: 75, done: false },
];

const STRIP = {
  "INT-DAY": "#f7f2e4",
  "EXT-DAY": "#e3b93c",
  "INT-NIGHT": "#6f8fb3",
  "EXT-NIGHT": "#7ea578",
};

/* ---------------- device persistence (auto-detects; preview falls back to session-only) ---------------- */
const STORE_KEY = "martini_v1";
const store = (() => {
  try {
    const t = "__martini_probe__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) { return null; }
})();
const SAVED = (() => {
  try {
    const v = store ? store.getItem(STORE_KEY) : null;
    return v ? JSON.parse(v) : null;
  } catch (e) { return null; }
})();
if (SAVED) {
  const bump = (it) => { const n = parseInt(it && it.id, 10); if (!Number.isNaN(n) && n > _id) _id = n; };
  (SAVED.people || []).forEach(bump);
  (SAVED.scenes || []).forEach(bump);
  (SAVED.archive || []).forEach((a) => { (a.people || []).forEach(bump); (a.scenes || []).forEach(bump); });
}
const pick = (k, d) => (SAVED && SAVED[k] !== undefined && SAVED[k] !== null ? SAVED[k] : d);
const mergeById = (saved, defaults) => {
  if (!saved) return defaults;
  return defaults.map((d) => { const f = saved.find((x) => x && x.id === d.id); return f ? { ...d, ...f } : d; });
};

/* ---------------- calculation engine ---------------- */
function mealChecks(callA, m1o, m1i, m2o, endA, prof, hourly) {
  const int = prof.mealInt * 60;
  const checks = [];
  checks.push({ label: "Meal 1", due: callA + int, actual: m1o != null ? m1o : endA });
  if (m1i != null) {
    const actual2 = m2o != null ? m2o : endA;
    if (actual2 > m1i) checks.push({ label: "Meal 2", due: m1i + int, actual: actual2 });
  }
  const items = [];
  let amt = 0, ct = 0;
  for (const c of checks) {
    const over = Math.max(0, c.actual - c.due);
    const n = Math.ceil(over / 30);
    if (n > 0) {
      let a = 0;
      if (prof.penMode === "hourPay") a = hourly;
      else for (let i = 0; i < n; i++) a += prof.pens[Math.min(i, prof.pens.length - 1)] || 0;
      items.push({ ...c, n, a });
      amt += a; ct += n;
    }
  }
  return { items, amt, ct };
}

function calcPerson(p, prof, bands, schoolDay, liveNowAbs) {
  const call = t2m(p.call);
  if (call == null || !prof) return { empty: true };
  const [c, m1o, m1i, m2o, m2i, w0] = seqAbs([
    call, t2m(p.m1o), t2m(p.m1i), t2m(p.m2o), t2m(p.m2i), t2m(p.wrap),
  ]);
  let end = w0, live = false, sched = null;
  if (end == null) {
    if (liveNowAbs == null) return { empty: true };
    end = Math.max(liveNowAbs, c); live = true;
  } else if (liveNowAbs != null && liveNowAbs >= c && liveNowAbs < end) {
    sched = end;
    end = liveNowAbs;
    live = true;
  }
  const past = (t) => (t != null && t <= end ? t : null);
  const m1oE = past(m1o), m1iE = past(m1i), m2oE = past(m2o), m2iE = past(m2i);
  const dRaw1 = m1oE != null && m1iE != null ? Math.min(Math.max(m1iE - m1oE, 0), 60) : 0;
  const d1 = dRaw1 >= 30 ? dRaw1 : 0;
  const dRaw2 = m2oE != null && m2iE != null ? Math.min(Math.max(m2iE - m2oE, 0), 60) : 0;
  const d2 = dRaw2 >= 30 ? dRaw2 : 0;
  const span = end - c;
  const worked = Math.max(0, span - d1 - d2) / 60;

  const rate = Number(p.rate) || 0;
  const hourly = prof.base > 0 ? rate / prof.base : 0;
  const T2 = prof.t2 == null ? Infinity : prof.t2;
  const T3 = prof.t3 == null ? Infinity : prof.t3;
  const ot1 = Math.max(0, Math.min(worked, T2) - prof.base);
  const ot2 = Math.max(0, Math.min(worked, T3) - T2);
  const ot3 = Math.max(0, worked - T3);
  const otPay = hourly * (ot1 * prof.m1 + ot2 * prof.m2 + ot3 * (prof.m3 || 0));

  const meals = mealChecks(c, m1oE, m1iE, m2oE, end, prof, hourly);

  let earliestNext = null, forced = false, forcedPen = 0, gap = null;
  const nc = t2m(p.next);
  if (prof.turnaround > 0) {
    earliestNext = end + prof.turnaround * 60;
    if (nc != null && !live) {
      let ncA = nc;
      while (ncA < end) ncA += 1440;
      gap = ncA - end;
      if (gap < prof.turnaround * 60) {
        forced = true;
        forcedPen = prof.forcedCap != null ? Math.min(rate, prof.forcedCap) : 0;
      }
    }
  }
  const ru = t2m(p.restUntil);
  if (ru != null && prof.turnaround > 0 && call < ru) {
    forced = true;
    gap = prof.turnaround * 60 - (ru - call);
    forcedPen = Math.max(forcedPen, prof.forcedCap != null ? Math.min(rate, prof.forcedCap) : 0);
  }

  const warnings = [];
  const band = p.minorBand ? bands.find((b) => b.id === p.minorBand) : null;
  if (band) {
    const maxW = schoolDay ? band.workS : band.workN;
    if (worked > maxW) warnings.push("MINOR OVER WORK LIMIT — " + fHM(worked * 60) + " vs " + maxW + "h max");
    if (span / 60 > band.set) warnings.push("MINOR OVER ON-SET LIMIT — " + fHM(span) + " vs " + band.set + "h max");
    if (ot1 + ot2 + ot3 > 0) warnings.push("MINOR IN OVERTIME — not permitted");
  }
  if (!band) {
    if (prof.t2 != null && worked > prof.t2) warnings.push("DOUBLE TIME — " + fHM((worked - prof.t2) * 60) + " past " + prof.t2 + "h @ " + prof.m2 + "x");
    if (prof.t3 != null && worked > prof.t3) warnings.push("GOLDEN HOURS — past " + prof.t3 + "h @ " + (prof.m3 || 0) + "x");
  }
  if (meals.ct > 0) warnings.push(meals.ct + " MEAL PENALT" + (meals.ct > 1 ? "IES" : "Y") + " — " + money(meals.amt));
  if (forced) warnings.push("FORCED CALL — rest " + fHM(gap) + " under " + prof.turnaround + "h" + (forcedPen ? " (" + money(forcedPen) + ")" : ""));
  if (live && nc != null && prof.turnaround > 0) {
    let ncA = nc;
    while (ncA < end) ncA += 1440;
    if (end > ncA - prof.turnaround * 60) warnings.push("PAST SAFE WRAP — " + fClk(ncA) + " call will be forced");
  }

  const total = rate + otPay + meals.amt + forcedPen;
  const paidH = Math.min(worked, prof.base) + ot1 * prof.m1 + ot2 * prof.m2 + ot3 * (prof.m3 || 0);
  const meterW = live ? hourly * paidH : rate + otPay;
  const meter = meterW + meals.amt + forcedPen;
  return {
    empty: false, live, sched, c, end, span, worked, ded: d1 + d2,
    ot1, ot2, ot3, otPay, hourly, meals, earliestNext, forced, forcedPen,
    warnings, total, meter, meterW, band,
  };
}

/* next scheduled rest / release for someone still on the clock */
function nextRest(p, r, prof, schoolDay, nAbs) {
  if (r.empty || !prof) return null;
  if (!(r.live || (nAbs >= r.c && nAbs < r.end))) return null;
  const cands = [];
  const m1o = t2m(p.m1o), m1i = t2m(p.m1i), m2o = t2m(p.m2o);
  if (m1o == null) {
    cands.push({ at: r.c + prof.mealInt * 60, label: "1st meal break due" });
  } else {
    const [, m1oA, m1iA] = seqAbs([t2m(p.call), m1o, m1i]);
    if (nAbs < m1oA) cands.push({ at: m1oA, label: "lunch break scheduled" });
    if (m1i != null && m2o == null) cands.push({ at: m1iA + prof.mealInt * 60, label: "2nd meal break due" });
  }
  const assumedDed = r.ded > 0 ? r.ded : (m1o == null ? 60 : 0);
  cands.push({ at: r.c + prof.base * 60 + assumedDed, label: prof.m1 + "x overtime begins" });
  if (prof.t2 != null) cands.push({ at: r.c + prof.t2 * 60 + assumedDed, label: prof.m2 + "x double time begins" });
  if (prof.t3 != null) cands.push({ at: r.c + prof.t3 * 60 + assumedDed, label: (prof.m3 || 0) + "x golden hours begin" });
  if (r.band) {
    const maxW = schoolDay ? r.band.workS : r.band.workN;
    if (r.live) cands.push({ at: nAbs + (maxW - r.worked) * 60, label: "minor hits " + maxW + "h work limit" });
    cands.push({ at: r.c + r.band.set * 60, label: "minor must leave set" });
  }
  const nc = t2m(p.next);
  if (nc != null && prof.turnaround > 0) {
    let ncA = nc;
    while (ncA < nAbs) ncA += 1440;
    cands.push({ at: ncA - prof.turnaround * 60, label: "last wrap to protect " + fClk(ncA) + " call" });
  }
  const fut = cands.filter((x) => x.at > nAbs).sort((a, b) => a.at - b.at);
  return fut[0] || null;
}

/* ---------------- styles ---------------- */
const CSS = `
:root{
  --paper:#efe6cf; --paper2:#e8dcbe; --edge:#c8b78e;
  --ink:#231d12; --faded:#6f6142;
  --maroon:#5f1c22; --maroon2:#4a161b;
  --gold:#c19a3f; --gold2:#a37f2c;
  --stamp:#a3342a; --green:#41603f;
}
.mtn{min-height:100vh;background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased}
.f-deco{font-family:"Didot","Bodoni 72","Playfair Display",Georgia,serif}
.f-caps{font-family:"Copperplate","Futura","Trebuchet MS",serif;text-transform:uppercase}
.f-type{font-family:"American Typewriter","Courier New",Courier,monospace}
.f-script{font-family:"Snell Roundhand","Brush Script MT",cursive}

.film{height:12px;background:#171310;background-image:radial-gradient(circle 2.6px at 9px 6px,var(--paper) 97%,transparent);background-size:18px 12px;background-repeat:repeat-x}
.masthead{background:var(--maroon);color:var(--gold);padding:12px 16px 10px;border-bottom:3px double var(--gold)}
.bulbs{height:9px;background:var(--maroon2);background-image:radial-gradient(circle 2px at 8px 4.5px,var(--gold) 96%,transparent);background-size:16px 9px;background-repeat:repeat-x;border-bottom:1px solid var(--gold2)}
.mast-title{font-size:30px;letter-spacing:.14em;line-height:1;font-weight:600}
.mast-star{font-size:14px;letter-spacing:.3em;vertical-align:6px}
.mast-sub{font-size:9px;letter-spacing:.32em;color:#e6d9ae;margin-top:4px}
.clockbox{border:1px solid var(--gold);padding:5px 10px 3px;text-align:center;background:var(--maroon2)}
.clockbox .t{font-size:21px;letter-spacing:.06em;color:#f1e3b5;font-variant-numeric:tabular-nums;line-height:1}
.clockbox .c{font-size:7.5px;letter-spacing:.3em;color:var(--gold);margin-top:3px}

.tabs{display:grid;grid-template-columns:repeat(4,1fr);background:var(--maroon2);border-bottom:3px double var(--gold)}
.tab{padding:9px 2px;text-align:center;font-size:10.5px;letter-spacing:.14em;color:#cdb briefly}
.tab{color:#cdbd8f;border-right:1px solid rgba(193,154,63,.35)}
.tab:last-child{border-right:0}
.tab.on{background:var(--gold);color:var(--maroon2);font-weight:700}

.sheet{max-width:640px;margin:0 auto;padding:16px 14px 90px}
.headline{display:flex;align-items:baseline;gap:10px;margin:18px 0 10px}
.headline .h{font-size:17px;letter-spacing:.12em}
.headline .r{flex:1;border-bottom:3px double var(--gold2);transform:translateY(-4px)}
.smallprint{font-size:9.5px;letter-spacing:.14em;color:var(--faded)}

.card{border:1.5px solid var(--ink);background:var(--paper);margin-bottom:14px;box-shadow:3px 3px 0 rgba(35,29,18,.14)}
.card .bar{background:var(--ink);color:var(--paper);padding:4px 10px;font-size:9.5px;letter-spacing:.22em;display:flex;justify-content:space-between;align-items:center}
.card .inner{padding:10px 12px 12px}

.lbl{font-size:8.5px;letter-spacing:.2em;color:var(--faded);margin-bottom:2px;text-transform:uppercase;font-family:"Copperplate","Futura","Trebuchet MS",serif}
.fld{display:block;width:100%;border:0;border-bottom:1.5px solid var(--ink);background:transparent;color:var(--ink);font-family:"American Typewriter","Courier New",monospace;font-size:15px;padding:3px 1px 2px;border-radius:0;min-width:0}
select.fld{padding:3px 0 2px}
.fld:focus{outline:none;border-bottom-color:var(--gold2);background:rgba(193,154,63,.08)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 12px}

.tk{display:flex;border:1.5px solid var(--ink);background:var(--paper2);margin-bottom:9px}
.tk-side{writing-mode:vertical-rl;transform:rotate(180deg);font-size:7.5px;letter-spacing:.28em;padding:6px 2px;border-left:1.5px dashed var(--ink);color:var(--faded)}
.tk-body{flex:1;padding:7px 10px 8px;min-width:0}
.tk-title{font-size:8.5px;letter-spacing:.22em;color:var(--faded)}
.tk-big{font-size:16.5px;margin-top:2px;line-height:1.25}
.tk-sub{font-size:11px;color:var(--faded);margin-top:2px}
.tk.warn{background:#ecdCA8}
.tk.warn{background:#ecdca8;border-color:var(--gold2)}
.tk.bad{background:#e7cfc4;border-color:var(--stamp)}
.tk.bad .tk-big{color:var(--stamp)}
.tk.ok{border-color:var(--green)}

.stamp{display:inline-block;border:2.2px solid var(--stamp);color:var(--stamp);padding:2px 8px 1px;font-size:9.5px;letter-spacing:.18em;transform:rotate(-2deg);border-radius:3px;margin:4px 6px 2px 0;background:rgba(163,52,42,.05)}
.stamp.green{border-color:var(--green);color:var(--green);background:rgba(65,96,63,.06)}
.stamp.ink{border-color:var(--ink);color:var(--ink);background:transparent}

.punch{border:1.5px solid var(--ink);background:var(--paper);padding:9px 4px;text-align:center;letter-spacing:.14em;font-size:9.5px;color:var(--ink)}
.punch .v{font-size:14px;margin-top:3px;font-weight:700}
.punch.set{background:var(--maroon);color:var(--gold);border-color:var(--maroon)}
.btnrow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}

.strip{display:flex;align-items:stretch;border-top:1px solid var(--edge)}
.strip .clr{width:14px;border-right:1px solid var(--ink)}
.strip .bx{padding:8px 6px}
.strip .body{flex:1;padding:7px 8px 8px;min-width:0}
.strip.done{opacity:.45}
.mini{border:0;border-bottom:1px solid var(--edge);background:transparent;font-family:"American Typewriter","Courier New",monospace;font-size:12px;color:var(--ink);padding:1px;border-radius:0;min-width:0}
.chk{width:20px;height:20px;border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:13px;background:var(--paper)}
.chk.on{background:var(--green);color:var(--paper);border-color:var(--green)}

.ledger{width:100%;border-collapse:collapse;font-family:"American Typewriter","Courier New",monospace;font-size:12px}
.ledger th{font-family:"Copperplate","Futura",serif;font-weight:400;font-size:8.5px;letter-spacing:.18em;color:var(--faded);text-align:right;padding:6px 8px;border-bottom:1.5px solid var(--ink)}
.ledger th:first-child{text-align:left}
.ledger td{padding:6px 8px;border-bottom:1px solid var(--edge);text-align:right;white-space:nowrap}
.ledger td:first-child{text-align:left;white-space:normal}
.ledger tfoot td{border-top:3px double var(--ink);border-bottom:0;font-weight:700}

.act{border:1.5px solid var(--ink);background:transparent;color:var(--ink);padding:7px 12px;font-size:10px;letter-spacing:.2em;display:inline-flex;align-items:center;gap:6px}
.act.gold{background:var(--gold);border-color:var(--gold2);color:var(--maroon2);font-weight:700}
.footer{padding:26px 0 8px;text-align:center}
input[type=time].fld,input[type=number].fld{-webkit-appearance:none;appearance:none}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
button{cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(95,28,34,.2)}
.act{box-shadow:2px 2px 0 var(--ink);transition:transform .06s,box-shadow .06s}
.act:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.act.gold{box-shadow:2px 2px 0 var(--gold2)}
.act.gold:active{box-shadow:0 0 0 var(--gold2)}
.act.arm{background:var(--stamp);border-color:var(--stamp);color:var(--paper);font-weight:700;box-shadow:2px 2px 0 var(--maroon2)}
.punch{box-shadow:2px 2px 0 var(--ink);transition:transform .06s,box-shadow .06s}
.punch:active{transform:translate(2px,2px);box-shadow:0 0 0 var(--ink)}
.punch.set{box-shadow:2px 2px 0 var(--maroon2)}
.tab:active{opacity:.7}
.tclear:active,.chk:active{transform:scale(.88)}
.clr:active{opacity:.7}

/* ---- art deco dimensionals ---- */
.masthead{position:relative;overflow:hidden}
.masthead::before{content:"";position:absolute;inset:-45% -15%;background:repeating-conic-gradient(from -88deg at 16% 118%,rgba(232,201,106,.11) 0deg 5deg,transparent 5deg 12deg);pointer-events:none}
.masthead > *{position:relative}
.gold-metal{background:linear-gradient(105deg,#7a5a1c 0%,#c9a23f 18%,#f7e7a0 36%,#ffe9a3 42%,#c9a23f 56%,#8a6a24 76%,#e0bd66 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:sheen 6s ease-in-out infinite}
@keyframes sheen{0%,100%{background-position:0% 0}50%{background-position:100% 0}}
.bulbs{animation:chase .95s steps(2) infinite}
@keyframes chase{to{background-position-x:16px}}
.clockbox{background:radial-gradient(130% 170% at 50% 0%,#5c1b21,#3d1115 72%);box-shadow:inset 0 0 10px rgba(0,0,0,.55),0 0 0 1px rgba(247,231,160,.22),0 1px 6px rgba(0,0,0,.35)}
.clockbox .t{text-shadow:0 0 9px rgba(241,227,181,.5)}
.tab.on{background:linear-gradient(180deg,#ecd27a,#c19a3f 55%,#9d7d2e);text-shadow:0 1px 0 rgba(255,255,255,.35)}
.card{position:relative;animation:rise .4s ease-out both;transform-origin:50% 100%}
.card::after{content:"";position:absolute;inset:3px;border:1px solid rgba(193,154,63,.5);pointer-events:none}
.tk{animation:rise .32s ease-out both;transform-origin:50% 100%}
@keyframes rise{from{opacity:0;transform:perspective(900px) rotateX(7deg) translateY(16px)}to{opacity:1;transform:perspective(900px) rotateX(0) translateY(0)}}
.stamp{animation:slam .34s cubic-bezier(.2,1.5,.35,1) both}
@keyframes slam{0%{opacity:0;transform:scale(2.1) rotate(-13deg)}62%{opacity:1;transform:scale(.94) rotate(0)}100%{opacity:1;transform:scale(1) rotate(-2deg)}}
.act:active{transform:perspective(420px) rotateX(7deg) translate(1px,2px);box-shadow:0 0 0 var(--ink)}
.punch:active{transform:perspective(420px) rotateX(7deg) translate(1px,2px);box-shadow:0 0 0 var(--ink)}
.headline .r{position:relative}
.headline .r::after{content:"◆";position:absolute;right:-1px;top:-8px;color:var(--gold2);font-size:8px}
/* ---- grand opening: velvet + gold ---- */
.curtain{position:fixed;inset:0;z-index:60;overflow:hidden;perspective:1000px}
.cur-h{position:absolute;top:-2%;bottom:-2%;width:55%;background:repeating-linear-gradient(90deg,#3f0d13 0px,#711e27 14px,#4d1219 30px,#3f0d13 46px);box-shadow:inset 0 -60px 90px rgba(0,0,0,.55),inset 0 40px 60px rgba(0,0,0,.35)}
.cur-h::after{content:"";position:absolute;top:0;bottom:0;width:12px;background:repeating-linear-gradient(180deg,var(--gold) 0px,var(--gold) 12px,rgba(193,154,63,.12) 12px,rgba(193,154,63,.12) 17px);opacity:.9}
.cur-l{left:-2%;transform-origin:left center;animation:partL 2.3s cubic-bezier(.6,.05,.32,1) forwards}
.cur-r{right:-2%;transform-origin:right center;animation:partR 2.3s cubic-bezier(.6,.05,.32,1) forwards}
.cur-l::after{right:0}
.cur-r::after{left:0}
@keyframes partL{0%,41%{transform:translateX(0) rotateY(0)}100%{transform:translateX(-110%) rotateY(16deg)}}
@keyframes partR{0%,41%{transform:translateX(0) rotateY(0)}100%{transform:translateX(110%) rotateY(-16deg)}}
.cur-title{position:absolute;left:0;right:0;top:32%;text-align:center;z-index:2;animation:titleArc 2.5s ease both}
@keyframes titleArc{0%{opacity:0;transform:scale(.65)}16%,64%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.6)}}
.cur-title .big{font-size:clamp(24px,8vw,36px);letter-spacing:.16em;color:#f2d788;text-shadow:0 0 14px rgba(236,201,106,.55),0 1px 0 rgba(0,0,0,.4)}
.cur-title .small{margin-top:9px;font-size:9px;letter-spacing:.34em;color:#d9c07a}
.cur-rays{position:absolute;left:50%;top:50%;width:340px;height:340px;margin:-170px 0 0 -170px;z-index:-1;background:repeating-conic-gradient(from 0deg,rgba(232,201,106,.16) 0deg 6deg,transparent 6deg 14deg);border-radius:50%;animation:spin 14s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.gold-metal,.bulbs,.card,.tk,.stamp,.cur-h,.cur-title,.cur-rays{animation:none}}
.trow{display:flex;align-items:flex-end;gap:4px}
.tclear{flex:0 0 auto;width:17px;height:17px;border:1px solid var(--edge);border-radius:50%;background:transparent;color:var(--faded);font-size:9px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;margin-bottom:3px}
`;

/* ---------------- tiny atoms ---------------- */
const Fld = ({ label, children }) => (
  <div style={{ minWidth: 0 }}>
    <div className="lbl">{label}</div>
    {children}
  </div>
);
const TIn = ({ label, value, onChange }) => (
  <Fld label={label}>
    <div className="trow">
      <input type="time" className="fld" style={{ flex: 1 }} value={value} onChange={(e) => onChange(e.target.value)} />
      {value ? <button className="tclear" onClick={() => onChange("")} aria-label="clear time">✕</button> : null}
    </div>
  </Fld>
);
const NIn = ({ label, value, onChange, placeholder }) => (
  <Fld label={label}>
    <input type="number" className="fld" value={value ?? ""} placeholder={placeholder || ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
  </Fld>
);
const Ticket = ({ tone, title, big, sub, side }) => (
  <div className={"tk " + (tone || "")}>
    <div className="tk-side f-caps">{side || "ADMIT ONE"}</div>
    <div className="tk-body">
      <div className="tk-title f-caps">{title}</div>
      <div className="tk-big f-type">{big}</div>
      {sub ? <div className="tk-sub f-type">{sub}</div> : null}
    </div>
  </div>
);
const Head = ({ children, right }) => (
  <div className="headline">
    <div className="h f-caps">{children}</div>
    <div className="r" />
    {right || null}
  </div>
);

const Curtain = ({ label, sub, onDone }) => {
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(onDone, reduce ? 250 : 2600);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="curtain" onClick={onDone}>
      <div className="cur-title">
        <div className="cur-rays" />
        <div className="f-deco big">{label}</div>
        <div className="f-caps small">{sub}</div>
      </div>
      <div className="cur-h cur-l" />
      <div className="cur-h cur-r" />
    </div>
  );
};

/* ================================================================ */
export default function App() {
  const [tab, setTab] = useState("ops");
  const [profiles, setProfiles] = useState(() => mergeById(SAVED && SAVED.profiles, DEFAULT_PROFILES));
  const [bands, setBands] = useState(() => mergeById(SAVED && SAVED.bands, DEFAULT_BANDS));
  const [schoolDay, setSchoolDay] = useState(() => pick("schoolDay", false));
  const [people, setPeople] = useState(() => pick("people", SAMPLE_PEOPLE));
  const [scenes, setScenes] = useState(() => pick("scenes", SAMPLE_SCENES));
  const [day, setDay] = useState(() => pick("day", { crewCall: "07:00", firstShot: "08:00", schedWrap: "19:00" }));
  const [log, setLog] = useState(() => pick("log", { shot: "", m1o: "", m1i: "", wrap: "" }));
  const [companyProfile, setCompanyProfile] = useState(() => pick("companyProfile", "iatse"));
  const [fringePct, setFringePct] = useState(() => pick("fringePct", 21));
  const [budgetTarget, setBudgetTarget] = useState(() => pick("budgetTarget", 15000));
  const [report, setReport] = useState(null);
  const [shootDay, setShootDay] = useState(() => pick("shootDay", 1));
  const [armNewDay, setArmNewDay] = useState(false);
  const [armMartini, setArmMartini] = useState(false);
  const [armFactory, setArmFactory] = useState(false);
  const [toast, setToast] = useState(null);
  const [archive, setArchive] = useState(() => pick("archive", []));
  const [viewDay, setViewDay] = useState(0);
  const [curtain, setCurtain] = useState(() => ({ run: 1, label: SAVED ? "Shoot Day " + pick("shootDay", 1) : "Martini", sub: SAVED ? "Resuming production" : "Digital First Assistant Director" }));

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!store) return;
    try {
      store.setItem(STORE_KEY, JSON.stringify({ people, scenes, day, log, shootDay, archive, profiles, bands, schoolDay, fringePct, budgetTarget, companyProfile }));
    } catch (e) {}
  }, [people, scenes, day, log, shootDay, archive, profiles, bands, schoolDay, fringePct, budgetTarget, companyProfile]);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const profOf = (id) => profiles.find((x) => x.id === id);
  const upd = (setter) => (id, patch) => setter((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const updPerson = upd(setPeople);
  const updScene = upd(setScenes);
  const updProfile = upd(setProfiles);
  const updBand = upd(setBands);

  /* ---------- live company clock ---------- */
  const cCall = t2m(day.crewCall);
  let nAbs = nowMin;
  if (cCall != null && cCall - nAbs > 720) nAbs += 1440;
  const preCall = cCall != null && nAbs < cCall;
  const cProf = profOf(companyProfile) || profiles[0];
  const [ca, lm1o, lm1i, lwrap] = cCall != null
    ? seqAbs([cCall, t2m(log.m1o), t2m(log.m1i), t2m(log.wrap)])
    : [null, null, null, null];
  const wrapped = lwrap != null;
  const clockEnd = wrapped ? lwrap : nAbs;

  let mealState = null;
  if (ca != null) {
    if (lm1o == null) mealState = { phase: "due1", due: ca + cProf.mealInt * 60 };
    else if (lm1i == null) mealState = { phase: "eating", backBy: lm1o + 60 };
    else mealState = { phase: "due2", due: lm1i + cProf.mealInt * 60 };
  }
  if (mealState && mealState.due != null) mealState.delta = mealState.due - clockEnd;
  const liveMealPen = (() => {
    if (!mealState || mealState.phase === "eating" || mealState.delta >= 0) return null;
    const n = Math.ceil(-mealState.delta / 30);
    let per = 0;
    for (let i = 0; i < n; i++) per += cProf.pens[Math.min(i, cProf.pens.length - 1)] || 0;
    return { n, per, all: per * people.length };
  })();
  const otAt = ca != null ? ca + cProf.base * 60 + (lm1o != null && lm1i != null ? Math.min(Math.max(lm1i - lm1o, 0), 60) : 60) : null;

  const remaining = scenes.filter((s) => !s.done);
  const remainingEst = remaining.reduce((a, s) => a + (Number(s.est) || 0), 0);
  const pendingMeal = lm1o == null && !wrapped ? 60 : 0;
  const projWrap = ca != null ? (wrapped ? lwrap : nAbs + remainingEst + pendingMeal) : null;
  let schedWrapAbs = t2m(day.schedWrap);
  if (schedWrapAbs != null && ca != null) { while (schedWrapAbs < ca) schedWrapAbs += 1440; }
  const behind = projWrap != null && schedWrapAbs != null ? projWrap - schedWrapAbs : null;

  /* ---------- per-person ---------- */
  const calcs = people.map((p) => ({ p, r: calcPerson(p, profOf(p.profileId), bands, schoolDay, nAbs) }));
  let sumBase = 0, sumOT = 0, sumPen = 0, sumForced = 0, sumTotal = 0, sumMeter = 0, sumMeterW = 0;
  for (const { p, r } of calcs) {
    if (r.empty) continue;
    sumBase += Number(p.rate) || 0;
    sumOT += r.otPay;
    sumPen += r.meals.amt;
    sumForced += r.forcedPen;
    sumTotal += r.total;
    sumMeter += r.meter;
    sumMeterW += r.meterW;
  }
  const fringes = (sumBase + sumOT) * (Number(fringePct) || 0) / 100;
  const grand = sumTotal + fringes;
  const meterGrand = sumMeterW * (1 + (Number(fringePct) || 0) / 100) + (sumMeter - sumMeterW);

  /* ---------- actions ---------- */
  const stamp = (f) => setLog((l) => ({ ...l, [f]: nowHHMM(new Date()) }));
  const flash = (msg) => { setToast(msg); window.setTimeout(() => setToast(null), 2800); };
  useEffect(() => { if (SAVED) flash("Restored from this device — resuming Day " + pick("shootDay", 1)); }, []);
  const syncToSheets = () => {
    setPeople((list) => list.map((p) => ({
      ...p,
      call: p.call || day.crewCall,
      m1o: p.m1o || log.m1o,
      m1i: p.m1i || log.m1i,
      wrap: p.wrap || log.wrap,
    })));
    flash("Day times posted to the time cards");
  };
  const addPerson = () => {
    const mi = (profOf("iatse") || {}).mealInt || 6;
    const c = day.crewCall || "";
    setPeople((l) => [...l, { id: nid(), name: "", dept: "", profileId: "iatse", rate: 500, minorBand: "", call: c, m1o: c ? addMin(c, mi * 60) : "", m1i: c ? addMin(c, mi * 60 + 60) : "", m2o: "", m2i: "", wrap: "", next: "", restUntil: "" }]);
  };

  const rollNewDay = () => {
    if (!armNewDay) {
      setArmNewDay(true);
      window.setTimeout(() => setArmNewDay(false), 4000);
      return;
    }
    setArmNewDay(false);
    setArchive((a) => [...a, { day: shootDay, people: people.map((x) => ({ ...x })), scenes: scenes.map((x) => ({ ...x })), log: { ...log }, dayCfg: { ...day } }]);
    setViewDay(0);
    setPeople((list) => list.map((p) => {
      const r = calcPerson(p, profOf(p.profileId), bands, schoolDay, null);
      let restUntil = "";
      if (!r.empty && !r.live && r.earliestNext != null) {
        const m = ((r.earliestNext % 1440) + 1440) % 1440;
        restUntil = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
      }
      const nc = p.next || "";
      const mi = (profOf(p.profileId) || {}).mealInt || 6;
      return { ...p, call: nc, m1o: nc ? addMin(nc, mi * 60) : "", m1i: nc ? addMin(nc, mi * 60 + 60) : "", m2o: "", m2i: "", wrap: "", next: "", restUntil };
    }));
    setLog({ shot: "", m1o: "", m1i: "", wrap: "" });
    setScenes((l) => l.map((s) => ({ ...s, done: false })));
    setShootDay((d) => d + 1);
    flash("Rolled to Day " + (shootDay + 1) + " — sheets cleared, rest windows posted");
    setCurtain({ run: Date.now(), label: "Shoot Day " + (shootDay + 1), sub: "Fresh sheets — rest windows posted" });
  };

  const martiniReset = () => {
    if (!armMartini) {
      setArmMartini(true);
      window.setTimeout(() => setArmMartini(false), 4000);
      return;
    }
    setArmMartini(false);
    setPeople((list) => list.map((x) => ({ ...x, call: "", m1o: "", m1i: "", m2o: "", m2i: "", wrap: "", next: "", restUntil: "" })));
    setScenes((l) => l.map((x) => ({ ...x, done: false })));
    setLog({ shot: "", m1o: "", m1i: "", wrap: "" });
    setArchive([]);
    setShootDay(1);
    setViewDay(0);
    flash("That's a martini — production reset to Day 1");
    setCurtain({ run: Date.now(), label: "That's a Martini", sub: "Production wrapped — back to day one" });
  };

  const factoryReset = () => {
    if (!armFactory) {
      setArmFactory(true);
      window.setTimeout(() => setArmFactory(false), 4000);
      return;
    }
    setArmFactory(false);
    try { if (store) store.removeItem(STORE_KEY); } catch (e) {}
    setProfiles(DEFAULT_PROFILES); setBands(DEFAULT_BANDS); setSchoolDay(false);
    setPeople(SAMPLE_PEOPLE); setScenes(SAMPLE_SCENES);
    setDay({ crewCall: "07:00", firstShot: "08:00", schedWrap: "19:00" });
    setLog({ shot: "", m1o: "", m1i: "", wrap: "" });
    setCompanyProfile("iatse"); setFringePct(21); setBudgetTarget(15000);
    setShootDay(1); setArchive([]); setViewDay(0);
    flash("Factory reset — sample day restored");
  };
  const addScene = () => setScenes((l) => [...l, { id: nid(), num: "", slug: "", ie: "INT", dn: "DAY", pages: "", est: 45, done: false }]);

  const buildReport = () => {
    const L = [];
    const fmtDay = (dayNum, ppl, scn, lg, cfg, isCurrent) => {
      const rows = ppl.map((x) => ({ p: x, r: calcPerson(x, profOf(x.profileId), bands, schoolDay, isCurrent ? nAbs : null) }));
      let b = 0, o = 0, mp = 0, fc = 0, tt = 0;
      L.push("=== SHOOT DAY " + dayNum + (isCurrent ? " (CURRENT)" : "") + " ===");
      const cc = t2m(cfg.crewCall);
      L.push("Crew call " + (cc != null ? fClk(cc) : "—") + " / 1st shot " + (lg.shot || "—") + " / Meal " + (lg.m1o || "—") + "-" + (lg.m1i || "—") + " / Wrap " + (lg.wrap || "—"));
      L.push("Scenes shot: " + (scn.filter((x) => x.done).map((x) => x.num).join(", ") || "none") + " / owed: " + (scn.filter((x) => !x.done).map((x) => x.num).join(", ") || "none"));
      for (const { p: pp, r } of rows) {
        if (r.empty) { if (pp.call) L.push((pp.name || "—").slice(0, 26).padEnd(28) + "incomplete — no wrap recorded"); continue; }
        b += Number(pp.rate) || 0; o += r.otPay; mp += r.meals.amt; fc += r.forcedPen; tt += r.total;
        L.push(
          (pp.name || "—").slice(0, 26).padEnd(28) +
          fHM(r.worked * 60).padEnd(7) +
          fHM((r.ot1 + r.ot2 + r.ot3) * 60).padEnd(7) +
          String(r.meals.ct).padEnd(3) + money(r.meals.amt).padEnd(8) +
          money(r.total)
        );
        for (const w of r.warnings) L.push("   ** " + w);
      }
      L.push("Day " + dayNum + " labor total " + money(tt));
      L.push("");
      return { b, o, mp, fc, tt };
    };
    const nDays = archive.length + 1;
    L.push("PRODUCTION REPORT — " + (archive.length ? "SHOOT DAYS 1-" + shootDay : "SHOOT DAY " + shootDay));
    L.push("Issued " + now.toLocaleDateString() + "   " + now.toLocaleTimeString());
    L.push("");
    const G = { b: 0, o: 0, mp: 0, fc: 0, tt: 0 };
    const acc = (t) => { G.b += t.b; G.o += t.o; G.mp += t.mp; G.fc += t.fc; G.tt += t.tt; };
    for (const a of archive) acc(fmtDay(a.day, a.people, a.scenes, a.log, a.dayCfg, false));
    acc(fmtDay(shootDay, people, scenes, log, day, true));
    const gFr = (G.b + G.o) * (Number(fringePct) || 0) / 100;
    L.push("=== PRODUCTION TOTALS — " + nDays + " DAY" + (nDays > 1 ? "S" : "") + " ===");
    L.push("Wages " + money(G.b) + " / OT " + money(G.o) + " / Meal pen " + money(G.mp) + " / Forced calls " + money(G.fc));
    L.push("Fringes " + fringePct + "% " + money(gFr) + " / GRAND TOTAL " + money(G.tt + gFr) + (budgetTarget ? " vs target " + money(budgetTarget * nDays) + " (" + money(budgetTarget) + "/day)" : ""));
    L.push("");
    L.push("Planning estimate from editable presets — confirm against governing agreements before payroll.");
    setReport(L.join("\n"));
  };

  const countdown = (mins) => {
    const a = Math.abs(mins);
    if (a >= 95) return fHM(mins);
    const s = Math.floor((a % 1) * 60);
    return (mins < 0 ? "-" : "") + Math.floor(a) + ":" + String(s).padStart(2, "0");
  };

  const TABS = [["ops", "Day Ops"], ["sheet", "Time Cards"], ["cost", "Ledger"], ["rules", "Rules"]];

  return (
    <div className="mtn" onTouchStart={() => {}}>
      <style>{CSS}</style>

      {/* ---------- masthead ---------- */}
      <div style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div className="film" />
        <div className="masthead">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="f-deco mast-title gold-metal"><span className="mast-star">★ </span>MARTINI<span className="mast-star"> ★</span></div>
              <div className="f-caps mast-sub">Digital First Assistant Director</div>
            </div>
            <div className="clockbox">
              <div className="f-type t">
                {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}:{String(now.getSeconds()).padStart(2, "0")}
              </div>
              <div className="f-caps c">Studio Clock</div>
            </div>
          </div>
        </div>
        <div className="tabs f-caps">
          {TABS.map(([id, lab]) => (
            <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{lab}</button>
          ))}
        </div>
        <div className="bulbs" />
      </div>

      <div className="sheet">

        {/* ================= DAY OPS ================= */}
        {tab === "ops" && (
          <>
            <Head>{"Day " + shootDay + " — Schedule"}</Head>
            <div className="grid3">
              <TIn label="Crew call" value={day.crewCall} onChange={(v) => setDay({ ...day, crewCall: v })} />
              <TIn label="Target 1st shot" value={day.firstShot} onChange={(v) => setDay({ ...day, firstShot: v })} />
              <TIn label="Est. wrap" value={day.schedWrap} onChange={(v) => setDay({ ...day, schedWrap: v })} />
            </div>

            <Head>Now Showing</Head>
            {preCall && (
              <Ticket side="PRE-CALL" title="House opens" big={"Crew call in " + countdown(ca - nAbs)} />
            )}
            {!preCall && mealState && mealState.phase !== "eating" && (
              <Ticket
                tone={liveMealPen ? "bad" : mealState.delta < 30 ? "warn" : ""}
                side="MEAL"
                title={(mealState.phase === "due1" ? "First" : "Second") + " meal due " + fClk(mealState.due)}
                big={liveMealPen ? "PENALTY — " + countdown(-mealState.delta) + " over" : countdown(mealState.delta) + " until penalty"}
                sub={liveMealPen ? liveMealPen.n + " increments · " + money(liveMealPen.per) + "/person · about " + money(liveMealPen.all) + " across " + people.length : "Break the company before the clock does"}
              />
            )}
            {!preCall && mealState && mealState.phase === "eating" && (
              <Ticket tone="ok" side="MEAL" title="Company at lunch"
                big={"Back in by " + fClk(mealState.backBy)} sub="to keep the meal deductible" />
            )}
            {!preCall && otAt != null && !wrapped && (
              <Ticket
                tone={nAbs >= otAt ? "warn" : ""}
                side="OVERTIME"
                title={cProf.m1 + "x time begins " + fClk(otAt)}
                big={nAbs >= otAt ? "In overtime " + countdown(nAbs - otAt) : countdown(otAt - nAbs) + " of straight time left"}
              />
            )}
            {behind != null && (
              <Ticket
                tone={behind > 15 ? "bad" : behind < -15 ? "ok" : "warn"}
                side="SCHEDULE"
                title={"Projected wrap " + fClk(projWrap) + " against " + fClk(schedWrapAbs)}
                big={behind > 0 ? fHM(behind) + " BEHIND" : fHM(-behind) + " AHEAD"}
                sub={remaining.length + " scenes / " + fHM(remainingEst) + " of board still owed"}
              />
            )}

            <Head>Punch the Clock</Head>
            <div className="btnrow f-caps">
              {[["shot", "1st Shot"], ["m1o", "Meal Out"], ["m1i", "Meal In"], ["wrap", "Wrap"]].map(([f, lab]) => (
                <button key={f} className={"punch" + (log[f] ? " set" : "")} onClick={() => stamp(f)}>
                  {lab}
                  <div className="v f-type">{log[f] || "— now —"}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <select className="fld f-type" style={{ width: "auto", flex: 1 }} value={companyProfile} onChange={(e) => setCompanyProfile(e.target.value)}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.short} governs the clock</option>)}
              </select>
              <button className="act f-caps" onClick={syncToSheets}>Post to time cards</button>
            </div>

            <Head right={<button className="act f-caps" onClick={addScene}><Plus size={12} /> Scene</button>}>The Board</Head>
            <div className="card" style={{ boxShadow: "none" }}>
              {scenes.map((s) => (
                <div key={s.id} className={"strip" + (s.done ? " done" : "")}>
                  <button className="clr" style={{ background: STRIP[s.ie + "-" + s.dn] }} onClick={() => updScene(s.id, { done: !s.done })} />
                  <div className="bx">
                    <button className={"chk" + (s.done ? " on" : "")} onClick={() => updScene(s.id, { done: !s.done })}>{s.done ? "✓" : ""}</button>
                  </div>
                  <div className="body">
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <input className="mini" style={{ width: 34 }} value={s.num} placeholder="Sc" onChange={(e) => updScene(s.id, { num: e.target.value })} />
                      <select className="mini" value={s.ie} onChange={(e) => updScene(s.id, { ie: e.target.value })}><option>INT</option><option>EXT</option></select>
                      <select className="mini" value={s.dn} onChange={(e) => updScene(s.id, { dn: e.target.value })}><option>DAY</option><option>NIGHT</option></select>
                      <input className="mini" style={{ width: 40 }} value={s.pages} placeholder="pgs" onChange={(e) => updScene(s.id, { pages: e.target.value })} />
                      <input className="mini" type="number" style={{ width: 44 }} value={s.est} onChange={(e) => updScene(s.id, { est: Number(e.target.value) })} />
                      <span className="smallprint f-caps">min</span>
                      <button style={{ marginLeft: "auto", color: "var(--faded)", background: "none", border: 0 }} onClick={() => setScenes((l) => l.filter((x) => x.id !== s.id))}><Trash2 size={13} /></button>
                    </div>
                    <input className="mini f-type" style={{ width: "100%", marginTop: 5, fontSize: 13 }} value={s.slug} placeholder="Slugline" onChange={(e) => updScene(s.id, { slug: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            <button className="act f-caps" style={{ width: "100%", justifyContent: "center", padding: "11px" }} onClick={buildReport}>Issue wrap report</button>
          </>
        )}

        {/* ================= TIME CARDS ================= */}
        {tab === "sheet" && (
          <>
            <Head right={
              <div style={{ display: "flex", gap: 8 }}>
                <button className={"act f-caps" + (armNewDay ? " arm" : "")} onClick={rollNewDay}>{armNewDay ? "Tap again to confirm" : "New Day"}</button>
                <button className="act gold f-caps" onClick={addPerson}><Plus size={12} /> Player</button>
              </div>
            }>{viewDay === 0 ? "Time Cards — Day " + shootDay : "Time Cards — Day " + viewDay + " Archive"}</Head>
            <div className="smallprint f-caps" style={{ marginBottom: 12 }}>Blank wrap = on the clock, ledger runs live · tap ✕ to clear a time</div>

            {archive.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {archive.map((a) => (
                  <button key={a.day} className={"act f-caps" + (viewDay === a.day ? " gold" : "")} style={{ padding: "5px 10px", fontSize: 9 }} onClick={() => setViewDay(a.day)}>Day {a.day}</button>
                ))}
                <button className={"act f-caps" + (viewDay === 0 ? " gold" : "")} style={{ padding: "5px 10px", fontSize: 9 }} onClick={() => setViewDay(0)}>Day {shootDay} · today</button>
              </div>
            )}
            {viewDay !== 0 && (() => {
              const arc = archive.find((a) => a.day === viewDay);
              if (!arc) return null;
              const tc = (x) => (x ? fClk(t2m(x)) : "—");
              const rows = arc.people.map((x) => ({ p: x, r: calcPerson(x, profOf(x.profileId), bands, schoolDay, null) }));
              let dTotal = 0;
              for (const { r } of rows) if (!r.empty) dTotal += r.total;
              return (
                <>
                  <div className="smallprint f-caps" style={{ marginBottom: 10 }}>Archived record — read only · scenes shot: {arc.scenes.filter((x) => x.done).map((x) => x.num).join(", ") || "—"}</div>
                  {rows.map(({ p: pp, r }) => (
                    <div key={pp.id} className="card">
                      <div className="bar f-caps"><span>{pp.name || "—"}</span><span>{pp.dept}</span></div>
                      <div className="inner">
                        <div className="f-type" style={{ fontSize: 12.5 }}>
                          Call {tc(pp.call)} · M1 {tc(pp.m1o)}–{tc(pp.m1i)}{pp.m2o ? " · M2 " + tc(pp.m2o) + "–" + tc(pp.m2i) : ""} · Wrap {tc(pp.wrap)}
                        </div>
                        {!r.empty ? (
                          <div className="f-type" style={{ marginTop: 6, fontSize: 12.5, borderTop: "1px solid var(--edge)", paddingTop: 6 }}>
                            Worked <b>{fHM(r.worked * 60)}</b> · OT <b>{fHM((r.ot1 + r.ot2 + r.ot3) * 60)}</b> · MP <b>{r.meals.ct}</b> · Pay <b style={{ color: "var(--green)" }}>{money2(r.total)}</b>
                          </div>
                        ) : (
                          pp.call ? <div className="smallprint f-caps" style={{ marginTop: 5 }}>Incomplete — no wrap recorded, excluded from totals</div> : null
                        )}
                        {!r.empty && r.warnings.length > 0 && (
                          <div style={{ marginTop: 4 }}>{r.warnings.map((w, i) => <span key={i} className="stamp f-caps">{w}</span>)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="card">
                    <div className="inner f-type" style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700 }}>
                      <span className="f-caps" style={{ letterSpacing: ".14em" }}>Day {arc.day} labor</span>
                      <span style={{ color: "var(--green)" }}>{money2(dTotal)}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {viewDay === 0 && calcs.map(({ p, r }) => {
              const prof = profOf(p.profileId);
              const rest = nextRest(p, r, prof, schoolDay, nAbs);
              const proj = !r.empty && r.sched != null ? calcPerson(p, prof, bands, schoolDay, null) : null;
              const hasOT = !r.empty && r.ot1 + r.ot2 + r.ot3 > 0;
              return (
                <div key={p.id} className="card">
                  <div className="bar f-caps">
                    <span>Player Time Card{r.empty ? "" : r.live ? (r.sched != null ? " — on set" : " — on the clock") : nAbs < r.c ? " — standby" : " — wrapped"}</span>
                    <button style={{ color: "var(--paper)", background: "none", border: 0 }} onClick={() => setPeople((l) => l.filter((x) => x.id !== p.id))}><Trash2 size={13} /></button>
                  </div>
                  <div className="inner">
                    <div className="grid2" style={{ gridTemplateColumns: "2fr 1fr" }}>
                      <Fld label="Name / role"><input className="fld" value={p.name} placeholder="—" onChange={(e) => updPerson(p.id, { name: e.target.value })} /></Fld>
                      <Fld label="Dept"><input className="fld" value={p.dept} onChange={(e) => updPerson(p.id, { dept: e.target.value })} /></Fld>
                    </div>
                    <div className="grid3" style={{ marginTop: 10 }}>
                      <Fld label="Contract">
                        <select className="fld" value={p.profileId} onChange={(e) => updPerson(p.id, { profileId: e.target.value })}>
                          {profiles.map((x) => <option key={x.id} value={x.id}>{x.short}</option>)}
                        </select>
                      </Fld>
                      <NIn label="Day rate $" value={p.rate} onChange={(v) => updPerson(p.id, { rate: v })} />
                      <Fld label="Minor">
                        <select className="fld" value={p.minorBand} onChange={(e) => updPerson(p.id, { minorBand: e.target.value })}>
                          <option value="">Adult</option>
                          {bands.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                      </Fld>
                    </div>
                    <div className="grid2" style={{ marginTop: 10 }}>
                      <TIn label="Call" value={p.call} onChange={(v) => {
                        const mi = prof ? prof.mealInt : 6;
                        updPerson(p.id, v ? { call: v, m1o: addMin(v, mi * 60), m1i: addMin(v, mi * 60 + 60) } : { call: v });
                      }} />
                      <TIn label="Wrap" value={p.wrap} onChange={(v) => updPerson(p.id, { wrap: v })} />
                      <TIn label="Meal 1 out" value={p.m1o} onChange={(v) => updPerson(p.id, { m1o: v })} />
                      <TIn label="Meal 1 in" value={p.m1i} onChange={(v) => updPerson(p.id, { m1i: v })} />
                      <TIn label="Meal 2 out" value={p.m2o} onChange={(v) => updPerson(p.id, { m2o: v })} />
                      <TIn label="Meal 2 in" value={p.m2i} onChange={(v) => updPerson(p.id, { m2i: v })} />
                      <TIn label="Tomorrow's call" value={p.next} onChange={(v) => updPerson(p.id, { next: v })} />
                      <TIn label="Rest until (prev day)" value={p.restUntil || ""} onChange={(v) => updPerson(p.id, { restUntil: v })} />
                    </div>

                    {p.restUntil && (r.empty || (t2m(p.call) != null && nowMin < t2m(p.call))) && (() => {
                      const ruv = t2m(p.restUntil);
                      const cleared = nowMin >= ruv;
                      return (
                        <Ticket side="TURNAROUND" tone={cleared ? "ok" : ""}
                          title={"Rest clears " + fClk(ruv)}
                          big={cleared ? "REST COMPLETE — OK to call" : "Resting — " + countdown(ruv - nowMin) + " to clear"} />
                      );
                    })()}
                    {rest && (
                      <Ticket side="REST CALL" tone={rest.at - nAbs < 30 ? "warn" : ""}
                        title={"Next rest — " + fClk(rest.at)}
                        big={rest.label}
                        sub={"in " + countdown(rest.at - nAbs)} />
                    )}
                    {!r.empty && r.live && r.sched != null && (
                      <div><span className="stamp ink f-caps">On set — sched. wrap {fClk(r.sched)} · billing live</span></div>
                    )}
                    {!r.empty && !r.live && (() => {
                      if (nAbs < r.c) return (
                        <div><span className="stamp ink f-caps">Standby — call {fClk(r.c)}</span></div>
                      );
                      return r.earliestNext != null ? (
                        <div><span className="stamp green f-caps">Resting — clear {fClk(r.earliestNext)} ({prof.turnaround}h)</span></div>
                      ) : (
                        <div><span className="stamp ink f-caps">Wrapped {fClk(r.end)}</span></div>
                      );
                    })()}

                    {!r.empty && (
                      <div className="f-type" style={{ marginTop: 8, fontSize: 12.5, borderTop: "1px solid var(--edge)", paddingTop: 7 }}>
                        Worked <b>{fHM(r.worked * 60)}</b> · OT <b style={hasOT ? { color: "var(--gold2)" } : {}}>{fHM((r.ot1 + r.ot2 + r.ot3) * 60)}</b> · MP <b style={r.meals.ct ? { color: "var(--stamp)" } : {}}>{r.meals.ct}</b> · Pay <b style={{ color: "var(--green)" }}>{money2(r.meter)}</b>{proj && !proj.empty ? <span> · full-day proj. <b>{money(proj.total)}</b></span> : null}
                      </div>
                    )}
                    {!r.empty && r.warnings.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {r.warnings.map((w, i) => <span key={i} className="stamp f-caps">{w}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ================= LEDGER ================= */}
        {tab === "cost" && (
          <>
            <Head>Daily Cost Ledger</Head>
            <div className="grid2" style={{ marginBottom: 14 }}>
              <NIn label="Daily labor target $" value={budgetTarget} onChange={setBudgetTarget} />
              <NIn label="Fringes % (P and H)" value={fringePct} onChange={setFringePct} />
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="ledger">
                  <thead><tr><th>Name</th><th>Base</th><th>OT</th><th>Pen.</th><th>Now</th></tr></thead>
                  <tbody>
                    {calcs.map(({ p, r }) => r.empty ? null : (
                      <tr key={p.id}>
                        <td>{p.name || "—"}</td>
                        <td>{money(p.rate)}</td>
                        <td style={r.otPay ? { color: "var(--gold2)" } : {}}>{money(r.otPay)}</td>
                        <td style={r.meals.amt + r.forcedPen ? { color: "var(--stamp)" } : {}}>{money(r.meals.amt + r.forcedPen)}</td>
                        <td>{r.live ? <span style={{ color: "var(--gold2)" }}>&#9679; </span> : null}{money2(r.meter)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td className="f-caps">Total</td><td>{money(sumBase)}</td><td>{money(sumOT)}</td><td>{money(sumPen + sumForced)}</td><td>{money2(sumMeter)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="inner f-type" style={{ fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700 }}>
                  <span className="f-caps" style={{ letterSpacing: ".14em" }}>On the Meter</span>
                  <span style={{ color: "var(--gold2)" }}>{money2(meterGrand)}</span>
                </div>
                <div className="smallprint f-caps" style={{ marginBottom: 8 }}>live labor cost to this second, incl. fringes</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Fringes {fringePct}%</span><span>{money(fringes)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, marginTop: 6, borderTop: "3px double var(--ink)", paddingTop: 6 }}>
                  <span className="f-caps" style={{ letterSpacing: ".14em" }}>Day Total</span>
                  <span style={{ color: budgetTarget && grand > budgetTarget ? "var(--stamp)" : "var(--green)" }}>{money(grand)}</span>
                </div>
                {budgetTarget > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 8, border: "1px solid var(--ink)", background: "var(--paper2)" }}>
                      <div style={{ height: "100%", width: Math.min(100, (grand / budgetTarget) * 100) + "%", background: grand > budgetTarget ? "var(--stamp)" : "var(--green)" }} />
                    </div>
                    <div className="smallprint f-caps" style={{ marginTop: 4 }}>
                      {grand > budgetTarget ? money(grand - budgetTarget) + " over target" : money(budgetTarget - grand) + " under target"}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button className="act f-caps" style={{ width: "100%", justifyContent: "center", padding: "11px" }} onClick={buildReport}>Issue wrap report</button>
          </>
        )}

        {/* ================= RULES ================= */}
        {tab === "rules" && (
          <>
            <Head>House Rules</Head>
            <div className="smallprint" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Presets seeded from the 2026 SAG-AFTRA TV/Theatrical agreement, the IATSE West Coast Basic Agreement, and CA child-performer limits. Every figure is editable. Planning tool only — confirm against your signed agreements and side letters before payroll.
            </div>
            {profiles.map((pr) => (
              <div key={pr.id} className="card">
                <div className="bar f-caps"><span>{pr.name}</span></div>
                <div className="inner">
                  <div className="grid3">
                    <NIn label="Base hrs" value={pr.base} onChange={(v) => updProfile(pr.id, { base: v || 8 })} />
                    <NIn label="OT x" value={pr.m1} onChange={(v) => updProfile(pr.id, { m1: v || 1.5 })} />
                    <NIn label="2x after (h)" value={pr.t2} onChange={(v) => updProfile(pr.id, { t2: v })} />
                  </div>
                  <div className="grid3" style={{ marginTop: 10 }}>
                    <NIn label="Tier-3 after" value={pr.t3} placeholder="14" onChange={(v) => updProfile(pr.id, { t3: v })} />
                    <NIn label="Tier-3 x" value={pr.m3} onChange={(v) => updProfile(pr.id, { m3: v })} />
                    <NIn label="Meal every (h)" value={pr.mealInt} onChange={(v) => updProfile(pr.id, { mealInt: v || 6 })} />
                  </div>
                  <div className="grid2" style={{ marginTop: 10, gridTemplateColumns: "2fr 1fr" }}>
                    <Fld label="Meal penalties per half-hr ($)">
                      <input className="fld" disabled={pr.penMode === "hourPay"} value={pr.pens.join(", ")}
                        onChange={(e) => updProfile(pr.id, { pens: e.target.value.split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x)) })} />
                    </Fld>
                    <Fld label="Mode">
                      <select className="fld" value={pr.penMode} onChange={(e) => updProfile(pr.id, { penMode: e.target.value })}>
                        <option value="escalating">Escalating</option>
                        <option value="hourPay">1 hr pay</option>
                      </select>
                    </Fld>
                  </div>
                  <div className="grid2" style={{ marginTop: 10 }}>
                    <NIn label="Turnaround (h)" value={pr.turnaround} onChange={(v) => updProfile(pr.id, { turnaround: v || 0 })} />
                    <NIn label="Forced-call cap $" value={pr.forcedCap} onChange={(v) => updProfile(pr.id, { forcedCap: v })} />
                  </div>
                  <div className="smallprint" style={{ marginTop: 8, lineHeight: 1.5 }}>{pr.note}</div>
                </div>
              </div>
            ))}

            <div className="card">
              <div className="bar f-caps">
                <span>Minor Work Limits — CA defaults</span>
                <button className="f-caps" style={{ background: schoolDay ? "var(--gold)" : "none", color: schoolDay ? "var(--maroon2)" : "var(--paper)", border: "1px solid var(--gold)", fontSize: 8.5, letterSpacing: ".14em", padding: "2px 6px" }}
                  onClick={() => setSchoolDay(!schoolDay)}>School day {schoolDay ? "ON" : "OFF"}</button>
              </div>
              <div className="inner">
                {bands.map((b) => (
                  <div key={b.id} className="grid2" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", alignItems: "end", marginBottom: 8 }}>
                    <div className="f-type" style={{ fontSize: 12, paddingBottom: 4 }}>{b.label}</div>
                    <NIn label="Work (sch)" value={b.workS} onChange={(v) => updBand(b.id, { workS: v || 0 })} />
                    <NIn label="Work (non)" value={b.workN} onChange={(v) => updBand(b.id, { workN: v || 0 })} />
                    <NIn label="On set" value={b.set} onChange={(v) => updBand(b.id, { set: v || 0 })} />
                  </div>
                ))}
                <div className="smallprint" style={{ lineHeight: 1.5 }}>
                  Hours exclude schooling, rest and recreation, permits and studio-teacher rules, which still apply. Minors take no overtime.
                </div>
              </div>
            </div>
            <div className="card">
              <div className="bar f-caps"><span>Production Controls</span></div>
              <div className="inner">
                <button className={"act f-caps" + (armMartini ? " arm" : "")} style={{ width: "100%", justifyContent: "center", padding: "11px" }} onClick={martiniReset}>
                  {armMartini ? "Tap again — wipe all days" : "That's a Martini — reset to Day 1"}
                </button>
                <div className="smallprint" style={{ marginTop: 8, lineHeight: 1.5 }}>
                  Wraps the production: clears every archived day and all times, returns to Day 1. Roster, rates and rules are kept.
                </div>
                <button className={"act f-caps" + (armFactory ? " arm" : "")} style={{ width: "100%", justifyContent: "center", padding: "9px", marginTop: 10 }} onClick={factoryReset}>
                  {armFactory ? "Tap again — erase device data" : "Factory reset — erase saved data"}
                </button>
                <div className="smallprint" style={{ marginTop: 8, lineHeight: 1.5 }}>
                  Erases everything autosaved on this device and restores the sample day, roster included.
                </div>
              </div>
            </div>
            <div className="smallprint" style={{ lineHeight: 1.6 }}>
              Meals under 30 min stay on the clock; up to 60 min per meal deducts. First meal runs off call time, second off end of first. NDBs, grace, extensions, 6th/7th day, travel and distant location are not modeled — see your paymaster. Data lives only in this session.
            </div>
          </>
        )}

        <div className="footer">
          <div className="f-script" style={{ fontSize: 20, color: "var(--faded)" }}>that's a wrap</div>
          <div className="smallprint f-caps" style={{ marginTop: 4 }}>Form 1-AD · Property of the Production · All times local</div>
          <div className="smallprint f-caps" style={{ marginTop: 4 }}>{store ? "Autosave: on — data lives in this browser" : "Autosave: off in preview — deploy to enable"}</div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 20, display: "flex", justifyContent: "center", zIndex: 40, pointerEvents: "none" }}>
          <div className="stamp green f-caps" style={{ background: "var(--paper)", boxShadow: "3px 3px 0 rgba(35,29,18,.3)", fontSize: 10.5, padding: "7px 13px", transform: "rotate(-1deg)", margin: 0 }}>{toast}</div>
        </div>
      )}

      {/* ---------- wrap report ---------- */}
      {report != null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(23,19,16,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--paper)", border: "1.5px solid var(--ink)", boxShadow: "4px 4px 0 rgba(0,0,0,.35)" }}>
            <div className="bar f-caps" style={{ background: "var(--maroon)", color: "var(--gold)", padding: "8px 12px", display: "flex", justifyContent: "space-between", letterSpacing: ".22em", fontSize: 10 }}>
              <span>Daily Production Report</span>
              <button style={{ color: "var(--gold)", background: "none", border: 0 }} onClick={() => setReport(null)}><X size={15} /></button>
            </div>
            <pre className="f-type" style={{ flex: 1, overflow: "auto", padding: 14, fontSize: 11, lineHeight: 1.65, whiteSpace: "pre-wrap", userSelect: "all", margin: 0 }}>{report}</pre>
            <div className="smallprint f-caps" style={{ padding: "8px 12px", borderTop: "1px solid var(--edge)" }}>Long-press to select and copy</div>
          </div>
        </div>
      )}

      {curtain && (
        <Curtain key={curtain.run} label={curtain.label} sub={curtain.sub} onDone={() => setCurtain(null)} />
      )}
    </div>
  );
}
