# Science brief: the boxwork Marswalk

Drafted 13 Nov 2026, rechecked against the sources on 14 Nov 2026. For the science and data lead to verify. **A fact marked Read was taken from the source itself; anything else needs that person's check before it goes in the product or the pitch.**

How to read the status column:
- **Read**: the source page was opened and the fact was taken from it.
- **Snippet**: the fact came from a search result summary. The source itself was not opened. Treat as a lead.
- **Derived**: calculated from data we downloaded. The calculation is described.
- **Ours**: the team's own reasoning or assumption. Must be labelled as such wherever it appears.

## 1. The science question

> **How long did groundwater last on Mount Sharp as Mars dried out, and could it have kept this place habitable?**

Why this question:
- The boxwork sits in a layer rich in magnesium sulfates, which form as water dries up. The ridges show groundwater was still flowing during that drying. (Read: JPL release 2025-080)
- Finding boxwork this high on the mountain suggests the water table was high, so water that could sustain life may have lasted longer than orbital views suggested. (Read: JPL release 2026-013, quoting mission scientist Tina Seeger)
- Neither Curiosity nor orbiters have seen boxwork anywhere else on Mount Sharp. (Read: JPL release 2025-080)

Questions the mission says are still open (Read: both releases):
1. Why did the ridges harden into these large patterns, and why only here?
2. Why do the pea-sized nodules appear on ridge walls and in hollows, not near the central fractures?
3. Why did calcium sulfate veins reappear in this layer?
4. Do the cemented ridges preserve evidence of a habitable environment?

These open questions are the reason to send a person. The walk is designed around them.

## 2. The terrain a walker would meet

| Fact | Status |
|---|---|
| Ridges are roughly 1 to 2 m tall, with sandy hollows between them | Read: JPL 2026-013 |
| Ridges are not much wider than the rover | Read: JPL 2026-013 |
| Ridgetops were relatively easy to drive; sand in the hollows could cause wheel slip | Read: JPL 2026-013 |
| A rover engineer said of the ridgetops: "It almost feels like a highway we can drive on" (Ashley Stroupe, JPL) | Read: JPL 2026-013 |
| Curiosity was parked at up to 17.5° of tilt in this stretch (sols 4500 to 4840) | Derived: maximum of the `tilt` field in the waypoint file. This is the rover's attitude when parked, not a slope measurement |

Consequence for the route: **walk the ridgetops, treat the sandy hollows as caution ground.** This is a real, cited hazard that elevation data alone would miss, which is a point worth making in the pitch.

## 3. The route and stops

The route is Curiosity's own recorded path through the boxwork. Positions are **the rover's recorded position on that sol**, not the exact position of the rock. Coordinates are as given in the waypoint file; the convention is not yet confirmed.

| # | Stop | What is there | Sols | Lat, Lon | Elevation |
|---|---|---|---|---|---|
| 1 | **Altadena** (edge of the boxwork) | First drill sample of the campaign, from the transitional ground before the ridges. Bedrock with white calcium sulfate veins | 4560 to 4571. Drilled 8 Jun 2025 | -4.79985, 137.38354 | -3,647 m |
| 2 | **Nodule site** | Pea-sized mineral nodules on ridge walls and in hollows | 4636 (imaged 21 Aug 2025) | -4.80654, 137.37934 | -3,607 m |
| 3 | **Panorama viewpoint** | Where the Mastcam panorama of the boxwork was taken | 4671 (26 Sep 2025) | -4.80827, 137.38127 | -3,608 m |
| 4 | **Monte Grande hollow** (Valle de la Luna) | Drill sample from bedrock in a hollow. Carbonate minerals found | 4687 to 4709 | -4.80784, 137.38104 | -3,610 m |
| 5 | **Nevado Sajama ridge** | Drill sample from the ridge beside the hollow, about 10 m away and 2 m higher. Clay minerals found. A second hole, Nevado Sajama 2, followed | 4711 to 4805 | -4.80801, 137.38100 | -3,608 m |

Sources for the stops:
- Names, dates and the hollow and ridge pairing: NASA Curiosity mission blog, sols 4689 to 4694, sols 4709 to 4715, sols 4804 to 4811 (Read).
- "Clay minerals in the ridge, carbonate minerals in the hollow": JPL release 2026-013 (Read). The release does not name the samples. **Matching "ridgetop" to Nevado Sajama and "hollow" to Valle de la Luna is our inference** from the blog posts, and should be stated as such or confirmed.
- JPL says a fourth sample was analysed with wet chemistry to look for organic compounds. That this was Nevado Sajama 2 is also **our inference**.
- Positions, sols and elevations: Derived from the Curiosity waypoint file. The long stays in that file (11, 22, 30, 37 and 16 sols) line up with the drill campaigns described in the blog, which supports the matching.
- Dates were converted to sols using the weather feed's own date and sol pairs.

Route figures (Derived from the waypoint file's odometer and elevation fields):
- Stop 1 to stop 5 along the rover's path: **1,113 m**, measured along the drives the rover made (the mission's traverse file). This is the figure the product uses since 14 Nov 2026. Straight lines between the 50 waypoints give 929 m, which cut the rover's corners; the odometer gives about 1.2 km, because it also counts turns on the spot.
- Distance of each stop along the path from the start: nodule site 746 m, panorama viewpoint 968 m, Monte Grande hollow 1,100 m, Nevado Sajama ridge 1,113 m.
- Furthest point from the start, in a straight line: 520 m for the safest walk through all five stops (537 m along the rover's own single path).
- **The product no longer walks the rover's single path.** It finds the shortest path over all ground Curiosity drove that stays within NASA's 20° figure. All five stops in the safest order is 1,757 m round trip.
- Climb from stop 1 to stop 5: about 40 m.
- Stops 4 and 5 are 10 m apart, so on the map they are one location with two samples. That pairing is the scientific heart of the walk.

Also named by the mission, not yet placed on the map: Volcán Peña Blanca, Los Flamencos (a narrow branching ridge), Valle Grande (the exit route up the mountain).

**The rover took from sol 4560 to about sol 4836 to work through the boxwork: roughly 276 sols, or nine Earth months, for four drill holes along 1.4 km by its odometer.** (Derived.) This is the single best number for the pitch. The walk in the product covers the first 151 of those sols, up to the ridge drill site.

## 4. What a person could do here that the rover could not

**Status: Ours.** This is the team's argument, not a NASA statement. The challenge text supports the general point: astronauts "make connections, solve problems quickly, and apply context to observations ... in real time."

- Follow one fracture along a ridge by eye and pick the best exposure, instead of stopping where the arm can reach.
- Sample across the contact between ridge and hollow in minutes. The rover needed separate drill campaigns weeks apart.
- Break open a rock to reach a fresh face, and dig into the sand of a hollow.
- Take many small samples from nodules on a ridge wall, a surface the rover's drill cannot address.
- Decide on the spot that something unexpected deserves another hour.

## 5. Safety limits

**No NASA limit exists for a Mars surface suit, and that is now confirmed from the source.** NASA's Exploration EVA System Concept of Operations has a section headed "Mars' Surface Excursion Ranges" whose entire text is: "Development of the mEMU and associated walk back ranges are forward work." (Read: EVA-EXP-0042 Rev B, section 4.2.1.3.1.2.) Every walking figure below is for the Moon.

| Limit | Value | Source | Status |
|---|---|---|---|
| Walking pace | About 2 km/h "over relatively level regolith" | EVA-EXP-0042 Rev B, 19 Oct 2020, section 4.2.1.3.1 | **Read.** Lunar. Used as the product's default speed |
| Slope a suited walker can handle | "Walking up/down/across a slope of up to 20°". The document notes Apollo 15 crossed slopes of about 17° | Same document, section 4.2.1.3 | **Read.** Lunar. The product's limit: ground steeper than 20° is never used, and 17° to 20° is marked "harder" (Apollo 15) |
| Length of a walk | "EVAs of up to 8 hours in duration (6±2 hours)" | Same document, section 4.1.4 | **Read.** Suit capability, not Mars-specific. In the verdict: a plan over 8 h out is no-go |
| Distance from shelter on foot | Up to 2 km from the lander in a straight line, and 16 km walked in total | Same document, section 4.2.1.3.1 | **Read.** Lunar. In the verdict: more than 2 km from the start is no-go. The safest full walk's furthest point is 520 m |
| Walk-back after a rover failure | 12 km for a 6-hour walk at 2 km/h | Same document, section 4.2.1.3.1 | **Read.** Lunar, and not relevant to a walk this short |
| Career radiation dose | "Total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes." | NASA-STD-3001 Volume 1 Revision C, approved 15 Sep 2023, section 4.8.2 [V1 4030] | **Read** |
| Radiation on the surface, normal day | 180 to 225 micrograys per day (absorbed dose, galactic cosmic rays) | Hassler et al. 2014, *Science* 343(6169), doi 10.1126/science.1244797 | Snippet. The abstract was read and confirms the measurements were made over 300 days from 7 Aug 2012, but gives no numbers. A dose equivalent near 0.64 mSv per day is widely quoted from this paper and remains **unconfirmed** |
| Radiation on the surface, solar storm | Two to three times background for several hours (Sept 2017) | Zeitlin et al. 2018; Hassler et al. 2018; Ehresmann and Hassler 2018 | Snippet. Papers not opened |
| Temperature | None found | | **Ours, if used** |
| Ultraviolet | None found. The data gives only Low, Moderate, High, Very High | | **Ours, if used** |
| Daylight | Walk between sunrise and sunset, with a 60-minute margin at each end | Sunrise and sunset come from the weather feed | Ours (the margin) |
| Time at each stop | 15 to 45 minutes | | **Ours** |

### What this means for the go / no-go verdict

0. **As built on 14 Nov, the verdict has five checks:** space weather from NASA DONKI for that date, NASA's 8-hour walk limit, NASA's 2 km walk-back limit, daylight, and how unusual the sol's temperature is for its season. The first is a forecast or a near-Earth detection, never a measurement at Mars; the next two are lunar figures.
1. **Radiation is not a limit on a single normal walk.** At roughly 0.2 milligrays a day, eight hours outside is a tiny fraction of a career limit. Radiation matters over the whole mission, and during a solar storm. So the honest radiation rule is: **no walk during a solar particle event.** Do not build a dose meter that implies precision we do not have.
2. **Slope is not the main hazard here; sand is.** The cited terrain risk is loose sand in the hollows.
3. **Temperature and ultraviolet have no citable threshold.** The product shows the measured values and how unusual the chosen sol is compared with the same season in other years. "Colder than 9 in 10 sols at this season" is defensible. "Too cold for the suit" is not.
4. **Daylight is the firmest constraint we have**, and it comes straight from the data.
5. **The walk sits well inside NASA's lunar planning figures**: about 1.8 km round trip for all five stops, never more than 520 m from the start, against a 2 km limit on foot. That is worth saying in the pitch, with the word "lunar" attached.
6. Every threshold in the product carries its source, or the word "assumption".

## 6. To do for the science and data lead

- [x] Walking pace, slope, walk length and distance from shelter: read from EVA-EXP-0042 on 14 Nov.
- [x] Career radiation limit: read from NASA-STD-3001 Volume 1 Revision C on 14 Nov.
- [x] Organisers' resources on 14 Nov: none added.
- [ ] Find the Hassler 2014 dose figures in the paper itself, or drop the numbers and keep only the rule.
- [ ] Open the three September 2017 solar storm papers and confirm "two to three times".
- [ ] Confirm or drop the two inferences in section 3.
- [ ] Confirm the coordinate convention and elevation datum of the waypoint file.
- [ ] Decide whether the 60-minute daylight margin and the time at each stop are reasonable, and write down why.
- [ ] Review the packing list and the task lists (`kitOurs`, `tasksOurs`) in `data/stops.json`. They are entirely ours.
- [ ] Review the space weather rule (direct hit forecast at Mars is no-go; glancing hit, or particles near Earth, is caution). It is ours, and it now decides the verdict on about one sol in seven.
- [ ] Review the five daily missions and the tasks at the ten extra rover stops. They are ours; nothing is known about those places beyond the sol and position NASA published.
- [ ] Review the Weather tab's "dust watch" and its "usual / unusual" cut-offs. They are our inference, not NASA's.

## Sources

- JPL release 2025-080, 23 Jun 2025: https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/
- JPL release 2026-013, 23 Feb 2026: https://www.jpl.nasa.gov/news/nasas-curiosity-rover-sees-martian-spiderwebs-up-close/
- Curiosity blog, sols 4689 to 4694: https://science.nasa.gov/blog/curiosity-blog-sols-4689-4694-drill-in-the-boxwork-unit-is-go/
- Curiosity blog, sols 4709 to 4715: https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit
- Curiosity blog, sols 4804 to 4811: https://science.nasa.gov/blog/curiosity-blog-sols-4804-4811-kicking-off-the-final-phase-of-boxwork-exploration
- NASA EVA-EXP-0042: https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf
- NASA EVA-EXP-0075, a workshop summary of the same concept for the first lunar landing, which repeats the 20° and 2 km figures: https://ntrs.nasa.gov/api/citations/20200001071/downloads/20200001071.pdf
- NASA-STD-3001 Volume 1 Revision C: https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf
- NASA radiation protection technical brief: https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- Hassler et al. 2014, NASA record: https://ntrs.nasa.gov/citations/20180007641
- Zeitlin et al. 2018: https://www.bexus.org/et/people/forstner/publication/zeitlin-2018
