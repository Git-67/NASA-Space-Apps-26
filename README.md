# Sol Stroll

**Know before you go.** A go / no-go briefing for one real Marswalk on Mars, built for the NASA Space Apps Challenge 2026 ("Interplanetary Survival Guide: Martian Map").

Mars maps show where to walk. Sol Stroll tells a crew whether to go. It follows NASA's Curiosity rover through the boxwork region of Mount Sharp, in Gale Crater, and answers five questions about that one walk: why go, where, when, how sure, and what if.

![The briefing page: map of the route with the verdict panel](docs/screenshots/briefing-dark.png)

## What works today

- A map of the boxwork on high-resolution orbital imagery, with Curiosity's recorded path and five science stops.
- A plan built from the stops you tick: each section's distance, climb, walking time and difficulty, plus the return leg.
- A verdict (go, caution, no-go) for any sol in Curiosity's weather record, with every reason and its basis shown.
- Hazards on the route, a packing list, and what Curiosity found at each stop.
- Dark and light themes.

Not built yet: the orbit and ground photo comparison at each stop, and a guided replay of the 2018 dust storm.

## NASA data used

| Data | Mission and instrument | Used for |
|---|---|---|
| Orbital imagery | Mars Reconnaissance Orbiter, HiRISE, via NASA Mars Trek | The map |
| Rover waypoints | Mars Science Laboratory (Curiosity) | The route, stops, distances and climb |
| Daily weather | Curiosity REMS, provided by Centro de Astrobiología | Daylight and the seasonal comparison behind the verdict |
| Science findings | NASA/JPL-Caltech releases and the Curiosity mission blog | What is at each stop |

Full details, limits and usage terms are in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md). The weather feed is labelled by its provider as intended for outreach purposes only.

## What is measured, derived and assumed

- **Measured by NASA missions:** imagery, rover positions and elevations, daily temperatures, sunrise and sunset.
- **Derived by us:** distances along the path, climb, how unusual a sol is for its season.
- **Assumed by us, and labelled in the page:** walking speed, time spent at each stop, the daylight safety margin, the difficulty bands, the packing list, and what a person could do at each stop.

No Mars surface suit limits are public, so the verdict uses no temperature, ultraviolet or radiation dose thresholds.

## Run it

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Run the tests (needs Node 20 or later):

```bash
node --test tests/*.test.js
```

Rebuild the data files from NASA's servers:

```bash
python3 scripts/prepare_route.py --refresh
```

```bash
python3 scripts/prepare_weather.py --refresh
```

Regenerate the style tokens after changing `DESIGN.md`:

```bash
pip install -r requirements.txt
```

```bash
python3 scripts/build_tokens.py
```

## How the code is laid out

| Path | What it holds |
|---|---|
| `index.html` | The one page |
| `src/pages/home.js` | Loads the data, holds the page state, asks the features to redraw |
| `src/features/map/` | The map |
| `src/features/plan/` | Sections, time, difficulty, hazards, packing list, elevation profile |
| `src/features/conditions/` | The sol's conditions and the verdict |
| `src/features/theme/` | Dark and light switching |
| `src/lib/` | Mars constants, data loading, safe DOM building |
| `src/styles/` | `tokens.css` is generated from `DESIGN.md`; the rest are hand-written |
| `scripts/` | Python scripts that turn NASA downloads into the small files the page loads |
| `data/stops.json` | The five stops, written by hand with sources |
| `data/raw/`, `data/processed/` | Untouched downloads, and the scripts' output |
| `tests/` | Tests for the planning and verdict logic |
| `public/vendor/leaflet/` | Leaflet 1.9.4 (BSD 2-Clause), the map library |
| `docs/` | Data sources, science brief, pitch, competitive analysis |

Rules for contributing are in [`CLAUDE.md`](CLAUDE.md). The design specification is [`DESIGN.md`](DESIGN.md).

## Credits

Imagery and mission data courtesy NASA/JPL-Caltech and the mission teams named above. Fonts: Space Grotesk, Inter and JetBrains Mono (SIL Open Font License).

Sol Stroll was created for the NASA Space Apps Challenge 2026. It is not affiliated with or endorsed by NASA.
