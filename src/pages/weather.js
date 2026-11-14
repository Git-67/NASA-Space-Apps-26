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
    const { soles, source } = await fetchData();
    panel.replaceChildren(weatherCard(soles, source), dustCard(soles, source));
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