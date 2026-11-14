# API notes

How each data service is called, tested on 14 Nov 2026. For the developers. What the data means, its limits and its usage terms are in `docs/DATA_SOURCES.md`; this file is about calling the services.

**"Browser access"** means whether a web page on another site is allowed to read the service directly (a rule called CORS). "Open" means the service allows any site. "Closed" means only a script can read it.

## Summary

| Service | In the product | Browser access | Speed and size | Documented by NASA? |
|---|---|---|---|---|
| Mars Trek map tiles | Yes: live online, stored copy offline | Open | 0.4 s, about 46 KB per tile | Yes (standard WMTS) |
| Curiosity location map tiles (colour imagery) | Yes: live online, stored copy offline | Works as map images | Not measured | No |
| Curiosity waypoints and traverse | Yes, through scripts | Open | 0.6 s, 665 KB (waypoints) | No |
| Curiosity daily weather (REMS) | Yes: through a script, and live in the Weather tab | Open | 0.6 s, 1.7 MB | No |
| NASA DONKI space weather | Yes: through a script with a key, and live in the page with the shared key | Open | Three requests per visit | Yes |
| Curiosity raw images | No. Needed for the photo comparison | Open, including the image files | 0.2 s per query | No |
| Mars Trek layer search | No. Useful for finding layers | Closed | 0.3 s | No |
| JPL Horizons | No. Could give the Earth to Mars signal delay | Closed | 0.3 s | Yes |
| Perseverance weather, InSight weather | No | Open | Small | Mixed |

**Most of the services the product depends on are undocumented.** They are the feeds behind NASA's own web pages. They work today, but NASA makes no promise about them and publishes no usage limits. The offline copy is the protection against that: keep it complete and fresh.

## Services in the product

### Mars Trek map tiles
- `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png`
- Each layer describes itself at `.../<layer>/1.0.0/WMTSCapabilities.xml`: extent, zoom levels, image format.
- Row comes before column. The grid is plain latitude and longitude, two tiles wide at zoom 0.
- The page loads one small tile at start to decide whether it is online (3-second limit).

### Curiosity waypoints and traverse
- `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json` (points) and `MSL_traverse.json` (the drives, as lines).
- One request returns the whole mission. No parameters, no paging.
- Waypoint fields used: `RMC` (site and drive joined by an underscore), `sol`, `lat`, `lon`, `elev_geoid`, `tilt`.
- Both grow as the rover drives. `--refresh` on the scripts fetches the latest.

### Curiosity daily weather
- `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json`
- One request returns every sol, newest first, under the key `soles`. Every value is text, with `--` for missing. There is no way to ask for a range of sols.
- The record stops at sol 4995 (25 Aug 2026).
- The data notes record that this feed refuses headless test browsers, so automated checks of the Weather tab see the stored copy, not the live feed.

### NASA DONKI space weather
- `https://api.nasa.gov/DONKI/<type>?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=<key>`
- Types used: `WSAEnlilSimulations` (model runs that forecast where solar storms arrive, including Mars), `SEP` (solar particles), `IPS` (shocks). `FLR` (flares) answered 404 on 14 Nov.
- At most 60 days per request.
- **Two keys, two uses:**
  - `scripts/prepare_space_weather.py` builds the stored record and needs a free personal key in the `NASA_API_KEY` environment variable. Never commit it.
  - The page itself uses NASA's shared `DEMO_KEY` to read the days after the stored record ends. A key in a web page is public, so a personal key must never go there.
- **`DEMO_KEY` is the weak point.** NASA limits it per visitor address. From the build environment it was already exhausted on 14 Nov: the server answered 429 and reported a limit of 10 requests. From a browser on the same day the page did read live space weather. So it works, but not reliably, and many people on one network share one allowance. When it fails the page uses the stored record and says its date.

## Curiosity raw images (for the photo comparison)

`https://mars.nasa.gov/api/v1/raw_image_items/`

Working query, all parts needed:

```
?order=sol%20asc
&per_page=100&page=0
&condition_1=msl:mission
&condition_2=<sol>:sol:gte
&condition_3=<sol>:sol:lte
&condition_4=<CAMERA>:instrument
&search=
&extended=thumbnail::sample_type::noteq
```

What was learned by testing:
- **Camera filter:** `condition_N=<CAMERA>:instrument` works. Camera names include `NAV_LEFT_B`, `NAV_RIGHT_B`, `MAST_LEFT`, `MAST_RIGHT`, `MAHLI`, `FHAZ_LEFT_B`, `CHEMCAM_RMI`. Joining two names with `|` returns nothing; make one request per camera.
- **Filtering by rover position does not work.** `site` and `drive` are ignored as conditions. Filter by sol and camera, then match `site` and `drive` in the script.
- **Paging:** at most 100 items per request. The response has `total` and `more`.
- **The last line of the query** removes thumbnails.

Each item includes:

| Field | Meaning |
|---|---|
| `https_url` | The image file. Allows browser access. About 280 KB for a navigation camera frame, 1024 × 640 |
| `image_credit` | The credit line to show, supplied per image: "NASA/JPL-Caltech" for the navigation cameras, "NASA/JPL-Caltech/MSSS" for the mast cameras |
| `site`, `drive` | Where the rover was. Match these to a waypoint's `RMC` |
| `sol`, `date_taken` | Mars sol and Earth time (UTC) |
| `extended.lmst` | Local Mars time when taken |
| `extended.mast_az`, `extended.mast_el` | Which way the mast was pointing, in degrees |
| `title`, `description` | Ready-made caption text |

### What is available at each curated stop

Images whose `site` and `drive` match the stop, taken on the arrival sol or the two sols after:

| Stop | Sol | Navigation camera (left) | Mast cameras |
|---|---|---|---|
| Altadena | 4560 | 36 | Cannot be matched |
| Nodule site | 4636 | 35 | Cannot be matched |
| Panorama viewpoint | 4671 | 38 | Cannot be matched |
| Monte Grande hollow | 4687 | 35 | Cannot be matched |
| Nevado Sajama ridge | 4711 | 32 | Cannot be matched |

- **Every curated stop has a full navigation camera sweep.** The pointing directions run all the way round, so the product could show "looking north, east, south, west" from each stop.
- **Mast camera images carry no position.** Their `site` and `drive` are empty, so they can only be tied to a stop by sol. Choosing which ones show the stop would have to be done by eye.
- The navigation cameras are black and white. The colour images are the mast camera ones.
- The ten extra rover stops and custom points were not checked.

**Recommendation if the comparison is built:** prepare it with a script, as the other data is. For each stop pick four to eight navigation camera frames spread by pointing direction, save their address, credit, direction and time to `data/processed/`, and copy the images into the offline bundle (about 280 KB each) so it works without a link.

## Other services tested

### JPL Horizons
- `https://ssd.jpl.nasa.gov/api/horizons.api`, documented at ssd-api.jpl.nasa.gov.
- Returns the distance from Earth to Mars and the one-way light time for any date. On 14 Nov 2026 it gave 1.324 astronomical units and **11.0 minutes**.
- Closed to browsers, so a script would have to prepare a table.
- Use: a line such as "Earth is 11 minutes away each way on this date". It supports the argument that the crew must decide for themselves, and it suits the offline story.

### Mars Trek layer search
- `https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?...&bbox=<west>,<south>,<east>,<north>&intersects=true`
- Lists every layer covering an area. It found 36 for Gale Crater, including thermal, mineral and elevation layers.
- Closed to browsers. Only needed when choosing layers.

### Not useful for this project
- **Perseverance weather feed** (`category=mars2020` on the same address as Curiosity's): a different crater, and it stops in April 2024 with many empty values.
- **InSight weather** (`api.nasa.gov/insight_weather`): a different site, and it returns one week from 2020.
- **NASA "Mars Rover Photos"** (`api.nasa.gov/mars-photos`): not tested, because the shared key was exhausted. The raw image service above covers the same need without a key.

## What could not be determined

- Usage limits on the undocumented feeds. None are published.
- Whether these results hold from a visitor's browser elsewhere. The speed and access tests ran from one cloud server.
- How often `DEMO_KEY` will be exhausted for judges.
