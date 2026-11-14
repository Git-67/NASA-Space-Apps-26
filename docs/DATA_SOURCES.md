# Data sources

Every dataset the project uses or plans to use. Update this file in the same change that adds, removes or reprocesses data.

**Status key:** *Reachable* means the endpoint answered and the content was inspected on the date shown. It does not mean the data has been validated.

## In the product (as of 14 Nov 2026)

| Data | Raw copy | Prepared by | Output the site loads | Processing |
|---|---|---|---|---|
| MRO HiRISE mosaic `curiosity_hirise_mosaic` | Not stored; tiles are requested from NASA Mars Trek as the map is viewed | None | None | None. Shown at its published zoom levels 12 to 16, never stretched |
| Curiosity waypoints and traverse | `data/raw/msl_waypoints.json` and `data/raw/msl_traverse.json`, downloaded 14 Nov 2026 | `scripts/prepare_route.py` (with `scripts/traverse.py`) | `data/processed/route.json` | Cut to the path between the first and last stop (50 waypoints, sols 4560 to 4711). Elevation rounded to 0.1 m. Each waypoint pair is joined by the drive the rover actually made (traverse file; every drive ends exactly on a waypoint, checked 14 Nov 2026), simplified to within 0.25 m for the map. Distance along the path: great-circle length of the full-resolution drives on a sphere of radius 3,389,500 m. Climb is summed from waypoint elevations |
| Curiosity REMS daily weather | `data/raw/msl_weather.json`, downloaded 14 Nov 2026 | `scripts/prepare_weather.py` | `data/processed/weather.json` | Text converted to numbers. Sunrise and sunset converted to minutes after local midnight. Dust opacity, wind and humidity dropped as unusable. Sols with missing values kept, with nulls |
| The five stops | `data/stops.json`, written by hand | None | Merged into `route.json` | Each stop is tied to a Curiosity waypoint by its site and drive number. Each has a one-line "why" from its cited source, and a list of tasks (`tasksOurs`) that is the team's own suggestion |
| MRO HiRISE colour mosaic `MSL_Gale_HiRISE-LRGB_78quads` | Not stored; tiles are requested from NASA's Curiosity location map as the colour view is shown | None | None | Web Mercator tiles (TMS numbering) placed row by row onto the map's latitude/longitude grid in the browser (`src/features/map/mercator-tiles.js`). Checked on 14 Nov 2026: the result lines up with the Trek grayscale mosaic to 0 pixels at zoom 14 and 16 |
| MRO HiRISE Gale elevation model `Gale_DEM_SMG_1m` | Not stored for the map; tiles are requested from NASA Mars Trek as the contour option is shown. Zoom 12 tiles for the calibration are in `data/raw/trek_gale_dem_z12/` | `scripts/calibrate_dem.py` | `data/processed/dem_calibration.json` | Contours are traced in the browser by marching squares, one line per grey level boundary. The grey scale was fitted to Curiosity's waypoint elevations (see below) |
| Named places Curiosity explored | `data/raw/msl_map_config.json` and `data/raw/msl_surface_sites.json`, downloaded 14 Nov 2026 | `scripts/prepare_landmarks.py` | `data/processed/landmarks.json` | Names and view centres from the mission map's "Sites" list, plus the centres of its "Surface View" squares. The crater-wide view and the "Current Location" view are dropped; a name listed twice is kept once. 9 places |

Three figures differ and each is correct for what it measures: the path from the first stop to the last is **1,113 m** along the drives the rover made (used in the product since 14 Nov 2026), **929 m** as straight lines between waypoints (the earlier figure), and about **1.2 km** by the rover's odometer, which also counts turns on the spot and wheel slip.

| MRO CTX mosaic `curiosity_ctx_mosaic` | Not stored; tiles from NASA Mars Trek | None | None | Shown under HiRISE so the map zooms out to the whole crater (zoom 8). Published to zoom 10 and enlarged beyond it, always under the HiRISE layer |
| NASA DONKI space weather | `data/raw/donki/` (not committed: about 440 files, 6.5 MB; the script fetches them again) | `scripts/prepare_space_weather.py` | `data/processed/space_weather.json` | See "Space weather" below |

The product does not yet use the raw image service or any radiation data.

### Space weather (NASA DONKI)
- **Provider:** NASA Community Coordinated Modeling Center, through https://api.nasa.gov/DONKI/. Fetched 14 Nov 2026 for 6 Aug 2012 to 14 Nov 2026, in 60-day windows (the API's limit). Needs a free NASA API key in `NASA_API_KEY`; NASA's shared `DEMO_KEY` allows only a few requests an hour.
- **Types used, and what each can say about Mars:**
  - **Solar storm forecast at Mars** (from `WSAEnlilSimulations`): NASA's WSA-Enlil model predicts where coronal mass ejections arrive. Only arrivals at Mars are kept, one per arrival time, the most severe reading where runs disagree. 998 arrivals, 583 called direct. **A forecast, not a measurement.**
  - **Solar energetic particles** (`SEP`): 438 events, detected by spacecraft near Earth (GOES, SOHO) or by STEREO. **Not measured at Mars.**
  - **Interplanetary shocks** (`IPS`): 1,165, with where they were detected (Earth or STEREO). Listed, not used in the verdict.
  - **Solar flares** (`FLR`): class M and X wanted, but the `DONKI/FLR` endpoint answered 404 from NASA's side on 14 Nov 2026. The output records it as unavailable and the page says so; rerunning the script fills it in when NASA restores the endpoint.
  - Not used: `CME` (the model runs already give arrivals at Mars), and `GST`, `HSS`, `RBE`, `MPC`, which describe effects at Earth.
- **Verdict rule (ours):** a direct arrival forecast at Mars on the sol's UTC date is no-go (6.8% of sols in the weather record); a glancing arrival, or particles detected near Earth that day, is caution (about 5% and 3.2% more). This replaces the earlier "what if" checkbox. It extends the science brief's "no walk during a solar particle event", and the science lead should confirm it.
- **The present day** is read live in the browser with `DEMO_KEY` (two requests). Curiosity's weather feed ends on 25 Aug 2026, so for today only space weather is judged. The present sol is counted from the date (derived).
- **Usage terms:** NASA open data through api.nasa.gov; credit "NASA DONKI / CCMC".

**How the contour lines are made, and how far to trust them (Derived).** Mars Trek serves the Gale elevation model only as 8-bit grey picture tiles, with no published scale; the full model is a 5.8 GB download, too large for a web page, and no Trek service returning elevation values was found. `scripts/calibrate_dem.py` reads the grey level under each of Curiosity's 1,389 waypoints (zoom 12 tiles) and fits a straight line to the rover's recorded elevation: **elevation = −4600.1 m + 18.6 m × grey level, RMS error 5.9 m, worst 17.1 m.** The RMS error is about what rounding to whole grey levels alone would cause (18.6 / √12 ≈ 5.4 m), so the tiles look like a plain linear stretch of the model. Consequences:
- The contour interval cannot be finer than **18.6 m**. Across the walk, which climbs about 40 m, that is two or three lines.
- On flat ground a line follows the boundary between two grey levels and turns into noisy squiggles. That is the 8-bit rounding, not terrain.
- The calibration is circular for the route itself: the same waypoints define the scale. It is fair for the map's purpose (showing the shape of the ground), not as an independent check of Curiosity's elevations.
- CLAUDE.md says the browser never parses raw mission files. The browser here reads picture tiles, the same kind of file as the basemap, and the scale it uses comes from a committed script; the team should confirm that reading is acceptable.

**Colour imagery and live views.** No live camera feed of the surface exists: no orbiter or rover streams video from Mars. The nearest thing, Curiosity's raw image service, shows the latest pictures the rover sent, and Curiosity left the boxwork in about March 2026. The colour view is the MRO HiRISE colour mosaic NASA uses on Curiosity's own location map; it covers only a strip around the rover's drive.

**Study site:** the boxwork region on Mount Sharp, Gale Crater. Curiosity's waypoints for sols 4500 to 4840 fall within about latitude -4.793 to -4.810, longitude 137.379 to 137.390, at elevations of about -3,690 m to -3,598 m. The campaign ran from the Altadena drill (sol 4564, 8 Jun 2025) to the rover's exit in March 2026 (about sol 4836). Stops and their sources are in `docs/SCIENCE_BRIEF.md`.

**Usage terms:** see the "Usage terms and credit lines" section at the end.

## Reachable (checked 13 Nov 2026)

### Curiosity REMS daily weather
- **Mission / instrument:** Mars Science Laboratory (Curiosity), Rover Environmental Monitoring Station. Data provided by Centro de Astrobiología (CSIC-INTA).
- **URL:** https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
- **Contents:** 4,745 daily records, sol 1 (7 Aug 2012) to sol 4995 (25 Aug 2026). Per sol: minimum and maximum air temperature, minimum and maximum ground temperature, pressure, an ultraviolet category (Low, Moderate, High, Very High), sunrise and sunset in local time, solar longitude (Ls), Earth date.
- **Used for:** the walk window (angle 1) and the dust storm replay (angle 6).
- **Limits found:**
  - The provider labels it **"for outreach purposes only"** and points to the NASA Planetary Data System for scientific use. This must be disclosed in the product.
  - **Daily values only.** There is no hourly data, so time of day can only be reasoned about from sunrise, sunset and the daily extremes.
  - **Dust opacity is unusable:** the field reads "Sunny" on all but three sols, including during the 2018 global dust storm.
  - **Wind and humidity are empty** on every record.
  - Ultraviolet is a category, not a number.
  - About 28 sols lack temperature or pressure, and 250 sols are absent from the feed.
  - The feed stops at 25 Aug 2026, although the rover was still active in November 2026.
  - One station, one location per sol. It moved with the rover over 14 years.
- **Observed in the data:** the 2018 global dust storm is visible. Maximum air temperature fell from 4 °C on sol 2060 to -29 °C on sol 2100, and ultraviolet dropped to Low.

### Curiosity waypoints and traverse
- **Mission:** Mars Science Laboratory (Curiosity). Published through the mission's public location map.
- **URLs:** https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json and https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json
- **Contents:** 1,388 waypoints, sol 3 to sol 5070. Each has latitude, longitude, elevation (field name `elev_geoid`), rover roll, pitch and tilt, distance driven, and the site and drive numbers. The traverse file holds 1,316 line segments.
- **Used for:** the route (angle 7), the elevation profile, and linking photos to places (angle 2).
- **Limits found:** the coordinate convention and elevation datum are not documented in the files and must be confirmed. Rover tilt is the vehicle's attitude when parked, which is a hint about slope, not a slope measurement.

### Curiosity raw images
- **Mission / instruments:** Mars Science Laboratory (Curiosity): Navcam, Mastcam, ChemCam and others.
- **URL:** https://mars.nasa.gov/api/v1/raw_image_items/ (query by mission and sol)
- **Contents:** per image: sol, instrument, image URL, local Mars time, mast azimuth and elevation, and the site and drive numbers, which match the waypoint file.
- **Used for:** the ground view at each stop (angle 2).
- **Limits found:** filtering by sol range works (181 images for sols 4700 to 4702). Filtering by instrument through the `search` parameter returned nothing, so the correct instrument filter is still unknown. Raw images are unprocessed and uncalibrated.

### Orbital imagery and terrain (NASA Mars Trek)
- **URL pattern:** `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png`
- **Layers confirmed to return a tile at the boxwork site:**

| Layer ID | Mission / instrument | Max zoom | Use |
|---|---|---|---|
| `curiosity_hirise_mosaic` | MRO HiRISE | 16 | Grayscale basemap. The tile inspected shows ridge patterns |
| `curiosity_ctx_mosaic` | MRO CTX | 10 | Wider context |
| `Gale_CTX_BlockAdj_dd` | MRO CTX | 12 | Wider context |
| `Gale_DEM_SMG_1m` | MRO HiRISE elevation model | 14 | Terrain display |

- **Also listed for the area, not yet tested:** Mars Odyssey THEMIS day and night infrared mosaics, MGS TES thermal inertia and dust index, MGS MOLA elevation, CRISM and OMEGA hydrous mineral detections, the USGS global geology map.
- **Limits found:** these are picture tiles. The elevation layer is a rendered image, not elevation values, so slope cannot be computed from it; the underlying elevation file would have to be downloaded. The tile grid is a simple latitude and longitude grid (two tiles wide at zoom 0), which Leaflet does not use by default.

## Not reachable or not found

### Curiosity RAD radiation
- **Mission / instrument:** Mars Science Laboratory (Curiosity), Radiation Assessment Detector.
- **Status:** no ready-made daily dose table was found. Official data is in the NASA Planetary Data System (Planetary Plasma Interactions node, dataset `MSL-M-RAD-3-RDR-V1.0`) and on CDAWeb (`MSL_RAD_OBS-L2`). Neither has been opened. A quick-look series at NASA's ISWA is marked not for analysis or publication.
- **Fallback:** cite published figures. For the September 2017 solar storm, published studies report surface dose rates rising to two to three times the background level over several hours (Zeitlin et al. 2018; Hassler et al. 2018; Ehresmann and Hassler 2018). These must be read and cited properly before use.
- **Used for:** the solar storm replay (angle 6).

## The five resources listed by the challenge

Rechecked on 14 Nov 2026. The organisers added no data on the day.

| Resource | What it is | Used? | Why |
|---|---|---|---|
| [NASA Mars Trek](https://trek.nasa.gov/mars/) | Map portal with layers from many Mars missions | **Yes** | Source of the HiRISE basemap tiles. Its own page could not be fetched from the build environment (it returned an error), so its terms of use are still unread; the tile service itself works |
| [Curiosity's proposed path up Mount Sharp](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/) | A route animation published 15 May 2019, built from MRO HiRISE, CRISM and CTX data and Mars Express HRSC data. Credit: NASA/JPL-Caltech/ESA/University of Arizona/JHUAPL/MSSS/USGS Astrogeology Science Center | **As a reference, not as data** | It shows the route planned in 2019. The product uses the path the rover actually recorded, which is newer and exact. The page names no regions in its text. It is a good image for the pitch: the plan in 2019 beside what the rover really did |
| [USGS-NASA interactive Mars maps](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars) | A hub of interactive geologic maps | **Not yet** | The page loads its content with scripts and could not be read from the build environment, so what it offers for Gale Crater is unknown. A teammate should open it in a browser. The global geologic map (USGS SIM 3292, Tanaka et al. 2014) is also offered as a Mars Trek layer, but at a scale of 1 to 20 million it would show our whole route as one unit |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Satellite imagery viewer | **No** | It shows Earth, not Mars |
| [Mars Perseverance raw images](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Raw images from the Perseverance rover | **No** | Perseverance is in Jezero Crater, a different site. The equivalent for our site is Curiosity's raw image service, listed above and planned for the photo comparison |

Two of the five resources cannot serve a Gale Crater project at all. That is not a problem: the challenge asks for NASA data from multiple missions, not for these five in particular.

## Science references still needed

- Done: what Curiosity found in the boxwork and when is cited in `docs/SCIENCE_BRIEF.md`.
- Walking pace, slope, walk length and the career radiation limit have now been read from NASA documents; see `docs/SCIENCE_BRIEF.md` section 5. All the walking figures are lunar. Still without a source: temperature and ultraviolet limits, and the surface dose figures.

## Usage terms and credit lines

Checked 13 Nov 2026 by reading the two policy pages below. This is a reading of public policy pages, not legal advice.

| Source | Terms found | Credit line to show |
|---|---|---|
| NASA content in general | "Generally not subject to copyright in the United States." May be used for educational or informational purposes without explicit permission. NASA should be acknowledged as the source | "NASA" plus the specific credit below |
| JPL images and video (rover images, releases) | "May be used for any purpose without prior permission", with exceptions for third-party material | "Courtesy NASA/JPL-Caltech", unless the caption says otherwise |
| Curiosity Mastcam images | Covered by the JPL policy. The releases we read credit them as shown | "NASA/JPL-Caltech/MSSS" |
| MRO HiRISE imagery | The HiRISE team's usage page says its images "are within the public domain" with "no copyright restriction", and asks for a credit line where possible (read 14 Nov 2026) | "NASA/JPL/University of Arizona" |
| NASA Mars Trek, which serves the tiles | **Not checked.** Its page could not be fetched | Name it as the service: "via NASA Mars Trek" |
| Curiosity REMS weather feed | Provider's disclaimer: "intended for outreach purposes only"; science users are directed to the Planetary Data System | To be confirmed. Must name Centro de Astrobiología, and the outreach-only note must appear in the product |
| Curiosity waypoint and traverse files | **Not checked.** Published on a NASA mission site, so the general NASA terms probably apply | "NASA/JPL-Caltech" (to be confirmed) |
| Curiosity location map: colour HiRISE mosaic and place names | **Not checked.** Served from mars.nasa.gov alongside the waypoint files. HiRISE images are public domain (see above) | "NASA/JPL/University of Arizona" for the imagery; "NASA/JPL-Caltech" for the names (to be confirmed) |

Rules that apply to everything:
- **No NASA insignia, logotype or seal, and no JPL logo.** Both policy pages say these need prior written approval and are not in the public domain.
- **Never claim or imply endorsement** by NASA, JPL or Caltech.
- **Third-party material** on NASA sites can be copyrighted. Use only images whose caption credits NASA or its mission partners.
- Policy pages: https://www.nasa.gov/nasa-brand-center/images-and-media/ , https://www.jpl.nasa.gov/jpl-image-use-policy/ and https://www.uahirise.org/media/usage.php
