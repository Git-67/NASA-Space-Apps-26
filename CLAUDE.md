# CLAUDE.md

Rules for working in this repo. They apply to every change, by a human or an AI.
If a rule here conflicts with a request, say so before proceeding instead of quietly picking one.

## 1. Project context

- **What:** a website plus a product pitch for the NASA Space Apps Challenge 2026 (Singapore, virtual).
- **Challenge:** "Interplanetary Survival Guide: Martian Map". Build a layered, integrated view of a location or route on Mars that combines data from several NASA science missions, to help a human explorer plan a successful Marswalk while doing science along the way.
- **Official brief and resources:** https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources (the organisers added no data on 14 Nov). How each of the five listed resources is used, or why it is not, is recorded in `docs/DATA_SOURCES.md`.
- **Window:** Sat 14 Nov 2026 09:00 SGT to Sun 15 Nov 2026 23:59 SGT. Submission is a hard deadline.
- **Deliverables:** project summary, demo (30-second video or 7 slides), a public project link, project details.
- **Judged 1 to 5 on:** Impact, Creativity, Validity, Relevance, Presentation.
- **Mandatory:** at least one NASA dataset, named, linked, and explained. No NASA data means no Global Awards eligibility.

Every piece of work should move at least one judging criterion. If it moves none, it is not a priority this weekend.

### What we are building (agreed 13 Nov 2026)

A briefing for **one real Marswalk** in the boxwork region of Mount Sharp, Gale Crater, that answers five questions on one map:

1. **Why go:** one science question, and what a human can do at each stop that the rover could not.
2. **Where:** the safest path between the chosen stops, over ground Curiosity actually drove, with distance, climb, time and difficulty for each section. **Changed 14 Nov 2026 by the team:** a pathfinder is now in scope, but only over rover-driven ground (`scripts/safe_paths.py`); never across ground no rover crossed, because our offline elevation data (18.6 m steps) cannot judge walker-scale slopes.
3. **When:** a go / caution / no-go verdict for any sol in Curiosity's weather record, judged against other sols at the same season.
4. **How sure:** the orbital view beside the rover's ground photo at each stop. Stretch: a data confidence layer.
5. **What if:** replay a real bad day (the 2018 dust storm, the 2017 solar storm) against the plan.

The verdict rests on daylight, how unusual the chosen sol is for its season, and whether a solar storm is under way. It does **not** use invented temperature, ultraviolet or dose thresholds; no citable Mars suit limits exist.

Out of scope: other sites, a 3D globe, a helmet display, route finding across undriven ground. See `docs/COMPETITIVE_ANALYSIS.md` for why, and `docs/DATA_SOURCES.md` for what each data source can and cannot support.

### Team roles (agreed 13 Nov 2026)

| Role | Owns |
|---|---|
| Developer: map | Basemap, route, stops, photo comparison |
| Developer: data and charts | Python data scripts, walk window, storm replay |
| Science and data lead | `docs/DATA_SOURCES.md`, the stops, the science question, safety limits, citations |
| Storyteller | The 7 slides or 30-second video |
| Editor and critic | Project summary and details text; two scheduled reviews against the judging criteria (Saturday evening, Sunday midday) |

Changes to data, limits or scientific claims go through the science and data lead. Developers must be able to explain every part of the code to a judge; do not merge code the team cannot explain.

- **Name and tagline:** **Sol Stroll.** "Know before you go." (confirmed 13 Nov 2026)
- **Problem statement (draft, in `docs/PITCH.md`):** Mars maps show where to walk. Sol Stroll tells a crew whether to go: one briefing for one real Marswalk.
- **Science question, stops and safety limits:** `docs/SCIENCE_BRIEF.md`. Facts in it are marked Read, Snippet, Derived or Ours. Only "Read" facts, or facts the science lead has since verified, may appear in the product or the pitch without a caveat.
- **Pitch outline:** `docs/PITCH.md`. It lists which numbers may be used, how to phrase them, and which claims to avoid.

## 2. Stack and commands

Chosen for a team that knows Python, HTML, CSS and basic JavaScript, and for free hosting on GitHub Pages.

- **Site:** static HTML, CSS and JavaScript (ES modules). **No framework and no build step**, so what is in the repo is what Pages serves.
- **Types:** plain JavaScript with JSDoc types and `// @ts-check` at the top of each file. This replaces TypeScript, which would need a build step.
- **Map:** Leaflet 1.9.4, the official minified build, vendored in `public/vendor/leaflet/` and loaded as a classic script (`src/lib/leaflet.js` hands it to the modules). **Charts:** hand-drawn inline SVG so far; add a charting library only if a chart needs more than that.
- **Data preparation:** Python scripts in `scripts/` turn raw NASA data into small JSON, GeoJSON or image files in `data/processed/`. The browser never parses raw mission files.
- **Online with an offline mode (decided 14 Nov 2026):** online, the page reads live NASA data (map tiles, DONKI space weather, the REMS feed). When NASA cannot be reached, or the visitor chooses offline, it uses the copy stored with the site (tiles, fonts, icons, all data) and says how recent that copy is. The offline copy must always be complete: refresh it with the scripts in `scripts/` before each release. Keep the first load under about 1.5 MB, and do heavy computation in the scripts, not the browser, because computers on Mars will be modest.
- **Safety rules are NASA's (decided 14 Nov 2026):** use NASA's published figures (EVA-EXP-0042, NASA-STD-3001) wherever one exists, cite it, and say "lunar" when it is a lunar figure. Our own numbers are allowed only where NASA has none, and are labelled "ours" in the page.
- **Hosting:** GitHub Pages, served from `main`, for judges. The same folder runs from a local server with no internet. The repository must be public for Pages on a free plan.

| Task | Command |
|---|---|
| Dev server | `python3 -m http.server 8000` then open http://localhost:8000 |
| Prepare data | `python3 scripts/<name>.py` (each script documents its inputs and outputs) |
| Python dependencies | `pip install -r requirements.txt` (pinned versions) |
| Test | `node --test tests/*.test.js` |
| Rebuild style tokens | `python3 scripts/build_tokens.py` after any change to `DESIGN.md`. Never edit `src/styles/tokens.css` by hand |
| Lint, format, type check | _Not set up. There is no automated check that `// @ts-check` passes_ |

All paths in the site are relative, because Pages serves the project from a sub-path, not from the domain root.

## 3. Repository layout

Organise by feature, not by file type. Target shape (adapt names to the framework's conventions):

```
index.html           Entry page at the root, as GitHub Pages expects.
scripts/             Python data preparation. One script per dataset.
src/
  pages/             Page scripts and shells only. No business logic.
  features/<name>/   One folder per feature: its components, hooks, logic, tests.
  components/ui/     Shared, presentational primitives built from DESIGN.md tokens.
  lib/               Framework-agnostic helpers, API clients, data parsing.
  styles/            Design tokens and global styles. The only home for raw values.
  types/             Shared types.
data/raw/            Untouched downloads (or a note on where to fetch them). Never edited by hand.
data/processed/      Output of scripts/. The only data the site loads.
docs/                DATA_SOURCES.md, pitch material, architecture notes.
public/              Static assets.
```

- A feature may import from `components/ui`, `lib`, `styles`, `types`. Features do not import from each other; lift shared code up instead.
- One component or module per file. Split a file when it passes roughly 250 lines or does two jobs.
- No dumping grounds: no `utils.ts`, `helpers.ts` or `misc/` that collect unrelated functions. Name files after what they do.
- New top-level folders need a reason stated in the PR or commit.

## 4. Code standards

- **Types:** every JavaScript file starts with `// @ts-check` and uses JSDoc types. No `any`, no `@ts-ignore`. Python uses type hints. Validate external data (API responses, CSV/JSON files) at the boundary and convert it into typed objects once.
- **Naming:** names say what a thing is or does. No abbreviations beyond common ones (`id`, `url`). Booleans read as `is/has/should`.
- **Functions:** small, single purpose, early returns over nesting. Pure logic lives outside components so it can be tested.
- **No magic values:** numbers, strings, URLs, dataset IDs and thresholds go in named constants or config.
- **Errors:** never swallow them. Every fetch and parse has a handled failure path, and the UI shows loading, empty, and error states.
- **Dependencies:** add one only when it saves real work. Check it is maintained and licensed for open use. State why in the commit.
- **Dead code:** delete it. No commented-out blocks, no unused exports, no leftover `console.log`.
- **Extensibility:** make the next dataset, page or chart an addition rather than an edit: data-driven config over hard-coded branches. Do not build abstractions for needs that do not exist yet; three real uses before generalising.

## 5. Comments and documentation

- Comment **why**, not what. Explain intent, constraints, trade-offs, and anything surprising. Do not narrate the code.
- Every exported function, component, hook and type gets a doc comment: purpose, parameters, return value, units where relevant.
- Every file that touches scientific data states the dataset, the units, the coordinate system or time zone, and any transformation applied.
- `TODO(name): reason` only. A bare `TODO` is not allowed.
- Update comments and docs in the same change as the code they describe. A wrong comment is worse than none.
- Keep `README.md` current: what the project is, how to run it, which NASA data it uses.

## 6. Security

- **Secrets never enter the repo.** API keys (including NASA `api.nasa.gov` keys) live in environment variables. Commit `.env.example` with names only; `.env*` is gitignored.
- Anything shipped to the browser is public. Keys that must stay private go behind a server route or serverless function.
- Treat all external input as untrusted: user input, URL params, and dataset contents. Validate and escape it. No `dangerouslySetInnerHTML`, `innerHTML` or `eval` on dynamic content.
- Use HTTPS endpoints only. Pin dependency versions through the lockfile; do not install from unknown registries or Git URLs.
- No personal data collection unless the feature needs it. If it does, collect the minimum and say so in the UI.
- Before every commit, check the diff for keys, tokens and credentials. If one is committed, tell the team at once: it must be rotated, since deleting the commit is not enough.

## 7. NASA data (the Validity score)

- Record every dataset in `docs/DATA_SOURCES.md`: name, provider, source URL, date accessed, licence, what it is used for, and any processing done.
- **Never fabricate, estimate or "fill in" data.** Placeholder or mock data must be labelled as such in code and in the UI, and removed before submission.
- Keep raw data and processed data separate. Processing is done by a committed script, so the result can be reproduced.
- Show the source in the UI next to any chart, map or figure that uses it.
- Do not commit files over about 25 MB. Commit a fetch script or a trimmed sample and document where the full set lives.
- Claims in the pitch and the UI must be traceable to a dataset or a cited source.
- The challenge asks for data from **multiple** missions. For each layer, record the mission, instrument and product ID.
- Mars data has its own conventions. For every dataset, record the coordinate convention (planetocentric or planetographic latitude, east- or west-positive longitude), the elevation datum, the map projection, the resolution, and the time basis (sol, Mars year, UTC). Convert to one convention at the data boundary.
- Derived values (slope, route cost, walking time, dose) are computed by committed code, labelled as derived or estimated in the UI, and state their assumptions and sources.

## 8. UI and UX: DESIGN.md is the source of truth

**Read `DESIGN.md` before writing or changing any UI.** It is binding, not a suggestion.

- Use only its tokens for colour, typography, spacing, radius and elevation. No raw hex codes, pixel sizes or shadows in components.
- Tokens are defined once in `src/styles/` (CSS variables or theme config) and mirrored from `DESIGN.md`. Components reference tokens by name.
- Build from its named components (`button-primary`, `card-base`, `text-input`, and so on). A new variant is added to `DESIGN.md` first, then implemented.
- Follow its Do's and Don'ts and its responsive breakpoints and collapsing rules. Design mobile and desktop together.
- The site has a dark and a light theme. Every UI change is checked in both.
- **If `DESIGN.md` is silent or contradicts itself, stop and ask.** Do not improvise a style and do not "improve" on the spec.
- If `DESIGN.md` changes, update the token files in the same change.

Baseline that applies on top of the spec:

- Semantic HTML, keyboard reachable controls, visible focus states, alt text, form labels.
- Text contrast meets WCAG AA. If a token pair in `DESIGN.md` fails AA, flag it instead of shipping it.
- Touch targets at least 44px. Respect `prefers-reduced-motion`.
- Do not ship another company's proprietary fonts, logos or illustrations. Use the fallback font stack listed in `DESIGN.md` and original or openly licensed assets.

## 9. Git workflow

- Small, focused commits. Imperative subject line under 72 characters, with the reason in the body when it is not obvious.
- Work on a branch; do not push straight to `main`. No force pushes to shared branches.
- Never commit build output, `node_modules`, `.env` files, editor settings or OS junk.
- `main` must always build and run. It is what the judges will open.

## 10. Before calling work done

1. Lint, type check and tests pass. Report failures as failures; never skip or disable a test to get green.
2. The change was run and looked at in a browser, at mobile and desktop widths, including its loading, empty and error states.
3. The UI matches `DESIGN.md`.
4. No secrets, debug output or dead code in the diff.
5. Docs, comments and `docs/DATA_SOURCES.md` are updated.
6. Logic that transforms data has tests. Presentation-only components do not need them this weekend.

## 11. How to work in this repo

- Read the surrounding code and match its patterns before adding new ones.
- Do what was asked. Flag unrelated problems; do not fix them in the same change.
- Ask before: adding a dependency, changing the folder layout, changing `DESIGN.md`, or deleting someone else's work.
- Be direct about risk. If a request will not be finished or will not hold up by the deadline, say so and propose a smaller version.
- A working, honest, well-presented prototype beats an ambitious broken one. Protect the demo path first.
