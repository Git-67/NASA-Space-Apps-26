# Session handoff: Sol Stroll

Updated at the end of Saturday 14 Nov 2026 (hackathon day one), from the state of `main`, with Sunday 15 Nov's changes added below. Read this first, then `CLAUDE.md` and `README.md`.

## Where things stand

- **Deadline: Sunday 15 Nov 2026, 23:59 SGT.** Mentor Q&A on Sunday at 5:00 PM SGT.
- **The product is built and on `main`.** GitHub Pages serves `main`. `README.md` lists what works.
- 91 automated tests pass on the branch in pull request 24 (65 on 14 Nov), and the page loads with no errors in dark and light themes (checked in a headless browser).
- **Open pull request:** [Git-67/NASA-Space-Apps-26#24](https://github.com/Git-67/NASA-Space-Apps-26/pull/24), saving the site on the device and a sharp offline map. Pull request 22 (three views, ground photos, map turning, arrival check, signal detector) is merged.
- **The submission materials are not started:** the project summary, the project details, and the seven slides or the video. These are required, and they are scored.
- Work reaches `main` by pull request from a branch. Several people and more than one assistant session are working at once, so pull `main` before starting.

## What changed on 14 Nov

The team widened the scope during the day. `CLAUDE.md` section 1 records each change.

| Added | What it is |
|---|---|
| Path search | The shortest path between stops over ground Curiosity drove, within NASA's 20° slope figure (A* search) |
| More stops | Ten places where Curiosity parked, and points the crew adds by tapping the map |
| Daily missions | Five practice objectives, rotating by sol. Ours, not NASA's |
| NASA's rules in the verdict | 8-hour walk limit, 2 km walk-back limit (both lunar figures) |
| Space weather | NASA DONKI: solar storms forecast to arrive at Mars, and particles detected near Earth |
| Begin journey | A full-screen simulated walk for a tablet, with tasks, hazard warnings and sound cues |
| Visor view | A simulated helmet visor showing only the critical readings |
| Weather view | Conditions at a glance, charts, and a "dust watch" |
| Ground photos (15 Nov) | Camera badges beside each stop open Curiosity's navigation camera frames from that spot, eight directions each, stored with the site |
| Turn the map (15 Nov) | Two fingers twist the map on a tablet; a compass button puts north back |
| Arrival check (15 Nov) | On reaching a stop in a journey: the stop's ground photos and a hold-and-slide "I am here" before the tasks |
| Hold and slide (15 Nov) | Ending a walk takes a held handle slid across, replacing the three-step confirmation |
| Signal detector (15 Nov) | The manual online and offline button is gone. The page checks its link to NASA and switches by itself |
| Three views (15 Nov) | Tabs in the top nav: Map (the map alone, verdict as a pop-up), Briefing and Weather (dashboards). The address keeps the view: `#map`, `#briefing`, `#weather` |
| Offline mode | Everything works from a copy stored with the site. Since 15 Nov the offline colour imagery is stored at NASA's full resolution (it was 4x coarser and blurry when zoomed in), at JPEG quality 85 |
| Saved on the device (15 Nov, [pull request 24](https://github.com/Git-67/NASA-Space-Apps-26/pull/24), not yet merged) | A service worker (`sw.js`) saves the whole site (about 18 MB) on the device after the first visit, keeps NASA map tiles the device has looked at, and the latest space weather it read. The site then reopens with no signal. Checked in a headless browser only, not on a tablet. Run `python3 scripts/build_offline_manifest.py` before each release |
| Map layers | Contours, colour imagery, place names, a grid |

## Not built

1. **The orbital view beside the ground photo** (the "how sure" question). The ground photos are built and open from the map; they are not shown side by side with the orbital image.
2. **A guided storm replay.** Typing a sol works; nothing steps through the storm.

## Decisions already made (do not reopen without a reason)

| Topic | Decision |
|---|---|
| Product | Sol Stroll, "Know before you go." A go / no-go briefing for one Marswalk |
| Site | Mount Sharp boxwork, Gale Crater. One site only |
| Route | Shortest path within NASA's slope figure, over rover-driven ground only. Never across ground no rover crossed |
| Verdict | Five checks: space weather, 8-hour limit, 2 km limit, daylight, how unusual the sol is for its season. No invented temperature, ultraviolet or dose thresholds |
| Safety figures | NASA's own wherever one exists, labelled "lunar". Ours only where NASA has none, labelled "ours" |
| Visor | A browser simulation, labelled as such. No helmet or headset |
| Stack | Static HTML, CSS and JavaScript, no build step. Leaflet vendored. Python for data |
| Online and offline | Automatic. Live NASA data when there is signal; the stored copy otherwise, with its date shown. No manual switch. The device saves the whole site after the first visit; live NASA data services are never answered from that store |
| Design | `DESIGN.md` is binding. `src/styles/tokens.css` is generated from it |
| Pitch | Seven slides. Opening ends: "Your map tells you where. Sol Stroll tells you when, and when not to." |

## Suggested order for Sunday

1. **Write the submission.** Summary, details, and the seven slides from `docs/PITCH.md`. Nothing else is required, and nothing else is as far behind.
2. **Have the science lead work through the checklist** in `docs/SCIENCE_BRIEF.md` section 6. Much of what the product says is marked "ours".
3. **Test on a real tablet and a real phone**, in both themes, online and offline: open the GitHub Pages address with signal, wait for "Saved on this device" in the footer, switch on airplane mode, reload, and zoom in on the map and open a ground photo.
4. Only then consider the photo comparison. It is the best missing feature, and it is not required.
5. Stop adding features by mid-afternoon. `main` is what the judges open.

## Problems found while rechecking, not fixed

These were found by reading `main` on 14 Nov. None was changed, because this pass covered the documents only.

- **Pressing "Today" gives "No verdict".** Curiosity's weather record ends on 25 Aug 2026 (sol 4995), so today's sol has no rover weather and the verdict card reads "No verdict: no rover weather for this sol". The space weather for today is read correctly. This is honest, but it is a poor thing to show a judge: demonstrate with a past sol (4711, 2100, 1815, 1947), not with Today.
- **The live space weather uses NASA's shared demonstration key** in the page. NASA limits it to a few requests an hour per visitor address. It worked in testing, and the page falls back to the stored copy, but a busy judging network could exhaust it. See `docs/API_NOTES.md`.
- **The Weather tab's code is still outside the code rules:** one file of about 800 lines in `src/pages/`, with its own cut-offs for "usual" and "unusual". Its styling was brought into the design spec on 14 Nov.
- **The Weather tab has a non-NASA fallback source.** If NASA's feed does not answer, it tries a community mirror (`api.maas2.apollorion.com`) before the stored copy. See `docs/DATA_SOURCES.md`.
- **Place-name labels can cover the route's hazard callouts** when that layer is switched on. It starts off for that reason.
- **Three other files are over the 250-line rule:** `journey-mode.js`, `visor-view.js`, `plan-model.js`.
- **No automated lint or type check** exists, so `// @ts-check` is unenforced.
- **The offline file list can go stale.** `offline-manifest.json` must be rebuilt (`python3 scripts/build_offline_manifest.py`) after any change under `src/`, `public/` or `data/processed/`. A test fails if it lists a missing file, but nothing catches a new file left off it.
- **"Saved for good" is up to the browser.** The page asks; in testing the browser refused, which is normal for a site not installed. Safari may clear the copy unless the site is on the home screen.
- **The competitive position is weaker than planned.** The product now has a route search and a helmet view, as most rival entries do. `docs/COMPETITIVE_ANALYSIS.md` says how to pitch around that.

## Not verified

- Surface radiation figures and the September 2017 solar storm figure: from search summaries only.
- Two inferences in the science brief about which NASA sample is which drill hole.
- The compass direction of each ground photo. It is the rover's heading plus the camera's angle, on our reading of what that angle is measured from. Not confirmed against NASA documentation.
- The coordinate convention and elevation datum of the rover position files.
- Usage terms for the Mars Trek service and the rover position files.
- Whether judges accept the outreach-labelled weather feed.
- The space weather rule, the daily missions, the tasks, the packing list and the dust watch: all ours, none reviewed by the science lead.
- The light theme at tablet and phone size, keyboard-only use, a screen reader.
- The offline store on a real device: it was tested only in headless Chromium.
- The date of the orbital images, which the pitch opening refers to.

## Technical notes

- **How each NASA service is called:** `docs/API_NOTES.md`.
- **Reading NASA PDFs:** a page fetch cannot read them, but the saved file can be read with `pdftotext -layout`.
- **Cloud sessions:** `npx` is blocked, so there is no linter. `spaceappschallenge.org` and the Mars Trek home page cannot be fetched. Headless Chromium and Playwright are available for checking the page. The rover weather feed refuses headless browsers, so automated checks of the Weather tab see the stored copy.
- **Personal handoff notes** matching `handoff*.md` are ignored by git. This file is the shared one.

## How the user wants to be answered

- State hard truths plainly. No reassurance. Say what is weak.
- End every reply with a confidence figure in the form `[Confidence: NN%]`.
