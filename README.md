# Sol Stroll

**Know before you go.** A go / no-go briefing for one real Marswalk on Mars, built for the NASA Space Apps Challenge 2026 ("Interplanetary Survival Guide: Martian Map").

Mars maps show where to walk. Sol Stroll tells a crew whether to go. It follows NASA's Curiosity rover through the boxwork region of Mount Sharp, in Gale Crater, and answers three questions about that one walk: why go, where, and when. Two more were planned and are not built: how sure (the orbital view beside the rover's ground photo) and a guided "what if" replay.

![The briefing page: map of the route with the verdict panel](docs/screenshots/briefing-dark.png)

## What works today

- A map of the boxwork on high-resolution orbital imagery, with the path Curiosity actually drove and five science stops. It zooms from the whole crater down to the rocks.
- A plan built from stops you search for and add, in the order you choose (or the recommended shortest order). Map numbers and arrows follow that order. For each leg: each section's distance, climb, walking time and difficulty on hover or tap, the route coloured by difficulty, and callouts at steep ground, sand and the biggest climb.
- A verdict (go, caution, no-go) for any sol in Curiosity's weather record, or for today, including NASA's space weather for that date. Every reason shows its basis.
- A task list for each stop with why it matters, hazards on the route, and a packing list.
- **Live, with an offline mode:** online it reads live NASA data; with no link (as on Mars), or at the press of a button, it uses the copy stored with the site and says how recent it is (first load about 1.2 MB).
- The **safest path** between stops under **NASA's rules**: only ground Curiosity actually drove (263 rover drives joined into a network), never steeper than NASA's 20° suit limit, and the shortest within it, found with an A* search. Each sol brings a **daily mission** (our practice objectives, e.g. "Ridge versus hollow" or "Retrace Curiosity") that picks its stops from the five curated stops and ten places Curiosity parked; you can also **add your own points** by tapping the map, and they snap to Curiosity's tracks. The verdict also applies NASA's 8-hour and 2 km walk limits.
- **Begin journey:** a full-screen, simulated walk of the plan, for a tablet. The top bar and side panel close and the map zooms in close, keeps the walker centred and turns so the way they face is up (the device compass where there is one, else the direction of travel). Only the leg being walked is drawn solid. Live space weather sits top right, and "Simulate alert" plays a random practice alert, labelled as a drill. At each stop its tasks pop up once and are submitted with two presses; ending the walk takes three (the last a 2-second hold), so dust or a glove cannot end it by accident. It is labelled as a simulation: there is no real astronaut position. About 30 m before steep ground or a sandy hollow, a warning appears with the distance counting down. Quiet sound cues mark hazards, arrivals, submitted tasks, the end of the walk and space weather alerts; they are made in the browser (no sound files) and can be muted.
- **Visor view:** during a journey, a small button on the right edge shows a curved helmet visor in plain white with a clear middle and the map as a small minimap on its left, showing only what matters: a compass tape with the next stop on it, the next stop's distance and time, the space weather level, and gauges for time out and distance from base against NASA's limits. It is a simulation of what a helmet display could show; no helmet or headset is involved.
- Map options: contour lines from NASA's Gale elevation model, colour HiRISE imagery, names of places Curiosity explored, and a latitude/longitude grid. Contours, names and the grid start switched on, and your choices are remembered on your device.
- **Weather tab:** conditions at a glance for the latest sol Curiosity reported (pressure, temperature, solar storms, particles, ultraviolet, daylight), charts of air temperature, ground temperature and pressure over the last 3 to 30 sols, and a "dust watch" of dates to keep an eye on. The dust watch is our own inference from how narrow the daily temperature range was at each time of year; it is not a NASA forecast.
- Dark and light themes.

Not built: the orbit and ground photo comparison at each stop (the "how sure" question), and a guided replay of the 2018 dust storm. Typing sol 2100 into the briefing does show that storm's effect on the verdict.

| Journey | Visor view | A no-go sol |
|---|---|---|
| ![Journey mode](docs/screenshots/journey.png) | ![Visor view](docs/screenshots/visor.png) | ![No-go verdict on sol 1947](docs/screenshots/verdict-no-go.png) |

## NASA data used

| Data | Mission and instrument | Used for |
|---|---|---|
| Orbital imagery | Mars Reconnaissance Orbiter, HiRISE, via NASA Mars Trek | The map |
| Colour orbital imagery | Mars Reconnaissance Orbiter, HiRISE colour mosaic, via NASA's Curiosity location map | The colour view |
| Elevation model | Mars Reconnaissance Orbiter, HiRISE Gale DEM, via NASA Mars Trek | Contour lines (one line per 18.6 m, see the data sources) |
| Place names | Mars Science Laboratory (Curiosity) location map | Names of places the rover explored |
| Rover waypoints | Mars Science Laboratory (Curiosity) | The route, stops, distances and climb |
| Daily weather | Curiosity REMS, provided by Centro de Astrobiología | Daylight and the seasonal comparison behind the verdict |
| Space weather | NASA DONKI (CCMC): WSA-Enlil forecasts of solar storms at Mars, solar particle events, shocks | The solar storm check in the verdict |
| Wider orbital imagery | Mars Reconnaissance Orbiter, CTX, via NASA Mars Trek | The map when zoomed out to the crater |
| Science findings | NASA/JPL-Caltech releases and the Curiosity mission blog | What is at each stop |

Full details, limits and usage terms are in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md). The weather feed is labelled by its provider as intended for outreach purposes only.

## What is measured, derived and assumed

- **Measured by NASA missions:** imagery, rover positions and elevations, daily temperatures, sunrise and sunset.
- **Derived by us:** distances along the path, climb, how unusual a sol is for its season, and the elevation scale behind the contour lines.
- **Taken from NASA's lunar planning, because none exists for Mars:** the 2 km/h walking pace and the 20° slope mark (NASA EVA-EXP-0042).
- **Assumed by us, and labelled in the page:** time spent at each stop, the daylight safety margin, the packing list, and the tasks at each stop. The slope (17°, 20°), walk length (8 h), distance (2 km) and pace (2 km/h) are NASA's lunar planning figures (EVA-EXP-0042).

NASA's own planning document says walking ranges for Mars are still "forward work", and no Mars surface suit limits are public. So the verdict uses no temperature, ultraviolet or radiation dose thresholds.

## Run it

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Run the tests (needs Node 20 or later). There are 65:

```bash
node --test tests/*.test.js
```

Test the path search in the data scripts:

```bash
python3 -m unittest discover scripts
```

Rebuild the data files from NASA's servers:

```bash
python3 scripts/prepare_route.py --refresh
```

```bash
python3 scripts/prepare_weather.py --refresh
```

```bash
python3 scripts/prepare_landmarks.py --refresh
```

```bash
python3 scripts/calibrate_dem.py --refresh
```

```bash
python3 scripts/prepare_safe_paths.py
```

```bash
python3 scripts/prepare_rover_stops.py
```

Run `prepare_route.py` first, then `prepare_safe_paths.py`, then `prepare_rover_stops.py`: each uses the one before.

Rebuild the offline imagery and fonts (needs the internet once, then never again):

```bash
python3 scripts/build_offline_tiles.py
```

```bash
python3 scripts/vendor_fonts.py
```

```bash
python3 scripts/vendor_icons.py
```

The space weather script needs a free key from https://api.nasa.gov in `NASA_API_KEY` (see `.env.example`):

```bash
NASA_API_KEY=your-key python3 scripts/prepare_space_weather.py
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
| `index.html` | The one page, with two tabs: Briefing and Weather |
| `src/pages/home.js`, `load-briefing-data.js` | Load the data, hold the page state, ask the features to redraw |
| `src/pages/weather.js` | The Weather tab |
| `src/features/map/` | The map, its layer panel, and the optional layers (colour imagery, contours, place names, grid) |
| `src/features/plan/` | Stop search, daily missions, custom points, path search over rover tracks, sections, time, difficulty, hazards, packing list, elevation profile |
| `src/features/conditions/` | The sol's conditions, NASA's walk limits, space weather, and the verdict |
| `src/features/journey/` | Begin journey: the simulated walk, its pop-ups, and the visor view |
| `src/features/connection/` | The online and offline switch |
| `src/components/ui/` | Icons |
| `src/features/theme/` | Dark and light switching |
| `src/lib/` | Mars constants, data loading, safe DOM building, compass, sound cues, the link check |
| `src/styles/` | `tokens.css` is generated from `DESIGN.md`; the rest are hand-written |
| `scripts/` | Python scripts that turn NASA downloads into the small files the page loads |
| `data/stops.json` | The five curated stops, written by hand with sources |
| `data/raw/`, `data/processed/` | Untouched downloads, and the scripts' output |
| `tests/` | Tests for the planning, verdict, journey, visor, map layer and path search logic |
| `public/vendor/leaflet/` | Leaflet 1.9.4 (BSD 2-Clause), minified, the map library |
| `public/fonts/` | Bundled text fonts (OFL), from `scripts/vendor_fonts.py` |
| `src/components/ui/icon-paths.js` | Bundled icons as SVG paths (Material Symbols, Apache 2.0), from `scripts/vendor_icons.py` |
| `data/processed/tiles/` | Bundled map imagery (about 4 MB), from `scripts/build_offline_tiles.py` |
| `docs/` | Data sources, API notes, science brief, pitch, competitive analysis, screenshots |

Rules for contributing are in [`CLAUDE.md`](CLAUDE.md). The design specification is [`DESIGN.md`](DESIGN.md).

## Credits

Orbital imagery: NASA/JPL/University of Arizona (HiRISE) and NASA/JPL-Caltech/MSSS (CTX), served by NASA Mars Trek and NASA's Curiosity location map. Rover data: courtesy NASA/JPL-Caltech. Weather: Centro de Astrobiología (CSIC-INTA) via NASA. Space weather: NASA DONKI / CCMC. Map library: Leaflet (BSD 2-Clause). Fonts: Space Grotesk, Inter and JetBrains Mono (SIL Open Font License). Icons: Material Symbols (Apache License 2.0).

Sol Stroll was created for the NASA Space Apps Challenge 2026. It is not affiliated with or endorsed by NASA.
