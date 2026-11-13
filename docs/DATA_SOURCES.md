# Data sources

Every dataset the project uses or plans to use. Update this file in the same change that adds, removes or reprocesses data.

**Status key:** *Reachable* means the endpoint answered and the content was inspected on the date shown. It does not mean the data has been processed or validated. Nothing here is in the product yet.

**Study site:** the boxwork region on Mount Sharp, Gale Crater. Curiosity's waypoints for sols 4500 to 4840 fall within about latitude -4.793 to -4.810, longitude 137.379 to 137.390 (east-positive), at elevations of about -3,690 m to -3,598 m. The exact start and end sols of the boxwork campaign still need a cited source.

**Usage terms:** not yet checked for any source below. Confirm and record the terms and required credit line for each before submission.

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

### Challenge resources not yet examined
- USGS Astrogeology interactive Mars maps: https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars
- Curiosity's proposed path up Mount Sharp: https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/
- More resources are due from the organisers on 14 Nov 2026.

## Science references still needed

- A cited account of what Curiosity found in the boxwork region and the sols it was there (angle 5).
- Cited limits for a suited walker: temperature, ultraviolet, radiation dose, slope, walking speed. Any limit without a source must be labelled as the team's assumption.
