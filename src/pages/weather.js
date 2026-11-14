// Sol Stroll: Weather tab. Live fetch of the REMS feed; offline, the copy stored with the site
// (data/processed/weather.json, the same feed prepared by scripts/prepare_weather.py).
import { fromColumns } from "../lib/columns.js";
import { formatMarsClock } from "../lib/mars.js";
import { icon as svgIcon } from "../components/ui/icon.js";

/** Rename the prepared weather records to the feed's field names, which the charts below read. */
const fromBundle = (j) => fromColumns(j?.records).map((r) => ({
  sol: r.sol, terrestrial_date: r.earthDate, ls: r.ls,
  min_temp: r.airMinC, max_temp: r.airMaxC, min_gts_temp: r.groundMinC, max_gts_temp: r.groundMaxC,
  pressure: r.pressurePa, local_uv_irradiance_index: r.uv,
  sunrise: r.sunriseMin === null ? null : formatMarsClock(r.sunriseMin),
  sunset: r.sunsetMin === null ? null : formatMarsClock(r.sunsetMin),
}));
// UNVERIFIED: field names (sol, terrestrial_date, ls, min_temp, max_temp, min_gts_temp,
// max_gts_temp, pressure, wind_speed, atmo_opacity, season, sunrise, sunset, abs_humidity)
// and CORS were written from memory and could not be tested against the live feed.
// Icons: Material Symbols Outlined, drawn as inline SVG (see icon() below).

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

const num = (v) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
const r1 = (v) => Math.round(v * 10) / 10;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateOf = (d) => (d && !Number.isNaN(Date.parse(d)) ? fmtDate(Date.parse(d)) : null);
const g = (k) => (x) => num(x[k]);
const rangeOf = (x) => {
  const a = num(x.min_temp), b = num(x.max_temp);
  return a === null || b === null ? null : b - a;
};

// Measurements in the dropdown. "c" picks the chart colour (c1 to c3 = chart-1 to chart-3).
const TABS = [
  { id: "air", label: "Air temperature", icon: "thermostat", unit: "°C",
    series: [{ label: "High", get: g("max_temp"), c: "c2" }, { label: "Low", get: g("min_temp"), c: "c1", low: true }] },
  { id: "ground", label: "Ground temperature", icon: "landscape", unit: "°C",
    series: [{ label: "High", get: g("max_gts_temp"), c: "c2" }, { label: "Low", get: g("min_gts_temp"), c: "c1", low: true }] },
  { id: "pressure", label: "Pressure", icon: "compress", unit: "Pa",
    series: [{ label: "Pressure", get: g("pressure"), c: "c1" }] },
  { id: "range", label: "Daily temperature range", icon: "height", unit: "°C",
    series: [{ label: "Range", get: rangeOf, c: "c3" }] },
  { id: "wind", label: "Wind speed", icon: "air", unit: "m/s",
    series: [{ label: "Wind", get: g("wind_speed"), c: "c1" }] },
];
const RANGES = [3, 7, 14, 30];   // in sols; the feed has one reading per sol
const DEFAULT_RANGE = 14;

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
// Icons: Material Symbols as inline SVG (src/components/ui/icon.js; add new names to scripts/vendor_icons.py).
// Some keys are renamed to icons that exist there.
const ALIAS = { narrower: "close_fullscreen", wider: "open_in_full", radiation: "scatter_plot" };
const icon = (name, cls = "") => {
  const s = svgIcon(ALIAS[name] || name);
  if (cls) s.classList.add(...cls.split(" "));
  return s;
};
const note = (ic, text) => {
  const p = el("p", "wx-note");
  p.append(icon(ic), el("span", "", text));
  return p;
};
const card = (title, ic) => {
  const c = el("section", "card");
  const h = el("h2", "card-title");
  h.append(icon(ic), el("span", "", title));
  c.append(h);
  return c;
};
const button = (cls, ic, label) => {
  const b = el("button", cls);
  b.type = "button";
  b.append(icon(ic), el("span", "", label));
  return b;
};

// ---------- Chart
// "Usual for this season": median of the same Ls bin, from sols before the window.
function usualFor(soles, lo, s) {
  const by = new Map();
  for (const x of soles) {
    if (Number(x.sol) >= lo) continue;
    const l = num(x.ls), v = s.get(x);
    if (l === null || v === null) continue;
    const b = Math.floor(l / BIN);
    (by.get(b) || by.set(b, []).get(b)).push(v);
  }
  return (x) => {
    const l = num(x.ls);
    const a = l === null ? null : by.get(Math.floor(l / BIN));
    return a && a.length >= MIN_HISTORY ? median(a) : null;
  };
}

function windowData(soles, latestSol, tab, n) {
  const lo = latestSol - n + 1;
  const win = soles.filter((x) => Number(x.sol) >= lo);
  const data = tab.series.map((s) => {
    const usual = usualFor(soles, lo, s);
    return {
      s,
      p: win
        .map((x) => ({ sol: Number(x.sol), v: s.get(x), u: usual(x), date: x.terrestrial_date, ls: num(x.ls) }))
        .filter((q) => q.v !== null),
    };
  });
  return { lo, data, live: data.filter((d) => d.p.length) };
}

function buildChart(soles, latestSol, tab, n) {
  const { lo, data, live } = windowData(soles, latestSol, tab, n);
  const wrap = el("div", "wx-chartbox");
  if (!live.length) {
    wrap.append(note("info", `No ${tab.label.toLowerCase()} in the last ${n} sols.`));
    return wrap;
  }

  // stat tiles: latest value, window range, change vs usual
  const stats = el("div", "wx-stats");
  for (const d of live) {
    const vs = d.p.map((q) => q.v), last = d.p[d.p.length - 1];
    const t = el("div", "wx-stat");
    const head = el("div", "wx-stat-label");
    head.append(el("span", `wx-sw wx-${d.s.c}${d.s.low ? " low" : ""}`), el("span", "", `${d.s.label}, sol ${last.sol}`));
    t.append(head, el("div", "wx-stat-value", `${r1(last.v)} ${tab.unit}`),
      el("div", "wx-stat-sub", `${r1(Math.min(...vs))} to ${r1(Math.max(...vs))} over ${n} sols`));
    if (last.u !== null) {
      const dl = last.v - last.u;
      const row = el("div", "wx-stat-sub");
      row.append(icon(Math.abs(dl) < 0.05 ? "trending_flat" : dl > 0 ? "trending_up" : "trending_down"),
        el("span", "", `${dl > 0 ? "+" : ""}${r1(dl)} vs usual`));
      t.append(row);
    }
    stats.append(t);
  }
  wrap.append(stats);

  // legend
  const legend = el("div", "wx-legend");
  for (const d of live) {
    const it = el("span", "wx-legend-item");
    it.append(el("span", `wx-sw wx-${d.s.c}${d.s.low ? " low" : ""}`), el("span", "", d.s.label));
    legend.append(it);
  }
  if (live.some((d) => d.p.some((q) => q.u !== null))) {
    const it = el("span", "wx-legend-item");
    it.append(el("span", "wx-sw wx-usual-sw"), el("span", "", "Usual for season"));
    legend.append(it);
  }
  wrap.append(legend);

  const W = 360, H = 230, L = 40, R = 46, T = 12, B = 26;
  const all = live.flatMap((d) => d.p.flatMap((q) => (q.u === null ? [q.v] : [q.v, q.u])));
  let yMin = Math.min(...all), yMax = Math.max(...all);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = (yMax - yMin) * 0.1;
  yMin -= pad; yMax += pad;
  const X = (sol) => L + ((sol - lo) / Math.max(1, latestSol - lo)) * (W - L - R);
  const Y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const fmt = (v) => (yMax - yMin < 10 ? v.toFixed(1) : String(Math.round(v)));

  const desc = live
    .map((d) => `${d.s.label} from ${r1(Math.min(...d.p.map((q) => q.v)))} to ${r1(Math.max(...d.p.map((q) => q.v)))} ${tab.unit}`)
    .join("; ");
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", tabindex: 0,
    "aria-label": `${tab.label}, sols ${lo} to ${latestSol}. ${desc}. Use the table view for every value.` });

  // grid and axes
  for (let i = 0; i < 4; i++) {
    const v = yMin + pad + (i * (yMax - yMin - 2 * pad)) / 3;
    svg.append(svgEl("line", { class: "wx-grid", x1: L, x2: W - R, y1: Y(v), y2: Y(v) }));
    svg.append(svgEl("text", { class: "wx-tick", x: L - 5, y: Y(v) + 3, "text-anchor": "end" }, fmt(v)));
  }
  svg.append(svgEl("line", { class: "wx-axis", x1: L, x2: W - R, y1: H - B, y2: H - B }));
  svg.append(svgEl("text", { class: "wx-tick", x: L - 5, y: 8, "text-anchor": "end" }, tab.unit));
  const xt = [...new Set([0, 1, 2, 3, 4].map((i) => Math.round(lo + (i * (latestSol - lo)) / 4)))];
  xt.forEach((sol, i) =>
    svg.append(svgEl("text", { class: "wx-tick", x: X(sol), y: H - 9,
      "text-anchor": i === 0 ? "start" : i === xt.length - 1 ? "end" : "middle" }, `sol ${sol}`)));

  const pathOf = (pts, val) => {
    let d = "", prev = null;
    for (const q of pts) {
      const v = val(q);
      if (v === null) { prev = null; continue; }
      d += (prev && q.sol - prev.sol === 1 ? "L" : "M") + `${X(q.sol).toFixed(1)} ${Y(v).toFixed(1)} `;
      prev = q;
    }
    return d;
  };

  // shaded band between daily high and low
  if (live.length === 2) {
    const hi = new Map(live[0].p.map((q) => [q.sol, q.v])), lw = new Map(live[1].p.map((q) => [q.sol, q.v]));
    const both = [...hi.keys()].filter((k) => lw.has(k)).sort((a, b) => a - b);
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        const top = run.map((k) => `${X(k).toFixed(1)} ${Y(hi.get(k)).toFixed(1)}`);
        const bot = [...run].reverse().map((k) => `${X(k).toFixed(1)} ${Y(lw.get(k)).toFixed(1)}`);
        svg.append(svgEl("path", { class: "wx-band", d: `M${top.join("L")}L${bot.join("L")}Z` }));
      }
      run = [];
    };
    for (const k of both) { if (run.length && k - run[run.length - 1] !== 1) flush(); run.push(k); }
    flush();
  }

  // series: usual line, main line, dots, direct label
  for (const { s, p } of live) {
    const gr = svgEl("g", { class: `wx-${s.c}` });
    gr.append(svgEl("path", { class: "wx-usual", d: pathOf(p, (q) => q.u) }));
    gr.append(svgEl("path", { class: `wx-line${s.low ? " low" : ""}`, d: pathOf(p, (q) => q.v) }));
    if (p.length <= 14) for (const q of p) gr.append(svgEl("circle", { class: `wx-dot${s.low ? " low" : ""}`, cx: X(q.sol), cy: Y(q.v), r: 3.5 }));
    if (live.length > 1) {
      const q = p[p.length - 1];
      gr.append(svgEl("text", { class: "wx-direct", x: X(q.sol) + 6, y: Y(q.v) + 3 }, s.label));
    }
    svg.append(gr);
  }

  // hover / keyboard layer
  const sols = [...new Set(live.flatMap((d) => d.p.map((q) => q.sol)))].sort((a, b) => a - b);
  const bySol = live.map((d) => new Map(d.p.map((q) => [q.sol, q])));
  const cross = svgEl("line", { class: "wx-cross", y1: T, y2: H - B });
  cross.style.display = "none";
  svg.append(cross);
  const hoverDots = live.map((d) => {
    const dot = svgEl("circle", { class: `wx-dot wx-hover wx-${d.s.c}${d.s.low ? " low" : ""}`, r: 5 });
    dot.style.display = "none";
    svg.append(dot);
    return dot;
  });

  const plot = el("div", "wx-plot");
  const tip = el("div", "wx-tip");
  tip.hidden = true;
  tip.setAttribute("aria-hidden", "true");
  let idx = sols.length - 1;
  const hide = () => { tip.hidden = true; cross.style.display = "none"; hoverDots.forEach((d) => (d.style.display = "none")); };
  const show = (i) => {
    idx = Math.max(0, Math.min(sols.length - 1, i));
    const sol = sols[idx], x = X(sol);
    cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.style.display = "";
    const pts = bySol.map((m) => m.get(sol));
    const q0 = pts.find(Boolean);
    hoverDots.forEach((dot, k) => {
      const q = pts[k];
      if (!q) { dot.style.display = "none"; return; }
      dot.setAttribute("cx", x); dot.setAttribute("cy", Y(q.v)); dot.style.display = "";
    });
    const rows = [el("div", "wx-tip-head", `Sol ${sol}${dateOf(q0.date) ? `, ${dateOf(q0.date)}` : ""}`)];
    live.forEach((d, k) => {
      const q = pts[k];
      if (!q) return;
      const row = el("div", "wx-tip-row");
      row.append(el("span", `wx-sw wx-${d.s.c}${d.s.low ? " low" : ""}`), el("span", "wx-tip-name", d.s.label),
        el("span", "wx-tip-val", `${r1(q.v)} ${tab.unit}`));
      rows.push(row);
      if (q.u !== null) rows.push(el("div", "wx-tip-sub", `Usual ${r1(q.u)} ${tab.unit}`));
    });
    if (q0.ls !== null) rows.push(el("div", "wx-tip-sub", `Ls ${Math.round(q0.ls)}°`));
    tip.replaceChildren(...rows);
    tip.hidden = false;
    tip.style.left = `${(x / W) * 100}%`;
    tip.dataset.side = x > W * 0.6 ? "left" : x < W * 0.4 ? "right" : "mid";
  };
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    sols.forEach((s, i) => { const d = Math.abs(X(s) - px); if (d < bd) { bd = d; best = i; } });
    show(best);
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(idx));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
    else if (e.key === "Escape") hide();
  });
  plot.append(svg, tip);
  wrap.append(plot);
  wrap.append(el("p", "data-source-caption", "Gaps mean no reading that sol."));
  return wrap;
}

function buildTable(soles, latestSol, tab, n) {
  const { lo, live } = windowData(soles, latestSol, tab, n);
  const wrap = el("div", "wx-table-wrap");
  if (!live.length) { wrap.append(note("info", `No ${tab.label.toLowerCase()} in the last ${n} sols.`)); return wrap; }
  const t = el("table", "wx-table");
  const hr = el("tr");
  ["Sol", "Date", ...live.map((d) => `${d.s.label} (${tab.unit})`)].forEach((h) => hr.append(el("th", "", h)));
  t.append(el("thead", "", "")); t.firstChild.append(hr);
  const tb = el("tbody");
  for (let sol = latestSol; sol >= lo; sol--) {
    const cells = live.map((d) => d.p.find((q) => q.sol === sol));
    if (!cells.some(Boolean)) continue;
    const tr = el("tr");
    tr.append(el("td", "", String(sol)), el("td", "", dateOf(cells.find(Boolean).date) || "–"));
    cells.forEach((q) => tr.append(el("td", "num", q ? String(r1(q.v)) : "–")));
    tb.append(tr);
  }
  t.append(tb);
  wrap.append(t);
  return wrap;
}

function weatherCard(soles, source) {
  const c = card("Weather at Gale Crater", "partly_cloudy_day");
  const latest = soles[soles.length - 1];
  const latestSol = Number(latest.sol);
  c.append(note("schedule", `Sol ${latestSol}, ${dateOf(latest.terrestrial_date) || "date unknown"}. Latest published, not live.`));

  const avail = TABS.filter((t) =>
    t.series.some((s) => soles.some((x) => latestSol - Number(x.sol) < 30 && s.get(x) !== null)));

  if (avail.length) {
    let tab = avail[0], n = DEFAULT_RANGE, asTable = false;

    // dropdown + view toggle
    const controls = el("div", "wx-controls");
    const lab = el("label", "wx-select");
    const selIcon = icon(tab.icon);
    const sel = el("select", "wx-select-input");
    avail.forEach((t) => { const o = el("option", "", t.label); o.value = t.id; sel.append(o); });
    lab.append(el("span", "sr-only", "Measurement"), selIcon, sel, icon("chevron_right", "wx-chev"));
    const toggle = button("wx-toggle", "table_chart", "Table");
    toggle.setAttribute("aria-pressed", "false");
    controls.append(lab, toggle);

    const rangeBar = el("div", "wx-range");
    rangeBar.setAttribute("role", "group");
    rangeBar.setAttribute("aria-label", "Sols shown");
    const rangeBtns = RANGES.map((r) => {
      const b = el("button", "subtab", `${r} sols`);
      b.type = "button"; b.dataset.n = r;
      rangeBar.append(b);
      return b;
    });

    const panel = el("div", "wx-chart");
    panel.setAttribute("aria-live", "polite");
    const draw = () => {
      rangeBtns.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.n) === n)));
      selIcon.textContent = tab.icon;
      toggle.setAttribute("aria-pressed", String(asTable));
      toggle.replaceChildren(icon(asTable ? "show_chart" : "table_chart"), el("span", "", asTable ? "Chart" : "Table"));
      panel.replaceChildren(asTable ? buildTable(soles, latestSol, tab, n) : buildChart(soles, latestSol, tab, n));
    };
    sel.addEventListener("change", () => { tab = avail.find((t) => t.id === sel.value); draw(); });
    toggle.addEventListener("click", () => { asTable = !asTable; draw(); });
    rangeBtns.forEach((b) => b.addEventListener("click", () => { n = Number(b.dataset.n); draw(); }));
    c.append(controls, rangeBar, panel);
    draw();
  } else {
    c.append(note("info", "No temperature or pressure in the last 30 sols."));
  }

  const chips = [
    ["calendar_month", latest.season ? `Season: ${latest.season}` : null],
    ["cloud", latest.atmo_opacity ? `Sky: ${latest.atmo_opacity}` : null],
    ["water_drop", num(latest.abs_humidity) === null ? null : `Humidity: ${num(latest.abs_humidity)}`],
  ].filter(([, v]) => v);
  if (chips.length) {
    const ul = el("ul", "wx-chips");
    for (const [ic, text] of chips) { const li = el("li"); li.append(icon(ic), el("span", "", text)); ul.append(li); }
    c.append(ul);
  }
  c.append(el("p", "data-source-caption",
    `Source: ${source}. Accessed ${fmtDate(Date.now())}. Outreach data, not science-grade. 1 sol = 24 h 39 min.`));
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
    const g2 = groups[groups.length - 1];
    if (g2 && b - g2.hi <= 1) g2.hi = b; else groups.push({ lo: b, hi: b });
  }
  const step = MARS_YEAR_DAYS * 864e5, out = [];
  for (const g2 of groups) {
    const inG = a.rows.filter((r) => r.bin >= g2.lo && r.bin <= g2.hi);
    const count = new Map();
    inG.forEach((r) => count.set(r.year, (count.get(r.year) || 0) + 1));
    // use the Mars year that covers this season best (latest wins a tie)
    let yr = null;
    for (const [y, k] of count) if (yr === null || k > count.get(yr) || (k === count.get(yr) && y > yr)) yr = y;
    const ds = inG.filter((r) => r.year === yr).map((r) => Date.parse(r.date)).filter((t) => !Number.isNaN(t));
    if (!ds.length) continue;
    let start = Math.min(...ds), end = Math.max(...ds) + 864e5;
    while (end < Date.now()) { start += step; end += step; }
    out.push({ lsFrom: g2.lo * BIN, lsTo: (g2.hi + 1) * BIN, start, end });
  }
  return out.sort((x, y) => x.start - y.start);
}

function dustCard(soles) {
  const c = card("Dust watch", "grain");
  const a = analyse(soles);
  if (!a) {
    c.append(note("info", "Needs the full season history. This feed does not have it."));
    return c;
  }
  const narrower = a.recentDrop >= 0;
  c.append(note(narrower ? "narrower" : "wider",
    `Daily range ${Math.abs(a.recentDrop).toFixed(1)} °C ${narrower ? "narrower" : "wider"} than usual (sols ${a.recentSols[0]} to ${a.recentSols[1]}).`));

  const wins = watchWindows(a);
  if (wins.length) {
    const h = el("h3", "wx-sub");
    h.append(icon("event"), el("span", "", "Watch dates"));
    const ul = el("ul", "dust-list");
    let nextDone = false;
    for (const w of wins) {
      const now = w.start <= Date.now();
      const li = el("li", "dust-row");
      const main = el("div", "dust-main");
      main.append(el("span", "dust-dates", `${fmtDate(w.start)} to ${fmtDate(w.end)}`), el("span", "dust-ls", `Ls ${w.lsFrom}° to ${w.lsTo}°`));
      li.append(icon(now ? "warning" : "event"), main);
      const tag = now ? "Now" : !nextDone ? "Next" : null;
      if (!now) nextDone = true;
      if (tag) { const b = el("span", "wx-badge", tag); b.dataset.status = now ? "watch" : "info"; li.append(b); }
      ul.append(li);
    }
    c.append(h, ul);
  }

  const more = el("details", "glance-more");
  more.append(el("summary", "", "How we infer this"));
  more.append(el("p", "basis",
    "No dust sensor in the feed. Dust narrows the daily temperature range, so we compare it with the usual range for the season. " +
    "An inference, not a detection or a forecast."));
  const ul = el("ul");
  for (const e of a.events) {
    const first = e.rows[0], last = e.rows[e.rows.length - 1];
    ul.append(el("li", "", `Ls ${e.bin * BIN}° to ${(e.bin + 1) * BIN}°, sols ${first.sol} to ${last.sol}: ${e.mean.toFixed(1)} °C narrower.`));
  }
  more.append(ul);
  c.append(more);
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

const STATUS_ICON = { ok: "check_circle", watch: "warning", info: "info", nodata: "help" };
const TILE_ICON = {
  "Temperature": "thermostat", "Pressure": "compress", "Wind": "air", "Sunlight (UV)": "light_mode",
  "Daylight": "wb_twilight", "Solar flares": "flare", "Solar storms (CMEs)": "cyclone",
  "Particles and cosmic rays": "radiation", "Dust storms": "storm", "Dust in the air": "blur_on",
  "Visibility": "visibility",
};
const tile = (label, value, noteText, status, badge) => ({ label, value, note: noteText, status, badge });
const NO = (label, why) => tile(label, "Not measured", why, "nodata", "Not measured");

function compareTile(label, soles, latest, fn, value, low, high) {
  const pct = percentile(soles, latest, fn);
  if (pct === null) return tile(label, value, "Not enough history to compare.", "info", "No comparison");
  if (pct <= UNUSUAL_PCT) return tile(label, value, `${low} than ${Math.round(100 - pct)}% of past sols this season.`, "watch", "Unusual");
  if (pct >= 100 - UNUSUAL_PCT) return tile(label, value, `${high} than ${Math.round(pct)}% of past sols this season.`, "watch", "Unusual");
  return tile(label, value, "Usual for this season.", "ok", "Usual");
}

function buildTiles(soles, dk) {
  const latest = soles[soles.length - 1];
  const mn = num(latest.min_temp), mx = num(latest.max_temp), pr = num(latest.pressure);
  const mean = (s) => (num(s.min_temp) === null || num(s.max_temp) === null ? null : (num(s.min_temp) + num(s.max_temp)) / 2);
  const tiles = [];

  tiles.push(mean(latest) === null ? NO("Temperature", "No air temperature for the latest sol.")
    : compareTile("Temperature", soles, latest, mean, `${r1(mn)} to ${r1(mx)} °C`, "Colder", "Warmer"));
  tiles.push(pr === null ? NO("Pressure", "No pressure for the latest sol.")
    : compareTile("Pressure", soles, latest, (s) => num(s.pressure), `${r1(pr)} Pa`, "Lower", "Higher"));

  const ws = num(latest.wind_speed), wd = latest.wind_direction && !/^-+$/.test(String(latest.wind_direction)) ? String(latest.wind_direction) : null;
  tiles.push(ws === null && wd === null ? NO("Wind", "No wind data. This sensor often has none.")
    : tile("Wind", `${ws === null ? "speed not given" : `${r1(ws)} m/s`}${wd ? `, ${wd}` : ""}`, "As reported for the latest sol.", "info", "Info"));

  tiles.push(latest.local_uv_irradiance_index
    ? tile("Sunlight (UV)", String(latest.local_uv_irradiance_index).replace(/_/g, " "), "Ground UV level. Not a radiation dose.", "info", "Info")
    : NO("Sunlight (UV)", "No UV level for the latest sol."));

  const hm = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
  const up = hm(latest.sunrise), down = hm(latest.sunset);
  tiles.push(up !== null && down !== null && down > up
    ? tile("Daylight", `${latest.sunrise} to ${latest.sunset}`, `${r1(down - up)} h of daylight, Mars local time.`, "info", "Info")
    : NO("Daylight", "No sunrise and sunset for the latest sol."));

  const bad = (r, label) => ({ failed: true, ...NO(label, `DONKI could not be reached (${r.reason && r.reason.message}).`) });
  const [fl, cme, sep] = dk;
  if (fl.status === "rejected") tiles.push(bad(fl, "Solar flares"));
  else {
    const rank = (c) => ("ABCMX".indexOf(String(c)[0]) + 1) * 1000 + (parseFloat(String(c).slice(1)) || 0);
    const list = (fl.value || []).filter((f) => f.classType);
    const top = list.sort((a, b) => rank(b.classType) - rank(a.classType))[0];
    const recentMajor = list.filter((f) => FLARE_CLASSES.includes(String(f.classType)[0]) &&
      Date.now() - Date.parse(f.peakTime || f.beginTime) <= FLARE_DAYS * 864e5);
    tiles.push(recentMajor.length
      ? tile("Solar flares", `${recentMajor.length} major, strongest ${top.classType}`, "Seen from Earth. Mars may not face the flare.", "watch", "Active")
      : tile("Solar flares", top ? `Strongest in 7 days: ${top.classType}` : "None in 7 days", "Seen from Earth.", "ok", "Quiet"));
  }
  if (cme.status === "rejected") tiles.push(bad(cme, "Solar storms (CMEs)"));
  else {
    const hits = [];
    for (const a of cme.value || []) for (const e of a.enlilList || []) for (const i of e.impactList || [])
      if (/mars/i.test(i.location || "")) { const t = Date.parse(i.arrivalTime); if (!Number.isNaN(t) && t >= Date.now() - 864e5) hits.push(t); }
    tiles.push(hits.length
      ? tile("Solar storms (CMEs)", `Reaches Mars ${fmtDate(Math.min(...hits))}`, "DONKI model forecast, not a measurement.", "watch", "Forecast")
      : tile("Solar storms (CMEs)", "None forecast", "In DONKI model results. Not every CME is modelled.", "ok", "None"));
  }
  if (sep.status === "rejected") tiles.push(bad(sep, "Particles and cosmic rays"));
  else {
    const recent = (sep.value || []).filter((e) => Date.now() - Date.parse(e.eventTime) <= SEP_DAYS * 864e5);
    const why = "Seen near Earth or by spacecraft. Cosmic rays are not live here.";
    tiles.push(recent.length
      ? tile("Particles and cosmic rays", `Particle event in ${SEP_DAYS} days`, why, "watch", "Active")
      : tile("Particles and cosmic rays", `None in ${SEP_DAYS} days`, why, "ok", "Quiet"));
  }

  const a = analyse(soles), wins = a ? watchWindows(a) : [];
  const inWin = wins.find((w) => w.start <= Date.now() && Date.now() <= w.end);
  const next = wins.find((w) => w.start > Date.now());
  const rp = percentile(soles, latest, rangeOf);
  if (!a && rp === null) tiles.push(NO("Dust storms", "Not enough history to infer dust."));
  else {
    const narrow = rp !== null && rp <= UNUSUAL_PCT;
    const base = inWin ? `Watch dates until ${fmtDate(inWin.end)}` : narrow ? "Daily range unusually narrow" : "Outside watch dates";
    tiles.push(tile("Dust storms",
      `${base}${!inWin && next ? `. Next: ${fmtDate(next.start)}` : ""}`,
      "Inferred from the daily range, not measured. Storms cannot be predicted.",
      inWin || narrow ? "watch" : "info", inWin || narrow ? "Watch" : "Info"));
  }

  tiles.push(latest.atmo_opacity
    ? tile("Dust in the air", String(latest.atmo_opacity), "A coarse sky label, not optical depth.", "info", "Info")
    : NO("Dust in the air", "No sky label for the latest sol."));
  return tiles;
}

function asOf(d) {
  const t = Date.parse(d);
  if (Number.isNaN(t)) return "date unknown";
  const days = Math.floor((Date.now() - t) / 864e5);
  return `${fmtDate(t)}${days > 0 ? `, ${days} days ago` : ""}`;
}

function glanceCard(soles, dk) {
  const c = card("At a glance", "dashboard");
  const latest = soles[soles.length - 1];
  const all = buildTiles(soles, dk);
  const hidden = all.filter((t) => t.status === "nodata");
  const rank = { watch: 0, ok: 1, info: 2 };
  const shown = all.filter((t) => t.status !== "nodata").sort((x, y) => rank[x.status] - rank[y.status]);
  const watch = shown.filter((t) => t.status === "watch");
  const okN = shown.filter((t) => t.status === "ok").length;

  const failed = all.filter((t) => t.failed);   // a service error, unlike a sensor that never reports
  const [status, head, sub] = watch.length
    ? ["watch", "Check before you go", `${watch.map((t) => t.label).join(", ")}.${failed.length ? ` Not checked: ${failed.map((t) => t.label).join(", ")}.` : ""}`]
    : failed.length ? ["info", "Some checks failed", `Not checked: ${failed.map((t) => t.label).join(", ")}.`]
    : okN ? ["ok", "Nothing unusual", "Not a safety clearance."]
    : ["info", "Not enough data", "Too little to compare."];
  const banner = el("div", "glance-banner");
  banner.dataset.status = status;
  const text = el("div", "glance-banner-text");
  text.append(el("p", "glance-head", head), el("p", "glance-sub", sub),
    el("p", "glance-asof", `Sol ${latest.sol}, ${asOf(latest.terrestrial_date)}`));
  banner.append(icon(STATUS_ICON[status], "glance-banner-icon"), text);
  c.append(banner);

  const list = el("ul", "glance-list");
  for (const t of shown) {
    const li = el("li", "glance-row");
    li.dataset.status = t.status;
    const main = el("div", "glance-main");
    main.append(el("span", "glance-label", t.label), el("span", "glance-value", t.value));
    li.append(icon(TILE_ICON[t.label] || "info", "glance-ico"), main);
    if (t.status !== "info") {
      const b = el("span", "wx-badge");
      b.dataset.status = t.status;
      b.append(icon(STATUS_ICON[t.status]), el("span", "", t.badge));
      li.append(b);
    }
    list.append(li);
  }
  c.append(list);

  const more = el("details", "glance-more");
  more.append(el("summary", "", "How to read this"));
  const ul = el("ul");
  for (const t of shown) ul.append(el("li", "", `${t.label}: ${t.note}`));
  more.append(ul);
  more.append(el("p", "basis",
    `Unusual = outside the middle ${100 - 2 * UNUSUAL_PCT}% of past sols this season. Our cutoff, not a NASA limit. ` +
    "NASA has set no go / no-go limits for this site."));
  for (const t of failed) more.append(el("p", "basis", `${t.label}: ${t.note}`));
  const quiet = hidden.filter((t) => !t.failed);
  if (quiet.length) more.append(el("p", "basis", `No data: ${quiet.map((t) => t.label).join(", ")}.`));
  c.append(more);
  return c;
}

// ---------- Page wiring
function renderError(panel, err) {
  const c = card("Weather at Gale Crater", "partly_cloudy_day");
  c.append(note("error", `Could not load weather. ${err.message}`));
  const retry = button("button-secondary wx-retry", "refresh", "Retry");
  retry.addEventListener("click", () => load(panel));
  c.append(retry);
  panel.replaceChildren(c);
}

async function load(panel) {
  const sk = el("div", "skeleton");
  sk.setAttribute("role", "status");
  sk.append(el("span", "sr-only", "Loading weather"));
  panel.replaceChildren(sk);
  try {
    const donkiP = Promise.allSettled([donki("FLR", 7), donki("CMEAnalysis", 10), donki("SEP", 7)]);
    const { soles, source } = await fetchData();
    const dk = await donkiP;
    panel.replaceChildren(glanceCard(soles, dk), weatherCard(soles, source), dustCard(soles));
  } catch (e) {
    renderError(panel, e);
  }
}

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