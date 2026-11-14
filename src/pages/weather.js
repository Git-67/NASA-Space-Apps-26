// Sol Stroll: Weather tab. Live fetch of the REMS feed; offline, the copy stored with the site
// (data/processed/weather.json, the same feed prepared by scripts/prepare_weather.py).
import { fromColumns } from "../lib/columns.js";
import { formatMarsClock } from "../lib/mars.js";

/** Rename the prepared weather records to the feed's field names, which the charts below read. */
const fromBundle = (j) => fromColumns(j?.records).map((r) => ({
  sol: r.sol, terrestrial_date: r.earthDate, ls: r.ls,
  min_temp: r.airMinC, max_temp: r.airMaxC, min_gts_temp: r.groundMinC, max_gts_temp: r.groundMaxC,
  pressure: r.pressurePa, local_uv_irradiance_index: r.uv,
  sunrise: r.sunriseMin === null ? null : formatMarsClock(r.sunriseMin),
  sunset: r.sunsetMin === null ? null : formatMarsClock(r.sunsetMin),
}));
// UNVERIFIED: field names (sol, terrestrial_date, ls, min_temp, max_temp, min_gts_temp,
// max_gts_temp, pressure, abs_humidity, wind_speed, atmo_opacity, season, sunrise, sunset)
// and CORS were written from memory and could not be tested against the live feed.
const SOURCES = [
  {
    name: "NASA Mars weather feed (REMS, Centro de Astrobiología)",
    url: "https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json",
    pick: (j) => (j && Array.isArray(j.soles) ? j.soles : []),
  },
  {
    name: "MAAS2 (community mirror of REMS, latest sol only)",
    url: "https://api.maas2.apollorion.com/",
    pick: (j) => (j && j.sol !== undefined ? [j] : []),
  },
  {
    name: "Copy stored with the site (offline)",
    url: "data/processed/weather.json",
    pick: fromBundle,
    isLocal: true,
  },
];

const TABS = [
  { id: "air", label: "Air temperature", unit: "°C",
    series: [{ label: "High", key: "max_temp" }, { label: "Low", key: "min_temp", low: true }] },
  { id: "ground", label: "Ground temperature", unit: "°C",
    series: [{ label: "High", key: "max_gts_temp" }, { label: "Low", key: "min_gts_temp", low: true }] },
  { id: "pressure", label: "Pressure", unit: "Pa",
    series: [{ label: "Pressure", key: "pressure" }] },
];
const RANGES = [3, 7, 14, 30];   // in sols; the feed has one reading per sol
const DEFAULT_RANGE = 7;

const BIN = 15;                  // degrees of Ls per season bin
const MARS_YEAR_DAYS = 686.98;   // Earth days in a Mars year
const MIN_SOLS_PER_CELL = 3;

// ---- OUR CHOICES (not NASA thresholds). Every cutoff used by "At a glance" lives here.
const UNUSUAL_PCT = 5;      // "unusual" = in the outer 5% at either end of past sols for this season
const MIN_HISTORY = 10;     // fewest past sols needed before we compare against history
const FLARE_DAYS = 3;       // a flare counts as active for this many days...
const FLARE_CLASSES = "MX"; // ...if it is class M or X (the standard "major" classes)
const SEP_DAYS = 3;         // a solar particle event counts as active for this many days

// ---- NASA DONKI (space weather). A key in browser code is public. DEMO_KEY is rate limited.
const DONKI_KEY = "DEMO_KEY";
const DONKI = "https://api.nasa.gov/DONKI/";

const num = (v) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
const r1 = (v) => Math.round(v * 10) / 10;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function fetchData() {
  const errors = [];
  // Offline (no link, or chosen in the top bar; see src/lib/connection.js): skip the live sources.
  const isOffline = document.documentElement.dataset.connection === "offline";
  for (const s of SOURCES.filter((source) => source.isLocal || !isOffline)) {
    try {
      const res = await fetch(s.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const soles = s.pick(await res.json())
        .filter((x) => num(x.sol) !== null)
        .sort((a, b) => Number(a.sol) - Number(b.sol));
      if (!soles.length) throw new Error("no sols in response");
      return { soles, source: s.name };
    } catch (e) {
      errors.push(`${s.name}: ${e.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

// ---------- DOM helpers (no innerHTML: the feed is third-party)
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
};
const card = (title) => {
  const c = el("section", "card");
  c.append(el("h2", "card-title", title));
  return c;
};
function wireArrows(btns, select) {
  btns.forEach((b, i) =>
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
      next.focus();
      select(next);
    })
  );
}

// ---------- Chart
function buildChart(soles, latestSol, tab, n) {
  const lo = latestSol - n + 1;
  const win = soles.filter((s) => Number(s.sol) >= lo);
  const data = tab.series.map((s) => ({
    s,
    p: win
      .map((x) => ({ sol: Number(x.sol), v: num(x[s.key]), date: x.terrestrial_date }))
      .filter((q) => q.v !== null),
  }));
  const all = data.flatMap((d) => d.p.map((q) => q.v));
  const wrap = el("div");
  if (!all.length) {
    wrap.append(el("p", "basis", `No ${tab.label.toLowerCase()} readings in the last ${n} sols.`));
    return wrap;
  }

  // latest reading per series within this view
  wrap.append(el("p", "",
    data.filter((d) => d.p.length)
      .map((d) => { const q = d.p[d.p.length - 1]; return `${d.s.label} ${r1(q.v)} ${tab.unit} (sol ${q.sol})`; })
      .join(" · ")));

  const W = 320, H = 190, L = 46, R = 12, T = 22, B = 30;
  let yMin = Math.min(...all), yMax = Math.max(...all);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad; yMax += pad;
  const X = (sol) => L + ((sol - lo) / (latestSol - lo)) * (W - L - R);
  const Y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const fmt = (v) => (yMax - yMin < 10 ? v.toFixed(1) : String(Math.round(v)));

  const desc = data.filter((d) => d.p.length)
    .map((d) => `${d.s.label} from ${r1(Math.min(...d.p.map((q) => q.v)))} to ${r1(Math.max(...d.p.map((q) => q.v)))} ${tab.unit}`)
    .join("; ");
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": `${tab.label}, sols ${lo} to ${latestSol}. ${desc}.` });

  for (const v of [yMin + pad, (yMin + yMax) / 2, yMax - pad]) {
    svg.append(svgEl("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "currentColor", "stroke-opacity": 0.2 }));
    svg.append(svgEl("text", { x: L - 5, y: Y(v) + 3, "text-anchor": "end", "font-size": 10, fill: "currentColor" }, fmt(v)));
  }
  svg.append(svgEl("text", { x: L, y: 12, "font-size": 10, fill: "currentColor" }, tab.unit));
  [[lo, "start"], [Math.round((lo + latestSol) / 2), "middle"], [latestSol, "end"]].forEach(([sol, anchor]) =>
    svg.append(svgEl("text", { x: X(sol), y: H - 8, "text-anchor": anchor, "font-size": 10, fill: "currentColor" }, `sol ${sol}`)));

  for (const { s, p } of data) {
    let d = "", prev = null;
    for (const q of p) {
      d += (prev && q.sol - prev.sol === 1 ? "L" : "M") + `${X(q.sol).toFixed(1)} ${Y(q.v).toFixed(1)} `;
      prev = q;
    }
    svg.append(svgEl("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 2,
      "stroke-dasharray": s.low ? "4 3" : "none" }));
    for (const q of p) {
      const dot = svgEl("circle", { cx: X(q.sol), cy: Y(q.v), r: 3, stroke: "currentColor", "stroke-width": 1.5,
        fill: s.low ? "none" : "currentColor" });
      dot.append(svgEl("title", {}, `Sol ${q.sol}${q.date ? ` (${q.date})` : ""}: ${s.label} ${r1(q.v)} ${tab.unit}`));
      svg.append(dot);
    }
  }
  wrap.append(svg);
  wrap.append(el("p", "data-source-caption", tab.series.length === 2
    ? "Solid line with filled dots: daily high. Dashed line with open dots: daily low. Gaps are sols the feed has no reading for."
    : "One reading per sol. Gaps are sols the feed has no reading for."));
  return wrap;
}

function weatherCard(soles, source) {
  const c = card("Weather at Gale Crater");
  const latest = soles[soles.length - 1];
  const latestSol = Number(latest.sol);
  c.append(el("p", "basis",
    `Latest reported sol: ${latestSol} (Earth date ${latest.terrestrial_date ?? "unknown"}). ` +
    "This is the newest data published, not live conditions."));

  // only tabs the feed actually has data for (last 30 sols)
  const avail = TABS.filter((t) =>
    t.series.some((s) => soles.some((x) => latestSol - Number(x.sol) < 30 && num(x[s.key]) !== null)));

  if (avail.length) {
    let tab = avail[0], n = DEFAULT_RANGE;
    const tabBar = el("div", "subtabs");
    tabBar.setAttribute("role", "tablist");
    tabBar.setAttribute("aria-label", "Weather measurement");
    const tabBtns = avail.map((t) => {
      const b = el("button", "subtab", t.label);
      b.type = "button"; b.id = `wx-tab-${t.id}`; b.dataset.id = t.id;
      b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "wx-chart-panel");
      tabBar.append(b);
      return b;
    });

    const rangeBar = el("div", "wx-range");
    rangeBar.setAttribute("role", "group");
    rangeBar.setAttribute("aria-label", "Time span shown");
    rangeBar.append(el("span", "wx-range-label", "Show last"));
    const rangeBtns = RANGES.map((r) => {
      const b = el("button", "subtab", `${r} sols`);
      b.type = "button"; b.dataset.n = r;
      rangeBar.append(b);
      return b;
    });

    const panel = el("div", "wx-chart");
    panel.id = "wx-chart-panel";
    panel.setAttribute("role", "tabpanel");

    const draw = () => {
      tabBtns.forEach((b) => {
        const on = b.dataset.id === tab.id;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      rangeBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.n) === n)));
      panel.setAttribute("aria-labelledby", `wx-tab-${tab.id}`);
      panel.replaceChildren(buildChart(soles, latestSol, tab, n));
    };
    const pickTab = (b) => { tab = avail.find((t) => t.id === b.dataset.id); draw(); };
    tabBtns.forEach((b) => b.addEventListener("click", () => pickTab(b)));
    wireArrows(tabBtns, pickTab);
    rangeBtns.forEach((b) => b.addEventListener("click", () => { n = Number(b.dataset.n); draw(); }));

    c.append(tabBar, rangeBar, panel);
    c.append(el("p", "data-source-caption",
      "1 sol is one Martian day, about 24 h 39 min. The feed gives one reading per sol, " +
      "so nothing shorter than a sol can be shown."));
    draw();
  } else {
    c.append(el("p", "basis", "The feed has no temperature or pressure readings for the last 30 sols."));
  }

  // facts below the chart: only what the feed gave for the latest sol
  const facts = [
    ["Sky", latest.atmo_opacity || null],
    ["Season", latest.season || null],
    ["Sunrise / sunset (local)", latest.sunrise && latest.sunset ? `${latest.sunrise} / ${latest.sunset}` : null],
    ["Humidity", num(latest.abs_humidity)],
    ["Wind speed", num(latest.wind_speed) === null ? null : `${num(latest.wind_speed)} m/s`],
  ].filter(([, v]) => v !== null);
  if (facts.length) {
    const dl = el("dl", "wx-list");
    for (const [k, v] of facts) dl.append(el("dt", "", k), el("dd", "", String(v)));
    c.append(dl);
  }
  c.append(el("p", "data-source-caption",
    `Source: ${source}. Outreach data from the provider, not science-grade. ` +
    "Readings are taken at the rover, so its heat and shade affect them."));
  return c;
}

// ---------- Dust watch: inferred from how narrow the daily temperature range is for the season
function analyse(soles) {
  const rows = [];
  let year = 0, prevLs = null;
  for (const s of soles) {
    const ls = num(s.ls);
    if (ls === null) continue;
    if (prevLs !== null && ls < prevLs - 180) year++;   // Ls wrapped past 360: new Mars year
    prevLs = ls;
    const mn = num(s.min_temp), mx = num(s.max_temp);
    if (mn === null || mx === null) continue;
    rows.push({ sol: Number(s.sol), date: s.terrestrial_date, ls, year,
                range: mx - mn, bin: Math.floor(ls / BIN) });
  }
  if (rows.length < 50) return null;

  const byBin = new Map();
  rows.forEach((r) => (byBin.get(r.bin) || byBin.set(r.bin, []).get(r.bin)).push(r.range));
  const binMedian = new Map([...byBin].map(([b, v]) => [b, median(v)]));
  rows.forEach((r) => (r.drop = binMedian.get(r.bin) - r.range)); // + = narrower than usual

  const cells = new Map();
  for (const r of rows) {
    const k = `${r.year}:${r.bin}`;
    (cells.get(k) || cells.set(k, { year: r.year, bin: r.bin, rows: [] }).get(k)).rows.push(r);
  }
  const ranked = [...cells.values()]
    .filter((c) => c.rows.length >= MIN_SOLS_PER_CELL)
    .map((c) => ({ ...c, mean: c.rows.reduce((a, r) => a + r.drop, 0) / c.rows.length }))
    .filter((c) => c.mean > 0)   // only seasons that were narrower than usual
    .sort((a, b) => b.mean - a.mean);

  const events = [];
  for (const c of ranked) {  // skip cells next to an event already taken in the same year
    if (events.some((e) => e.year === c.year && Math.abs(e.bin - c.bin) <= 1)) continue;
    events.push(c);
    if (events.length === 3) break;
  }
  if (!events.length) return null;
  const recent = rows.slice(-10);
  return {
    events, rows, years: new Set(rows.map((r) => r.year)).size,
    recentDrop: recent.reduce((a, r) => a + r.drop, 0) / recent.length,
    recentSols: [recent[0].sol, recent[recent.length - 1].sol],
  };
}

// Earth-date windows when Mars next reaches the seasons of the biggest departures
function watchWindows(a) {
  const bins = [...new Set(a.events.map((e) => e.bin))].sort((x, y) => x - y);
  const groups = [];
  for (const b of bins) {
    const g = groups[groups.length - 1];
    if (g && b - g.hi <= 1) g.hi = b; else groups.push({ lo: b, hi: b });
  }
  const step = MARS_YEAR_DAYS * 864e5, out = [];
  for (const g of groups) {
    const inG = a.rows.filter((r) => r.bin >= g.lo && r.bin <= g.hi);
    const count = new Map();
    inG.forEach((r) => count.set(r.year, (count.get(r.year) || 0) + 1));
    // use the Mars year that covers this season best (latest wins a tie)
    let yr = null;
    for (const [y, k] of count) if (yr === null || k > count.get(yr) || (k === count.get(yr) && y > yr)) yr = y;
    const ds = inG.filter((r) => r.year === yr).map((r) => Date.parse(r.date)).filter((t) => !Number.isNaN(t));
    if (!ds.length) continue;
    let start = Math.min(...ds), end = Math.max(...ds) + 864e5;
    while (end < Date.now()) { start += step; end += step; }
    out.push({ lsFrom: g.lo * BIN, lsTo: (g.hi + 1) * BIN, start, end });
  }
  return out.sort((x, y) => x.start - y.start);
}

function dustCard(soles, source) {
  const c = card("Dust watch");
  const a = analyse(soles);
  if (!a) {
    c.append(el("p", "basis",
      "Not available: this needs the full history with Ls (season angle) and temperatures, " +
      `which ${source} did not provide.`));
    return c;
  }
  c.append(el("p", "basis",
    "The feed has no dust measurement. This is inferred: airborne dust narrows the daily " +
    "temperature range, so we compare each sol's range with the usual range for the same " +
    `time of year across ${a.years} Mars years of data. It is an inference, not a detection.`));
  c.append(el("p", "", `Sols ${a.recentSols[0]} to ${a.recentSols[1]} (newest with data): ` +
    `daily range ${Math.abs(a.recentDrop).toFixed(1)} °C ${a.recentDrop >= 0 ? "narrower" : "wider"} than usual for the season.`));

  c.append(el("h3", "", "Dates to watch"));
  const wins = watchWindows(a);
  if (wins.length) {
    const ul = el("ul");
    for (const w of wins) {
      const now = w.start <= Date.now();
      ul.append(el("li", "",
        `${now ? "Under way: " : ""}${fmtDate(w.start)} to ${fmtDate(w.end)} (Ls ${w.lsFrom}° to ${w.lsTo}°, approximate)`));
    }
    c.append(ul);
  } else {
    c.append(el("p", "basis", "Not available: dates are missing from the feed."));
  }

  c.append(el("h3", "", "Why these dates"));
  const ul = el("ul");
  for (const e of a.events) {
    const first = e.rows[0], last = e.rows[e.rows.length - 1];
    ul.append(el("li", "",
      `Mars year ${e.year + 1} of the record, Ls ${e.bin * BIN}° to ${(e.bin + 1) * BIN}°, ` +
      `sols ${first.sol} to ${last.sol} (${first.date ?? "?"} to ${last.date ?? "?"}): ` +
      `range ${e.mean.toFixed(1)} °C narrower than usual.`));
  }
  c.append(ul);

  c.append(el("p", "basis",
    "We can't predict the date of a sandstorm, so keep a lookout for these dates. " +
    "They are the times of year when the daily temperature range narrowed most in the past, not forecasts."));
  return c;
}


// ---------- At a glance
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
async function donki(path, days) {
  const url = `${DONKI}${path}?startDate=${iso(Date.now() - days * 864e5)}&endDate=${iso(Date.now())}&api_key=${DONKI_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const t = await res.text();
  return t.trim() ? JSON.parse(t) : [];   // DONKI sends an empty body when there are no events
}

// share of past sols, at the same time of year, that were below this sol's value
function percentile(soles, latest, fn) {
  const ls = num(latest.ls), v = fn(latest);
  if (ls === null || v === null) return null;
  const bin = Math.floor(ls / BIN), peers = [];
  for (const x of soles) {
    if (x === latest) continue;
    const l = num(x.ls);
    if (l === null || Math.floor(l / BIN) !== bin) continue;
    const w = fn(x);
    if (w !== null) peers.push(w);
  }
  if (peers.length < MIN_HISTORY) return null;
  return 100 * peers.filter((w) => w < v).length / peers.length;
}

const BADGE = { ok: "✓", watch: "!", nodata: "–", info: "i" };
const tile = (label, value, note, status, badge) => ({ label, value, note, status, badge });
const NO = (label, why) => tile(label, "Not measured", why, "nodata", "Not measured");

function compareTile(label, soles, latest, fn, value, low, high) {
  const pct = percentile(soles, latest, fn);
  if (pct === null) return tile(label, value, "Not enough history for this season to compare.", "info", "No comparison");
  if (pct <= UNUSUAL_PCT) return tile(label, value, `${low} than ${Math.round(100 - pct)}% of past sols at this time of year.`, "watch", "Unusual");
  if (pct >= 100 - UNUSUAL_PCT) return tile(label, value, `${high} than ${Math.round(pct)}% of past sols at this time of year.`, "watch", "Unusual");
  return tile(label, value, "Within the usual range for this time of year.", "ok", "Usual");
}

function buildTiles(soles, dk) {
  const latest = soles[soles.length - 1];
  const mn = num(latest.min_temp), mx = num(latest.max_temp), pr = num(latest.pressure);
  const mean = (s) => (num(s.min_temp) === null || num(s.max_temp) === null ? null : (num(s.min_temp) + num(s.max_temp)) / 2);
  const rangeOf = (s) => (num(s.min_temp) === null || num(s.max_temp) === null ? null : num(s.max_temp) - num(s.min_temp));
  const tiles = [];

  tiles.push(mean(latest) === null ? NO("Temperature", "The feed gave no air temperature for the latest sol.")
    : compareTile("Temperature", soles, latest, mean, `${r1(mn)} to ${r1(mx)} °C`, "Colder", "Warmer"));
  tiles.push(pr === null ? NO("Pressure", "The feed gave no pressure for the latest sol.")
    : compareTile("Pressure", soles, latest, (s) => num(s.pressure), `${r1(pr)} Pa`, "Lower", "Higher"));

  const ws = num(latest.wind_speed), wd = latest.wind_direction && !/^-+$/.test(String(latest.wind_direction)) ? String(latest.wind_direction) : null;
  tiles.push(ws === null && wd === null ? NO("Wind", "The feed gave no wind speed or direction. This sensor often has no data.")
    : tile("Wind", `${ws === null ? "speed not given" : `${r1(ws)} m/s`}${wd ? `, direction ${wd}` : ""}`, "As reported by the feed for the latest sol.", "info", "Info"));

  tiles.push(latest.local_uv_irradiance_index
    ? tile("Sunlight (UV)", String(latest.local_uv_irradiance_index).replace(/_/g, " "), "Ground UV level as labelled by the feed. Not the same as radiation dose.", "info", "Info")
    : NO("Sunlight (UV)", "The feed gave no UV level for the latest sol."));

  const hm = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
  const up = hm(latest.sunrise), down = hm(latest.sunset);
  tiles.push(up !== null && down !== null && down > up
    ? tile("Daylight", `Sun up ${latest.sunrise} to ${latest.sunset}`, `${r1(down - up)} h of daylight, Mars local time, on the latest sol.`, "info", "Info")
    : NO("Daylight", "The feed gave no sunrise and sunset for the latest sol."));

  const bad = (r, label, why) => ({ failed: true, ...NO(label, `NASA DONKI could not be reached (${r.reason && r.reason.message}). ${why}`) });
  const [fl, cme, sep] = dk;
  if (fl.status === "rejected") tiles.push(bad(fl, "Solar flares", "Needs the DONKI service."));
  else {
    const rank = (c) => ("ABCMX".indexOf(String(c)[0]) + 1) * 1000 + (parseFloat(String(c).slice(1)) || 0);
    const list = (fl.value || []).filter((f) => f.classType);
    const top = list.sort((a, b) => rank(b.classType) - rank(a.classType))[0];
    const recentMajor = list.filter((f) => FLARE_CLASSES.includes(String(f.classType)[0]) &&
      Date.now() - Date.parse(f.peakTime || f.beginTime) <= FLARE_DAYS * 864e5);
    tiles.push(recentMajor.length
      ? tile("Solar flares", `${recentMajor.length} major in ${FLARE_DAYS} days, strongest ${top.classType}`, "Seen from Earth. Mars may not face the flare.", "watch", "Active")
      : tile("Solar flares", top ? `Strongest in 7 days: ${top.classType}` : "None in 7 days", "Seen from Earth. Mars may not face the flare.", "ok", "Quiet"));
  }
  if (cme.status === "rejected") tiles.push(bad(cme, "Solar storms (CMEs)", "Needs the DONKI service."));
  else {
    const hits = [];
    for (const a of cme.value || []) for (const e of a.enlilList || []) for (const i of e.impactList || [])
      if (/mars/i.test(i.location || "")) { const t = Date.parse(i.arrivalTime); if (!Number.isNaN(t) && t >= Date.now() - 864e5) hits.push(t); }
    tiles.push(hits.length
      ? tile("Solar storms (CMEs)", `Forecast to reach Mars ${fmtDate(Math.min(...hits))}`, "DONKI model forecast, not a measurement at Mars.", "watch", "Forecast")
      : tile("Solar storms (CMEs)", "None forecast for Mars", "In DONKI's model results. Not every CME is modelled.", "ok", "None forecast"));
  }
  if (sep.status === "rejected") tiles.push(bad(sep, "Particles and cosmic rays", "Needs the DONKI service."));
  else {
    const recent = (sep.value || []).filter((e) => Date.now() - Date.parse(e.eventTime) <= SEP_DAYS * 864e5);
    tiles.push(recent.length
      ? tile("Particles and cosmic rays", `Solar particle event in the last ${SEP_DAYS} days`, "Detected near Earth or by spacecraft. Deep-space cosmic rays are not measured live here.", "watch", "Active")
      : tile("Particles and cosmic rays", `No solar particle event in ${SEP_DAYS} days`, "Detected near Earth or by spacecraft. Deep-space cosmic rays are not measured live here.", "ok", "Quiet"));
  }

  const a = analyse(soles), wins = a ? watchWindows(a) : [];
  const inWin = wins.find((w) => w.start <= Date.now() && Date.now() <= w.end);
  const next = wins.find((w) => w.start > Date.now());
  const rp = percentile(soles, latest, rangeOf);
  if (!a && rp === null) tiles.push(NO("Dust storms", "Not enough season history to infer dust."));
  else {
    const narrow = rp !== null && rp <= UNUSUAL_PCT;
    const base = inWin ? `Watch dates now, until ${fmtDate(inWin.end)}` : narrow ? "Daily range unusually narrow" : "Outside watch dates";
    tiles.push(tile("Dust storms",
      `${base}${!inWin && next ? `. Next: ${fmtDate(next.start)} to ${fmtDate(next.end)}` : ""}`,
      "Inferred from the daily temperature range, not measured. We can't predict storms.",
      inWin || narrow ? "watch" : "info", inWin || narrow ? "Watch" : "Info"));
  }

  tiles.push(NO("Visibility", "No visibility measurement exists in the feed."));
  tiles.push(latest.atmo_opacity
    ? tile("Dust in the air", String(latest.atmo_opacity), "A coarse sky label from the feed. It is not an optical-depth measurement.", "info", "Info")
    : NO("Dust in the air", "The feed gave no sky label for the latest sol."));
  return tiles;
}

function asOf(d) {
  const t = Date.parse(d);
  if (Number.isNaN(t)) return "date unknown";
  const days = Math.floor((Date.now() - t) / 864e5);
  return `${fmtDate(t)}${days > 0 ? `, ${days} days ago` : ""}`;
}

function glanceCard(soles, dk) {
  const c = card("At a glance");
  const latest = soles[soles.length - 1];
  const all = buildTiles(soles, dk);
  const hidden = all.filter((t) => t.status === "nodata");            // nothing measured: not shown
  const rank = { watch: 0, ok: 1, info: 2 };
  const shown = all.filter((t) => t.status !== "nodata").sort((x, y) => rank[x.status] - rank[y.status]);
  const watch = shown.filter((t) => t.status === "watch");
  const okN = shown.filter((t) => t.status === "ok").length;

  const failed = all.filter((t) => t.failed);   // a service error, unlike a sensor that never reports
  const [status, head, sub] = watch.length
    ? ["watch", "Check before you go", `Needs a look: ${watch.map((t) => t.label).join(", ")}.${failed.length ? ` Could not check: ${failed.map((t) => t.label).join(", ")}.` : ""}`]
    : failed.length ? ["info", "Some checks could not run", `Could not check: ${failed.map((t) => t.label).join(", ")}.`]
    : okN ? ["ok", "Nothing unusual found", "In the data available. Not a safety clearance."]
    : ["info", "Not enough data", "Too little data to compare against."];
  const banner = el("div", "glance-banner");
  banner.dataset.status = status;
  banner.append(el("p", "glance-head", `${BADGE[status]} ${head}`), el("p", "glance-sub", sub),
    el("p", "glance-asof", `Weather as of sol ${latest.sol} (${asOf(latest.terrestrial_date)}).`));
  c.append(banner);

  const list = el("ul", "glance-list");
  for (const t of shown) {
    const li = el("li", "glance-row");
    li.dataset.status = t.status;
    li.title = t.note;
    li.append(el("span", "glance-label", t.label), el("span", "glance-value", t.value));
    if (t.status !== "info") li.append(el("span", "glance-badge", `${BADGE[t.status]} ${t.badge}`));
    list.append(li);
  }
  c.append(list);

  const more = el("details", "glance-more");
  more.append(el("summary", "", "How to read this"));
  const ul = el("ul");
  for (const t of shown) ul.append(el("li", "", `${t.label}: ${t.note}`));
  more.append(ul);
  more.append(el("p", "basis",
    `"Unusual" means outside the middle ${100 - 2 * UNUSUAL_PCT}% of past sols at the same time of year. That cutoff is our choice, not a NASA limit. ` +
    "NASA has set no go / no-go limits for this site, so this summary never says go or no-go."));
  for (const t of failed) more.append(el("p", "basis", `${t.label}: ${t.note}`));
  const quiet = hidden.filter((t) => !t.failed);
  if (quiet.length) more.append(el("p", "basis", `Not shown because no data was available: ${quiet.map((t) => t.label).join(", ")}.`));
  c.append(more);
  return c;
}

// ---------- Page wiring
function renderError(panel, err) {
  const c = card("Weather at Gale Crater");
  c.append(el("p", "basis", `Could not load weather. ${err.message}`));
  const retry = el("button", "button-secondary", "Retry");
  retry.type = "button";
  retry.addEventListener("click", () => load(panel));
  c.append(retry);
  panel.replaceChildren(c);
}

async function load(panel) {
  panel.replaceChildren(el("p", "basis", "Loading weather…"));
  try {
    const donkiP = Promise.allSettled([donki("FLR", 7), donki("CMEAnalysis", 10), donki("SEP", 7)]);
    const { soles, source } = await fetchData();
    const dk = await donkiP;
    panel.replaceChildren(glanceCard(soles, dk), weatherCard(soles, source), dustCard(soles, source));
  } catch (e) {
    renderError(panel, e);
  }
}

function initTabs() {
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  if (!tabs.length) return;
  let weatherLoaded = false;
  const select = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (tab.id === "tab-btn-weather" && !weatherLoaded) {
      weatherLoaded = true;
      load(document.getElementById("tab-weather"));
    }
  };
  tabs.forEach((t) => t.addEventListener("click", () => select(t)));
  wireArrows(tabs, select);
}

initTabs();