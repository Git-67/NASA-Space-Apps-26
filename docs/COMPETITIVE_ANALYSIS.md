# Competitive analysis: Martian Map challenge

Researched 13 Nov 2026, the day before the hackathon. **Status: the team agreed a wider version of the proposed angle on 13 Nov 2026. The agreed scope is in `CLAUDE.md` section 1; the single-angle proposal below is kept as the reasoning behind it.**

## Update, end of 14 Nov 2026: where the built product stands against the field

**The product is no longer the narrow one this analysis recommended.** During the day the team widened the scope: a path search, a journey mode, a helmet visor view, daily missions, a Weather tab and an offline mode were all added. Several of these are things this analysis advised against because the field already has them.

What we now share with most of the entries below:
- A path search (A*) with a slope limit. Ours runs only over ground Curiosity drove.
- A helmet visor view. Ours is a labelled browser simulation.
- A simulated walk of the plan, with tasks at each stop.
- Walking time, difficulty, hazards and a packing list.

What still sets it apart, as built and checked in a browser:
- **The verdict changes with the date, from real NASA data.** The same walk is Go on sol 4711, Caution on sol 2100 (the 2018 dust storm: colder than 99% of sols at that season), Caution on sol 1815 (a solar storm forecast to graze Mars) and No-go on sol 1947 (a forecast direct hit). No entry we read lets conditions decide.
- **Space weather aimed at Mars.** It uses NASA's forecasts of solar storms arriving at Mars, not just events seen from Earth.
- **Every limit is NASA's own, and labelled lunar**, with NASA's statement that the Mars figures are still to come.
- **It only walks where a rover has driven**, and says why: our elevation data cannot judge slopes at a walker's scale.
- **It works with no link to Earth**, from a copy stored with the site, and says how old that copy is.
- Every number shows its basis.

What the field has that we do not: 3D views, suit consumable models, more than one site, rock detection.

**The risk this creates for judging:** a judge who sees a route planner with a helmet view may file it with the other dozen. The pitch must lead with the verdict and the evidence, and present the journey and visor as the way a crew would use the verdict, not as the product.

Two things from the agreed plan are still not built: the orbit and ground photo comparison, and a guided storm replay.

## How far to trust this

- It covers 12 public GitHub repos found by web search. Seven were read in detail. Hundreds of teams worldwide will enter this challenge, and most have no public repo, so this is a sample, not the field.
- Everything about competitors is **self-reported in their READMEs**. No demo was opened or tested.
- Our first judges are the Singapore local judges, and no Singapore team was identified in this sample.
- Several of these repos already have dozens to hundreds of commits before the event starts. Check the Space Apps participant terms on pre-event work before assuming we may do the same: https://www.spaceappschallenge.org/legal/

## What the field looks like

| Project | Site | What it is | Scale | Weakness they admit |
|---|---|---|---|---|
| [Team Protikriti](https://github.com/AhsanulHoque22/Nasa-Space-Apps-Challenge-2026-Team-Protikriti) | Jezero | 3D globe, rover street view, weather panels, A* route planner, mission replay | 456 commits, live demo | Go/no-go is based on the route only; weather, radiation and time of day do not feed it |
| [Code Huzzlers](https://github.com/RISHI-1453/NASA_Space-Apps_Challenge_Martian_Map) | Whole planet, 5 preset walks (incl. Gale boxwork) | Layers, A* routing, suit consumables, HUD, 3D globe, printable relief models | 23 commits | "Live weather, dust opacity and RAD dose by sol are not yet included" |
| [MarsWay](https://github.com/ahsanur-official/Interplanetary-Survival-Guide-Martian-Map) | Any (Jezero demo) | 2D map, 3D globe, first-person HUD, voice assistant, three route options | 40 commits, live demo | Many values are modelled or simulated; coarse elevation |
| [MONSTER4REX](https://github.com/MONSTER4REX/Martian-Map) | Jezero | Research-grade route planner with rock detection models | 36 commits, 208 tests | "Untested on real data"; thermal and radiation screening are placeholders |
| [MarsPath](https://github.com/25243060-creator/martian-map-route-planner) | Jezero | A* on a HiRISE slope map, science stops, 5 km return radius | 12 commits, live demo | Weather and radiation listed as future work |
| [Kyung Hee HUD](https://github.com/Ercadion/Martian-Map) | Gale boxwork | Helmet HUD prototype with eye tracking | 3 commits | Terrain, weather and layers are simulated |
| [ARES//NAV](https://github.com/SinuraWahalathanthri/ares-nav-martian) | Gale boxwork | Retro HUD, safest/fastest/max-science routes, oxygen and dose budgets | Not read in detail | Unknown |

Also seen, not read in detail: MarsNav (Jezero), ARIADNE, marswalk-planner (Jezero), RedMap, mars-traverse.

### Patterns

1. **Everyone answers "where".** Nearly every entry is an A* route planner that avoids slopes above about 15 to 25 degrees. This is the default build, and it is saturated.
2. **Jezero dominates.** Gale is less crowded, though at least three teams chose the boxwork region.
3. **Feature count is the main strategy.** Globes, HUDs, voice control, 3D printing. We cannot win on feature count with our skills and 39 hours.
4. **Validity is the soft spot.** Many entries rely on simulated or placeholder values. Coarse elevation data cannot see the rocks that actually stop a walker.
5. **Nobody answers "when".** Environmental data is shown as a panel or left as future work. In no project we read does weather, radiation, daylight or season change the plan.

## The gap

The challenge text asks for "updates on current conditions" and puts astronaut safety first, naming radiation and space weather. The field treats Mars as a static terrain problem. Conditions on Mars swing hard by hour and by season: temperature, ultraviolet, dust and daylight all change what a suited walk can safely do.

## Proposed angle: the Marswalk window

> Every other map tells an astronaut where to walk. Ours tells them when.

A hyperlocal briefing for **one** walk in the boxwork region of Mount Sharp, Gale Crater, that turns Curiosity's measured environmental record into a go / caution / no-go window by season and local time.

**Why Gale**
- Curiosity's REMS station has recorded weather there since 2012, about 5,000 sols.
- Curiosity's RAD is the only instrument that has measured radiation on the Martian surface.
- The challenge text itself uses the Mount Sharp boxwork as its example, and one of the five official resources is Curiosity's path up Mount Sharp.
- Fewer teams are there than at Jezero.

**Minimum product (must work by Sunday afternoon)**
1. A map of the boxwork area with Curiosity's real traverse as the proven route, and three to five science stops.
2. For each stop, the orbital view beside the rover's own ground photo, so the astronaut knows what to expect on arrival.
3. A "walk window" view: pick a season, see daylight hours, expected temperature range, ultraviolet level and dust, each with the spread seen across past Mars years, and a go / caution / no-go verdict against stated limits.
4. A source caption on everything.

**Stretch, only if the minimum is done**
- Radiation dose for the walk from RAD data.
- A slope layer from an elevation model.
- A simple forecast for the next sols.

**Data (three kinds, three missions)**

| Kind | Source | Access checked? |
|---|---|---|
| Atmospheric | Curiosity REMS, via the mars.nasa.gov weather feed | Yes, the feed responds and has daily records |
| Optical (orbit) | MRO HiRISE and CTX, via Mars Trek | No |
| Optical (ground) | Curiosity Mastcam and Navcam raw images | No |
| Topographic | MGS MOLA, via Mars Trek | No |
| Radiation | Curiosity RAD, via NASA PDS or CDAWeb | No ready-made daily table was found |

**Why it suits this team**
- The core is time-series analysis in Python, which three of us study. It avoids aligning large raster datasets, which is where map projects lose their weekend.
- The physics and materials student can own the limits: what temperature, ultraviolet and dose a suit and a person can take, with citations.
- The site is static HTML, CSS and JavaScript, which we already know.

## Risks, stated plainly

- **The weather feed is labelled "for outreach purposes only"** by its provider, and points to the PDS archive for science use. We must say so in the product, or use the PDS data instead.
- **Past climate is not "current conditions".** We can show what is typical for a season and how much it varies. We cannot show live Mars weather for a future crew, and we must not claim to.
- **One station is one place.** REMS describes Curiosity's location on the day it measured, not all of Gale.
- **Suit limits are not public in a tidy form.** If we cannot cite a limit, it must be labelled as our assumption.
- **Radiation may not make it in.** Without an easy data table, it could be reduced to a published average with a citation.
- **Boxwork coordinates and high-resolution terrain coverage are not yet confirmed.**
- **Uniqueness is not guaranteed.** Another team outside this sample may have the same idea.
- **It is less flashy than a 3D globe.** It wins on Validity and Relevance, and it needs a strong pitch to score on Presentation.
