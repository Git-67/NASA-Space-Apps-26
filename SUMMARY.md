# Session handoff: Sol Stroll

Updated 14 Nov 2026 (hackathon day one), after the documents were rechecked against the sources. Read this first, then `CLAUDE.md` and `README.md`.

## Where things stand

- The hackathon runs Sat 14 Nov 09:00 SGT to Sun 15 Nov 23:59 SGT. Optional mentor Q&A: Saturday 8:00 PM and Sunday 5:00 PM SGT.
- **A first working page exists.** See `README.md` for what it does and how to run it.
- Work happens on the branch `claude/clever-rubin-0bn3pi` and reaches `main` by pull request. GitHub Pages serves `main`, so the site is only live once the latest pull request is merged.
- The organisers sent no extra data. Radiation stays as cited published figures.

## Decisions already made (do not reopen without a reason)

| Topic | Decision |
|---|---|
| Product | Sol Stroll, "Know before you go." A go / no-go briefing for one Marswalk |
| Site | Mount Sharp boxwork, Gale Crater. One site only |
| Route | Curiosity's recorded path, out and back from the first stop. No pathfinding |
| Stops | Altadena, nodule site, panorama viewpoint, Monte Grande hollow, Nevado Sajama ridge. The route is 929 m one way |
| Verdict | Daylight, how unusual the sol is for its season, and a solar storm alert. No invented thresholds |
| Stack | Static HTML, CSS and JavaScript, no build step. Leaflet vendored. Python for data |
| Design | `DESIGN.md` is binding. `src/styles/tokens.css` is generated from it |
| Pitch | Seven slides. Opening ends: "Your map tells you where. Sol Stroll tells you when, and when not to." |

## What the team asked for on 14 Nov, and how it was met

| Request | Status |
|---|---|
| Something like Google Maps, for Mars | Built as a 2D map with a side panel. A 3D globe stays out of scope |
| Automatic trip planner based on NASA missions | Built as a plan generated from Curiosity's path and the ticked stops. It does not find new routes |
| Dangers on the selected route | Built, each with its basis |
| Things to pack | Built, labelled as the team's own suggestion |
| Travel time and difficulty per section | Built. Time rests on an assumed 2 km/h; difficulty on rover tilt |

## Next steps, in order

1. Orbit and ground photo comparison at each stop (the "how sure" question). The raw image query is in the notes below.
2. A guided dust storm replay: step through sols 2060 to 2100 and watch the verdict change.
3. A season view: choose a time of year instead of a past sol, and see the spread across Mars years.
4. Show something to the mentors at Saturday 8 PM.

## The five challenge resources

Mars Trek is used for the basemap. Curiosity's 2019 proposed path is a reference and a pitch picture, not data. The USGS interactive maps page could not be read here; a teammate should open it in a browser. NASA Worldview shows Earth and the Perseverance gallery shows a different crater, so neither can be used. Details are in `docs/DATA_SOURCES.md`.

## Technical notes

- **Reading NASA PDFs:** the page fetch tool cannot read them, but it saves the file, and `pdftotext -layout` then extracts the text.

- **Mars Trek tiles:** `https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{y}/{x}.png`. Row before column. Works in Leaflet with `L.CRS.EPSG4326`, extended with Mars' radius so the scale bar is right. Confirmed loading in a browser.
- **Curiosity raw images:** `https://mars.nasa.gov/api/v1/raw_image_items/?order=sol%20desc&per_page=N&page=0&condition_1=msl:mission&condition_2=<sol>:sol:gte&condition_3=<sol>:sol:lte&search=&extended=thumbnail::sample_type::noteq`. Images carry `site` and `drive`, matching the waypoint `RMC`. The instrument filter is unknown.
- **This cloud environment:** `npx` is blocked, so there is no linter or type checker. `spaceappschallenge.org` cannot be fetched. Headless Chromium and Playwright are available for checking the page.

## Not verified

- Now verified by reading the NASA documents: the 2 km/h lunar walking pace, the 20° slope figure, 8-hour spacewalks, the statement that Mars walking ranges are "forward work" (all EVA-EXP-0042 Rev B), the 600 mSv career limit (NASA-STD-3001 Vol 1 Rev C), and the HiRISE credit line.
- Surface radiation figures and the September 2017 solar storm figure: still from search summaries only.
- Two inferences in the science brief about which sample is which drill hole.
- The coordinate convention and elevation datum of the waypoint file.
- Usage terms for the Mars Trek service and the waypoint file. Mars Trek's page and the USGS interactive maps page could not be read from this environment.
- Whether the outreach-labelled weather feed is acceptable to judges. Ask the technical mentor.
- The light theme on a phone, keyboard-only use, and a screen reader.

## How the user wants to be answered

- State hard truths plainly. No reassurance. Say what is weak.
- End every reply with a confidence figure in the form `[Confidence: NN%]`.
