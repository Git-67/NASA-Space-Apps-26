# Data sources

Every dataset the project uses or plans to use. Update this file in the same change that adds, removes or reprocesses data.

**Status key:** *Reachable* means the endpoint answered and the content was inspected on the date shown. It does not mean the data has been validated.

## In the product (as of 14 Nov 2026)

| Data | Raw copy | Prepared by | Output the site loads | Processing |
|---|---|---|---|---|
| MRO HiRISE mosaic `curiosity_hirise_mosaic` | Not stored; tiles are requested from NASA Mars Trek as the map is viewed | None | None | None. Shown at its published zoom levels 12 to 16, never stretched |
| Curiosity waypoints | `data/raw/msl_waypoints.json`, downloaded 14 Nov 2026 | `scripts/prepare_route.py` | `data/processed/route.json` | Cut to the path between the first and last stop (50 waypoints, sols 4560 to 4711). Elevation rounded to 0.1 m. Distance along the path added: great-circle distance between consecutive waypoints on a sphere of radius 3,389,500 m |
| Curiosity REMS daily weather | `data/raw/msl_weather.json`, downloaded 14 Nov 2026 | `scripts/prepare_weather.py` | `data/processed/weather.json` | Text converted to numbers. Sunrise and sunset converted to minutes after local midnight. Dust opacity, wind and humidity dropped as unusable. Sols with missing values kept, with nulls |
| The five stops | `data/stops.json`, written by hand | None | Merged into `route.json` | Each stop is tied to a Curiosity waypoint by its site and drive number |

Two figures differ and both are correct for what they measure: the path from the first stop to the last is **929 m** as straight lines between waypoints (used in the product), and about **1.2 km** by the rover's own odometer, which counts every turn and wheel movement.

The product does not yet use the raw image service, the CTX mosaics or any radiation data.

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

Rules that apply to everything:
- **No NASA insignia, logotype or seal, and no JPL logo.** Both policy pages say these need prior written approval and are not in the public domain.
- **Never claim or imply endorsement** by NASA, JPL or Caltech.
- **Third-party material** on NASA sites can be copyrighted. Use only images whose caption credits NASA or its mission partners.
- Policy pages: https://www.nasa.gov/nasa-brand-center/images-and-media/ , https://www.jpl.nasa.gov/jpl-image-use-policy/ and https://www.uahirise.org/media/usage.php
