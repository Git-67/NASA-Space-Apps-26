# Pitch material

Owned by the storyteller and the editor. Rechecked against the sources and the built product on 14 Nov 2026. Every factual line must be cleared by the science and data lead against `docs/SCIENCE_BRIEF.md` before it goes on a slide.

## Name and tagline

**Sol Stroll.** Know before you go.

## Problem statement

> The first astronauts on Mars will have superb maps of where to walk, and nothing that tells them whether today is the day to do it. Sol Stroll joins Curiosity's path, orbital imagery, science findings and 14 years of measured conditions into one go / no-go briefing for a single real Marswalk.

Shorter, for a form field:

> Mars maps show where to walk. Sol Stroll tells a crew whether to go: one briefing for one real Marswalk, built from NASA mission data.

"14 years" is the span of the weather record in the product (Aug 2012 to Aug 2026).

## Opening (agreed 14 Nov)

> "You're on Mars. Your science target is five hundred metres away. The ground is flat. The route is clear.
>
> Do you go?
>
> Your map says yes. Your map is looking at a photo taken years ago. It doesn't know what today is like.
>
> Your map tells you where. Sol Stroll tells you when, and when not to."

Notes:
- Pause after "Do you go?".
- **"Five hundred metres" replaces the placeholder "four hundred".** The furthest point of the route is 537 m from the start in a straight line. Say "five hundred".
- "The ground is flat" is not true of this route, which climbs about 60 m. Either drop the sentence or keep it as the imagined scene before the reveal. The editor should decide.
- "A photo taken years ago" still needs the real date of the HiRISE images in the mosaic. Until someone finds it, say "a photo taken from orbit".

## Seven slides

Each slide names the judging criterion it is there to win.

| # | Slide | What it says | Criterion |
|---|---|---|---|
| 1 | **Do you go?** | The opening, over the logo. Nothing else on the slide | Presentation |
| 2 | **The problem** | Orbital maps are static. Mars is not: in the 2018 dust storm the daily high at Curiosity's site fell from 4 °C to −29 °C in six weeks. And a crew cannot wait for Earth: a signal takes from about 3 to about 22 minutes each way | Impact |
| 3 | **What we built** | One real walk in the Mount Sharp boxwork, answering five questions: why, where, when, how sure, what if. Use `docs/screenshots/briefing-dark.png` | Relevance |
| 4 | **Why this walk** | The boxwork: groundwater that outlasted the lakes. Curiosity needed nine months and four drill holes to work through it. At NASA's planning pace the whole route is about half an hour's walk each way | Impact, Creativity |
| 5 | **The evidence** | The data table: which mission, which instrument, what it gives us. Then the honesty: what is measured, what is derived, what is our assumption | Validity |
| 6 | **What makes it different** | The entries we reviewed plan a route. Ours gives a verdict, and it changes with the sol. Use `docs/screenshots/briefing-dust-storm.png`: the same walk turns to Caution in the 2018 storm | Creativity |
| 7 | **Know before you go** | What a crew gets, what comes next, the link, the team, the non-endorsement line | Presentation |

Rules for the deck:
- One idea per slide. If a slide needs two sentences of explanation, it is two slides or it is cut.
- Slides use the **light theme** (see `DESIGN.md`). The two screenshots in `docs/screenshots/` are dark; retake them in light for the deck.
- Every number has its source in small text at the bottom of the slide.
- Slide 5 is where this project beats the field. Do not cut it for time.

An optional picture for slide 4: NASA's 2019 animation of Curiosity's *proposed* path up Mount Sharp (one of the challenge's own resources) beside the path the rover actually drove. Credit it as NASA/JPL-Caltech/ESA/University of Arizona/JHUAPL/MSSS/USGS Astrogeology Science Center.

## If it is a 30-second video instead

| Seconds | Content |
|---|---|
| 0 to 8 | The opening, shortened: "You're on Mars. Your target is five hundred metres away. The route is clear. Do you go?" |
| 8 to 20 | Screen recording: the map, ticking stops, the plan and the verdict updating |
| 20 to 27 | Type sol 1815 (13 Sep 2017): NASA forecast a solar storm at Mars and the verdict turns to Caution by itself. Type sol 1947: a forecast direct hit, No-go. Then press Present for today's live reading |
| 27 to 30 | Logo and tagline |

A 30-second video cannot carry the evidence slide. **The slides are the safer choice for this project**, because its strength is Validity.

## Numbers you can use, and their status

| Claim | Status |
|---|---|
| The route is 1,113 m long, start to last stop | Derived from Curiosity's drives (traverse file). Say "about 1.1 kilometres". The old 929 m figure joined waypoints with straight lines; do not use it |
| Never more than 537 m from the start | Derived. Say "about 500 metres" |
| The full walk with all five stops takes about 3 h 50 min | Estimate from the product: 67 minutes of walking (2.2 km out and back) at 2 km/h plus 2 h 45 min of work at the stops. **The work time is our assumption** |
| 2 km/h walking pace | Read from NASA EVA-EXP-0042, section 4.2.1.3.1. **It is NASA's lunar planning figure.** Always say "the pace NASA plans lunar walks at" |
| Slopes up to 20° | Read from the same document, section 4.2.1.3. Lunar |
| Spacewalks of up to 8 hours | Read from the same document, section 4.1.4 |
| NASA has not yet set walking ranges for Mars | Read: the document's Mars section says they are "forward work". This is a strong line: it shows the gap is real |
| Career radiation limit of 600 mSv | Read from NASA-STD-3001 Volume 1 Revision C, section 4.8.2 |
| 4 °C to −29 °C in the 2018 storm | From the weather feed, sols 2060 and 2100, daily maximum air temperature. The feed is labelled outreach-only |
| The storm sol was colder than 99% of sols at that season | Derived by the product from the same feed |
| A signal takes about 3 to 22.4 minutes each way | NASA's Mars Relay Network page, found through a search summary. Open the page before using it |
| Nine months and four drill holes | Derived from the waypoint file and the mission blog |
| Surface radiation rose two to three times in the Sept 2017 solar storm | From search summaries of three papers. Not opened. Do not put a number on a slide until someone reads one of them |

## Claims to avoid

| Do not say | Because |
|---|---|
| "Every other tool only plans the route" | We read 12 public entries out of hundreds. Say "the entries we reviewed" |
| "Live" or "current" Mars weather | The product shows what Curiosity measured on past sols |
| "Too cold" or "too much radiation" for a suit | No public limit exists for a Mars suit |
| "Automatically plans your route" | It builds a plan along Curiosity's path. It does not find routes |
| "NASA's packing list" | The packing list is ours |
| The logo or idea is "unique" | Not established |

## Required closing line

> Sol Stroll was created for the NASA Space Apps Challenge 2026. It is not affiliated with or endorsed by NASA.
