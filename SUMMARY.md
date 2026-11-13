# Session handoff: Sol Stroll

Written the night of 13 Nov 2026 for the next working session. Read this first, then `CLAUDE.md`.

## Where things stand

- **The hackathon starts Sat 14 Nov 2026, 09:00 SGT** and ends Sun 15 Nov, 23:59 SGT.
- **Nothing is built.** The repository holds planning documents and a logo. There is no website yet.
- **Work happens on the branch `claude/clever-rubin-0bn3pi` and reaches `main` by pull request.** Earlier work was merged to `main` in pull requests 1 and 2. GitHub Pages serves `main`. Check that the latest pull request has been merged before assuming `main` is current.
- The organisers confirmed that work done before the event is allowed.

## The project in one paragraph

**Sol Stroll. "Know before you go."** An entry for the NASA Space Apps Challenge 2026, challenge "Interplanetary Survival Guide: Martian Map". It is a go / no-go briefing for **one real Marswalk** in the boxwork region of Mount Sharp, Gale Crater, following Curiosity's own path. It answers five questions on one map: why go, where, when, how sure, what if. The angle is that the other entries we reviewed plan a route, and none lets conditions change the plan.

## Decisions already made (do not reopen without a reason)

| Topic | Decision |
|---|---|
| Site | Mount Sharp boxwork, Gale Crater. One site only |
| Route | Curiosity's recorded path. No pathfinding algorithm |
| Stops | Five: Altadena, nodule site, panorama viewpoint, Monte Grande hollow, Nevado Sajama ridge |
| Verdict | Based on daylight, how unusual the sol is for its season, and whether a solar storm is under way. No invented temperature, ultraviolet or dose thresholds |
| Out of scope | Other sites, 3D globe, helmet display, automatic route finding |
| Stack | Static HTML, CSS, JavaScript with JSDoc and `// @ts-check`. No framework, no build step. Leaflet for the map. Python scripts for data preparation |
| Hosting | GitHub Pages from `main`. Already switched on |
| Design | Two themes, dark by default. Slides use the light theme |
| Logo | Wordmark with an orange sun disc as the "o" in "Sol". No favicon, no separate symbol |
| Demo format | Seven slides recommended over the 30-second video |
| Team registration | Done |

## The team

Five students: three studying applied AI and analytics, one in engineering, one starting materials science and physics. Skills: Python, HTML, CSS, basic JavaScript, Figma, basic Power BI, Git.

Roles: developer (map), developer (data and charts), science and data lead, storyteller, editor and critic. Details are in `CLAUDE.md` section 1.

## Files

| File | What it is |
|---|---|
| `CLAUDE.md` | Rules for all work in the repo, plus project context, scope, roles and stack |
| `DESIGN.md` | The design specification: tokens, components, chart and map rules, logo rules. Binding for all interface work |
| `docs/COMPETITIVE_ANALYSIS.md` | What 12 public competing entries are building, and the gap we chose |
| `docs/DATA_SOURCES.md` | Every data source, what it contains, the limits found, and usage terms |
| `docs/SCIENCE_BRIEF.md` | The science question, the five stops with coordinates, terrain facts, safety limits, and a checklist for the science lead |
| `docs/PITCH.md` | Problem statement, opening lines, seven-slide outline, facts not yet cleared |
| `public/brand/` | `logo-on-dark.svg` and `logo-on-light.svg` |

## Next step: build the first working page

The user asked for this to happen after the pre-hackathon materials were settled. Those are now drafted. **The last question put to the user was not answered: should the team review the three documents first, or should the build start straight away?** Ask this first.

Suggested first build, smallest useful version:
1. `index.html` at the repository root, with the design tokens from `DESIGN.md` mirrored into `src/styles/`.
2. A Leaflet map with the HiRISE basemap, centred on the boxwork.
3. Curiosity's path for sols 4540 to 4840 and the five stops as markers.
4. A Python script in `scripts/` that turns the weather feed into a small JSON file in `data/processed/`.
5. Loading, empty and error states, and a source caption under the map.

Then, in order: the walk-window view, the orbit and ground photo comparison at each stop, the dust storm replay.

## Technical facts learned the hard way

**Mars Trek tiles**
- Pattern: `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png`
- The order is zoom, then **row, then column**, which is the reverse of Leaflet's usual x then y.
- The grid is plain latitude and longitude with **two tiles across at zoom 0**. Leaflet needs a custom coordinate system for this (likely `L.CRS.EPSG4326`); this has not been tried.
- Column = floor((lon + 180) / 360 × 2^(z+1)). Row = floor((90 − lat) / 180 × 2^z).
- Layers confirmed at the site: `curiosity_hirise_mosaic` (zoom to 16), `curiosity_ctx_mosaic` (10), `Gale_CTX_BlockAdj_dd` (12), `Gale_DEM_SMG_1m` (14, a rendered picture, not elevation values).
- Whether the tile server allows requests from a browser on another domain (CORS) has **not** been tested. Image tiles usually work in Leaflet regardless, but test early.

**Curiosity position data**
- `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json` and `MSL_traverse.json`.
- Waypoint fields include `sol`, `lat`, `lon`, `elev_geoid`, `tilt`, `dist_km`, `site`, `drive`, and `RMC` (site and drive joined by an underscore).

**Curiosity raw images**
- Working query form: `https://mars.nasa.gov/api/v1/raw_image_items/?order=sol%20desc&per_page=N&page=0&condition_1=msl:mission&condition_2=<sol>:sol:gte&condition_3=<sol>:sol:lte&search=&extended=thumbnail::sample_type::noteq`
- Images carry `site` and `drive`, which match the waypoint file. This is how a photo is tied to a place.
- Putting an instrument name in `search` returned nothing. The correct instrument filter is unknown.

**Weather feed**
- `https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json`, records under the key `soles`, all values are strings.
- Daily only. Dust opacity, wind and humidity are unusable. Ultraviolet is a category. Labelled "for outreach purposes only".

**Whether a browser can fetch these directly is untested.** The plan avoids the question: Python scripts download and trim the data, and the site loads the local result.

**This cloud environment**
- `curl` to `spaceappschallenge.org` failed on certificates, and the page fetch tool got a 503. The user pasted the challenge text instead.
- `npx @google/design.md lint DESIGN.md` was blocked, so the design file has never been linted. Its front matter was parsed with Python and all token references resolve.
- A scratch copy of the Space Grotesk font and the logo build scripts existed only in the previous session's temporary folder and are gone. The logo files in the repository are final outlines and need no font.

## What is not verified

- **Safety limits:** every number came from search result summaries. The source documents were not opened.
- **Two inferences in the science brief:** which unnamed NASA sample matches which named drill hole.
- **The coordinate convention and elevation datum** of the waypoint file.
- **Usage terms** for Mars Trek imagery and the position files.
- **Radiation data:** no usable table was found. The user expects the organisers to supply radiation data on 14 Nov; nothing supports that expectation.
- **Neither theme has been rendered.** The design is computed, not seen.
- **Pitch facts not cleared:** the 20-minute signal delay, the date of the orbital imagery, "four hundred metres" in the opening (the real route is about 1.2 km).
- **The competitive analysis** covers 12 self-described public entries out of a field of hundreds, none from Singapore.

## Open items for the user

1. Review first, or build first?
2. Merge the open pull request so `main` holds the logo, science brief, pitch outline and this summary.
3. The organisers publish more resources on 14 Nov. Paste the Resources tab into the session, since the page could not be fetched from here.
4. The opening's closing line is a suggestion awaiting confirmation: "Your map tells you where. Sol Stroll tells you when, and when not to."

## How the user wants to be answered

- State hard truths plainly. No reassurance. Say what is weak.
- End every reply with a confidence figure in the form `[Confidence: NN%]`.
