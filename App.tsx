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
  let end = w0, live = false;
  if (end == null) {
    if (liveNowAbs == null) return { empty: true };
    end = Math.max(liveNowAbs, c); live = true;
  }
  const dRaw1 = m1o != null && m1i != null ? Math.min(Math.max(m1i - m1o, 0), 60) : 0;
  const d1 = dRaw1 >= 30 ? dRaw1 : 0;
  const dRaw2 = m2o != null && m2i != null ? Math.min(Math.max(m2i - m2o, 0), 60) : 0;
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

  const meals = mealChecks(c, m1o, m1i, m2o, end, prof, hourly);

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

  const warnings = [];
  const band = p.minorBand ? bands.find((b) => b.id === p.minorBand) : null;
  if (band) {
    const maxW = schoolDay ? band.workS : band.workN;
    if (worked > maxW) warnings.push("MINOR OVER WORK LIMIT — " + fHM(worked * 60) + " vs " + maxW + "h max");
    if (span / 60 > band.set) warnings.push("MINOR OVER ON-SET LIMIT — " + fHM(span) + " vs " + band.set + "h max");
    if (ot1 + ot2 + ot3 > 0) warnings.push("MINOR IN OVERTIME — not permitted");
  }
  if (meals.ct > 0) warnings.push(meals.ct + " MEAL PENALT" + (meals.ct > 1 ? "IES" : "Y") + " — " + money(meals.amt));
  if (forced) warnings.push("FORCED CALL — rest " + fHM(gap) + " under " + prof.turnaround + "h" + (forcedPen ? " (" + money(forcedPen) + ")" : ""));
  if (live && nc != null && prof.turnaround > 0) {
    let ncA = nc;
    while (ncA < end) ncA += 1440;
    if (end > ncA - prof.turnaround * 60) warnings.push("PAST SAFE WRAP — " + fClk(ncA) + " call will be forced");
  }

  const total = rate + otPay + meals.amt + forcedPen;
  return {
    empty: false, live, c, end, span, worked, ded: d1 + d2,
    ot1, ot2, ot3, otPay, hourly, meals, earliestNext, forced, forcedPen,
    warnings, total, band,
  };
}

/* next scheduled rest / release for someone still on the clock */
function nextRest(p, r, prof, schoolDay, nAbs) {
  if (r.empty || !r.live || !prof) return null;
  const cands = [];
  const m1o = t2m(p.m1o), m1i = t2m(p.m1i), m2o = t2m(p.m2o);
  if (m1o == null) {
    cands.push({ at: r.c + prof.mealInt * 60, label: "1st meal break due" });
  } else if (m1i != null && m2o == null) {
    const [, , m1iA] = seqAbs([t2m(p.call), m1o, m1i]);
    cands.push({ at: m1iA + prof.mealInt * 60, label: "2nd meal break due" });
  }
  const assumedDed = r.ded > 0 ? r.ded : (m1o == null ? 60 : 0);
  cands.push({ at: r.c + prof.base * 60 + assumedDed, label: prof.m1 + "x overtime begins" });
  if (r.band) {
    const maxW = schoolDay ? r.band.workS : r.band.workN;
    cands.push({ at: nAbs + (maxW - r.worked) * 60, label: "minor hits " + maxW + "h work limit" });
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
    <input type="time" className="fld" value={value} onChange={(e) => onChange(e.target.value)} />
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

/* ================================================================ */
export default function App() {
  const [tab, setTab] = useState("ops");
  const [profiles, setProfiles] = useState(DEFAULT_PROFILES);
  const [bands, setBands] = useState(DEFAULT_BANDS);
  const [schoolDay, setSchoolDay] = useState(false);
  const [people, setPeople] = useState(SAMPLE_PEOPLE);
  const [scenes, setScenes] = useState(SAMPLE_SCENES);
  const [day, setDay] = useState({ crewCall: "07:00", firstShot: "08:00", schedWrap: "19:00" });
  const [log, setLog] = useState({ shot: "", m1o: "", m1i: "", wrap: "" });
  const [companyProfile, setCompanyProfile] = useState("iatse");
  const [fringePct, setFringePct] = useState(21);
  const [budgetTarget, setBudgetTarget] = useState(15000);
  const [report, setReport] = useState(null);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
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
  let sumBase = 0, sumOT = 0, sumPen = 0, sumForced = 0, sumTotal = 0;
  for (const { p, r } of calcs) {
    if (r.empty) continue;
    sumBase += Number(p.rate) || 0;
    sumOT += r.otPay;
    sumPen += r.meals.amt;
    sumForced += r.forcedPen;
    sumTotal += r.total;
  }
  const fringes = (sumBase + sumOT) * (Number(fringePct) || 0) / 100;
  const grand = sumTotal + fringes;

  /* ---------- actions ---------- */
  const stamp = (f) => setLog((l) => ({ ...l, [f]: nowHHMM(new Date()) }));
  const syncToSheets = () => setPeople((list) => list.map((p) => ({
    ...p,
    call: p.call || day.crewCall,
    m1o: p.m1o || log.m1o,
    m1i: p.m1i || log.m1i,
    wrap: p.wrap || log.wrap,
  })));
  const addPerson = () => setPeople((l) => [...l, { id: nid(), name: "", dept: "", profileId: "iatse", rate: 500, minorBand: "", call: day.crewCall, m1o: "", m1i: "", m2o: "", m2i: "", wrap: "", next: "" }]);
  const addScene = () => setScenes((l) => [...l, { id: nid(), num: "", slug: "", ie: "INT", dn: "DAY", pages: "", est: 45, done: false }]);

  const buildReport = () => {
    const L = [];
    L.push("DAILY PRODUCTION REPORT — TIME AND COST");
    L.push("Date " + now.toLocaleDateString() + "   Issued " + now.toLocaleTimeString());
    L.push("");
    L.push("Crew call " + fClk(ca) + " / 1st shot " + (log.shot || "—") + " / Meal " + (log.m1o || "—") + "-" + (log.m1i || "—") + " / Wrap " + (log.wrap || "—"));
    L.push("Scenes completed: " + (scenes.filter((s) => s.done).map((s) => s.num).join(", ") || "none"));
    L.push("Scenes owed: " + (remaining.map((s) => s.num).join(", ") || "none"));
    L.push("");
    L.push("NAME                        HOURS  OT     MP     PAY");
    for (const { p, r } of calcs) {
      if (r.empty) continue;
      L.push(
        (p.name || "—").slice(0, 26).padEnd(28) +
        fHM(r.worked * 60).padEnd(7) +
        fHM((r.ot1 + r.ot2 + r.ot3) * 60).padEnd(7) +
        String(r.meals.ct).padEnd(3) + money(r.meals.amt).padEnd(8) +
        money(r.total)
      );
      for (const w of r.warnings) L.push("   ** " + w);
    }
    L.push("");
    L.push("Wages " + money(sumBase) + " / OT " + money(sumOT) + " / Meal pen " + money(sumPen) + " / Forced calls " + money(sumForced));
    L.push("Fringes " + fringePct + "% " + money(fringes) + " / GRAND TOTAL " + money(grand) + (budgetTarget ? " vs target " + money(budgetTarget) : ""));
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
    <div className="mtn">
      <style>{CSS}</style>

      {/* ---------- masthead ---------- */}
      <div style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div className="film" />
        <div className="masthead">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="f-deco mast-title"><span className="mast-star">★ </span>MARTINI<span className="mast-star"> ★</span></div>
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
            <Head>Today's Schedule</Head>
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
            <Head right={<button className="act gold f-caps" onClick={addPerson}><Plus size={12} /> Player</button>}>Time Cards</Head>
            <div className="smallprint f-caps" style={{ marginBottom: 12 }}>Leave wrap blank = still on the clock, reminders run live</div>

            {calcs.map(({ p, r }) => {
              const prof = profOf(p.profileId);
              const rest = nextRest(p, r, prof, schoolDay, nAbs);
              const hasOT = !r.empty && r.ot1 + r.ot2 + r.ot3 > 0;
              return (
                <div key={p.id} className="card">
                  <div className="bar f-caps">
                    <span>Player Time Card{r.live ? " — on the clock" : ""}</span>
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
                      <TIn label="Call" value={p.call} onChange={(v) => updPerson(p.id, { call: v })} />
                      <TIn label="Wrap" value={p.wrap} onChange={(v) => updPerson(p.id, { wrap: v })} />
                      <TIn label="Meal 1 out" value={p.m1o} onChange={(v) => updPerson(p.id, { m1o: v })} />
                      <TIn label="Meal 1 in" value={p.m1i} onChange={(v) => updPerson(p.id, { m1i: v })} />
                      <TIn label="Meal 2 out" value={p.m2o} onChange={(v) => updPerson(p.id, { m2o: v })} />
                      <TIn label="Meal 2 in" value={p.m2i} onChange={(v) => updPerson(p.id, { m2i: v })} />
                      <TIn label="Tomorrow's call" value={p.next} onChange={(v) => updPerson(p.id, { next: v })} />
                      <Fld label="Rest clear">
                        <div className="fld f-type" style={{ borderBottomStyle: "dashed" }}>{r.empty ? "—" : fClk(r.earliestNext)}</div>
                      </Fld>
                    </div>

                    {rest && (
                      <Ticket side="REST CALL" tone={rest.at - nAbs < 30 ? "warn" : ""}
                        title={"Next rest — " + fClk(rest.at)}
                        big={rest.label}
                        sub={"in " + countdown(rest.at - nAbs)} />
                    )}
                    {!r.empty && !r.live && r.earliestNext != null && (
                      <div><span className="stamp green f-caps">Resting — clear {fClk(r.earliestNext)} ({prof.turnaround}h)</span></div>
                    )}

                    {!r.empty && (
                      <div className="f-type" style={{ marginTop: 8, fontSize: 12.5, borderTop: "1px solid var(--edge)", paddingTop: 7 }}>
                        Worked <b>{fHM(r.worked * 60)}</b> · OT <b style={hasOT ? { color: "var(--gold2)" } : {}}>{fHM((r.ot1 + r.ot2 + r.ot3) * 60)}</b> · MP <b style={r.meals.ct ? { color: "var(--stamp)" } : {}}>{r.meals.ct}</b> · Pay <b style={{ color: "var(--green)" }}>{money(r.total)}</b>
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
                  <thead><tr><th>Name</th><th>Base</th><th>OT</th><th>Pen.</th><th>Total</th></tr></thead>
                  <tbody>
                    {calcs.map(({ p, r }) => r.empty ? null : (
                      <tr key={p.id}>
                        <td>{p.name || "—"}</td>
                        <td>{money(p.rate)}</td>
                        <td style={r.otPay ? { color: "var(--gold2)" } : {}}>{money(r.otPay)}</td>
                        <td style={r.meals.amt + r.forcedPen ? { color: "var(--stamp)" } : {}}>{money(r.meals.amt + r.forcedPen)}</td>
                        <td>{money(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td className="f-caps">Total</td><td>{money(sumBase)}</td><td>{money(sumOT)}</td><td>{money(sumPen + sumForced)}</td><td>{money(sumTotal)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="inner f-type" style={{ fontSize: 13 }}>
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
            <div className="smallprint" style={{ lineHeight: 1.6 }}>
              Meals under 30 min stay on the clock; up to 60 min per meal deducts. First meal runs off call time, second off end of first. NDBs, grace, extensions, 6th/7th day, travel and distant location are not modeled — see your paymaster. Data lives only in this session.
            </div>
          </>
        )}

        <div className="footer">
          <div className="f-script" style={{ fontSize: 20, color: "var(--faded)" }}>that's a wrap</div>
          <div className="smallprint f-caps" style={{ marginTop: 4 }}>Form 1-AD · Property of the Production · All times local</div>
        </div>
      </div>

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
    </div>
  );
}
