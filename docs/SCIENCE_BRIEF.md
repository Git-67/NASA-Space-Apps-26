# Science brief: the boxwork Marswalk

Drafted 13 Nov 2026 for the science and data lead to verify. **Nothing here is approved for the product or the pitch until that person has opened the source and ticked it off.**

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
- Stop 1 to stop 5 along the rover's path: about 1.2 km.
- Climb from stop 1 to stop 5: about 40 m.
- Stops 4 and 5 are 10 m apart, so on the map they are one location with two samples. That pairing is the scientific heart of the walk.

Also named by the mission, not yet placed on the map: Volcán Peña Blanca, Los Flamencos (a narrow branching ridge), Valle Grande (the exit route up the mountain).

**The rover took from sol 4560 to about sol 4836 to do this: roughly 276 sols, or nine Earth months, for four drill holes along 1.4 km.** (Derived.) This is the single best number for the pitch.

## 4. What a person could do here that the rover could not

**Status: Ours.** This is the team's argument, not a NASA statement. The challenge text supports the general point: astronauts "make connections, solve problems quickly, and apply context to observations ... in real time."

- Follow one fracture along a ridge by eye and pick the best exposure, instead of stopping where the arm can reach.
- Sample across the contact between ridge and hollow in minutes. The rover needed separate drill campaigns weeks apart.
- Break open a rock to reach a fresh face, and dig into the sand of a hollow.
- Take many small samples from nodules on a ridge wall, a surface the rover's drill cannot address.
- Decide on the spot that something unexpected deserves another hour.

## 5. Safety limits

**This table is weak, and that must be said plainly.** No public NASA limit for a Mars surface suit was found. The suit itself is not yet designed: NASA's exploration EVA concept document says Mars suit development and walk-back ranges are "forward work" (Snippet). Most numbers below are lunar, or are ours.

| Limit | Value | Source | Status |
|---|---|---|---|
| Slope a suited walker can handle | Up to 20° | NASA EVA-EXP-0075, a **lunar** surface document: "walking up/down/across a slope of up to 20°" | Snippet. Lunar, not Mars |
| Length of a walk | 8 hours at most, 6 hours nominal | NASA EVA-EXP-0042, Exploration EVA System Concept of Operations | Snippet. Not Mars-specific |
| Walk-back distance | 12 km for a 6-hour walk | Same document | Snippet. Not Mars-specific. Our route is about a tenth of this |
| Career radiation dose | Under 600 mSv | NASA-STD-3001 Volume 1, section 4.8.2 [V1 4030], Revision B. Revision C (2023) should be checked | Snippet |
| Radiation on the surface, normal day | 180 to 225 micrograys per day (absorbed dose, galactic cosmic rays) | Hassler et al. 2014, *Science* 343 | Snippet. A dose equivalent near 0.64 mSv per day is widely quoted from this paper but was **not confirmed** |
| Radiation on the surface, solar storm | Two to three times background for several hours (Sept 2017) | Zeitlin et al. 2018; Hassler et al. 2018; Ehresmann and Hassler 2018 | Snippet |
| Temperature | None found | | **Ours, if used** |
| Ultraviolet | None found. The data gives only Low, Moderate, High, Very High | | **Ours, if used** |
| Walking speed in a suit | None found. Other teams assume about 3 km/h | | **Ours, if used** |
| Daylight | Walk between sunrise and sunset, with a margin | Sunrise and sunset come from the weather feed | Ours (the margin) |

### What this means for the go / no-go verdict

1. **Radiation is not a limit on a single normal walk.** At roughly 0.2 milligrays a day, eight hours outside is a tiny fraction of a career limit. Radiation matters over the whole mission, and during a solar storm. So the honest radiation rule is: **no walk during a solar particle event.** Do not build a dose meter that implies precision we do not have.
2. **Slope is not the main hazard here; sand is.** The cited terrain risk is loose sand in the hollows.
3. **Temperature and ultraviolet have no citable threshold.** The product should show the measured values and how unusual the chosen sol is compared with the same season in other years, and flag outliers. "Colder than 9 in 10 sols at this season" is defensible. "Too cold for the suit" is not.
4. **Daylight is the firmest constraint we have**, and it comes straight from the data.
5. Every threshold in the product carries its source, or the word "assumption".

## 6. To do for the science and data lead

- [ ] Open each source marked Snippet and confirm the number and its exact wording.
- [ ] Confirm or drop the two inferences in section 3.
- [ ] Confirm the coordinate convention and elevation datum of the waypoint file.
- [ ] Find the Hassler 2014 dose equivalent figure in the paper itself.
- [ ] Decide the daylight margin and write down why.
- [ ] Look for a cited suited walking speed. If none, choose one and label it.
- [ ] Check the organisers' new resources on 14 Nov for anything that replaces an assumption.

## Sources

- JPL release 2025-080, 23 Jun 2025: https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/
- JPL release 2026-013, 23 Feb 2026: https://www.jpl.nasa.gov/news/nasas-curiosity-rover-sees-martian-spiderwebs-up-close/
- Curiosity blog, sols 4689 to 4694: https://science.nasa.gov/blog/curiosity-blog-sols-4689-4694-drill-in-the-boxwork-unit-is-go/
- Curiosity blog, sols 4709 to 4715: https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit
- Curiosity blog, sols 4804 to 4811: https://science.nasa.gov/blog/curiosity-blog-sols-4804-4811-kicking-off-the-final-phase-of-boxwork-exploration
- NASA EVA-EXP-0042: https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf
- NASA EVA-EXP-0075: https://ntrs.nasa.gov/api/citations/20200001071/downloads/20200001071.pdf
- NASA-STD-3001 Volume 1 Revision C: https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf
- NASA radiation protection technical brief: https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- Hassler et al. 2014, NASA record: https://ntrs.nasa.gov/citations/20180007641
- Zeitlin et al. 2018: https://www.bexus.org/et/people/forstner/publication/zeitlin-2018
