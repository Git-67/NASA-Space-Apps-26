# CLAUDE.md

Rules for working in this repo. They apply to every change, by a human or an AI.
If a rule here conflicts with a request, say so before proceeding instead of quietly picking one.

## 1. Project context

- **What:** a website plus a product pitch for the NASA Space Apps Challenge 2026 (Singapore, virtual).
- **Window:** Sat 14 Nov 2026 09:00 SGT to Sun 15 Nov 2026 23:59 SGT. Submission is a hard deadline.
- **Deliverables:** project summary, demo (30-second video or 7 slides), a public project link, project details.
- **Judged 1 to 5 on:** Impact, Creativity, Validity, Relevance, Presentation.
- **Mandatory:** at least one NASA dataset, named, linked, and explained. No NASA data means no Global Awards eligibility.

Every piece of work should move at least one judging criterion. If it moves none, it is not a priority this weekend.

> **TODO (team):** fill in the chosen challenge, the one-sentence problem statement, and the stack in section 2.
> Until then, do not scaffold a framework or add dependencies without asking.

## 2. Stack and commands

> **TODO (team):** replace this section once the stack is chosen. Keep it to real, working commands.

| Task | Command |
|---|---|
| Install | _TBD_ |
| Dev server | _TBD_ |
| Lint + format | _TBD_ |
| Type check | _TBD_ |
| Test | _TBD_ |
| Production build | _TBD_ |

Defaults unless the team decides otherwise: TypeScript in strict mode, one package manager (commit its lockfile, never mix), a formatter and linter wired up before the first feature.

## 3. Repository layout

Organise by feature, not by file type. Target shape (adapt names to the framework's conventions):

```
src/
  app/ or pages/     Routes and page shells only. No business logic.
  features/<name>/   One folder per feature: its components, hooks, logic, tests.
  components/ui/     Shared, presentational primitives built from DESIGN.md tokens.
  lib/               Framework-agnostic helpers, API clients, data parsing.
  styles/            Design tokens and global styles. The only home for raw values.
  types/             Shared types.
data/                NASA and other datasets (or scripts that fetch them), with provenance.
docs/                DATA_SOURCES.md, pitch material, architecture notes.
public/              Static assets.
```

- A feature may import from `components/ui`, `lib`, `styles`, `types`. Features do not import from each other; lift shared code up instead.
- One component or module per file. Split a file when it passes roughly 250 lines or does two jobs.
- No dumping grounds: no `utils.ts`, `helpers.ts` or `misc/` that collect unrelated functions. Name files after what they do.
- New top-level folders need a reason stated in the PR or commit.

## 4. Code standards

- **Types:** no `any`, no `@ts-ignore`, no non-null `!` to silence the compiler. Validate external data (API responses, CSV/JSON files) at the boundary and convert it into typed objects once.
- **Naming:** names say what a thing is or does. No abbreviations beyond common ones (`id`, `url`). Booleans read as `is/has/should`.
- **Functions:** small, single purpose, early returns over nesting. Pure logic lives outside components so it can be tested.
- **No magic values:** numbers, strings, URLs, dataset IDs and thresholds go in named constants or config.
- **Errors:** never swallow them. Every fetch and parse has a handled failure path, and the UI shows loading, empty, and error states.
- **Dependencies:** add one only when it saves real work. Check it is maintained and licensed for open use. State why in the commit.
- **Dead code:** delete it. No commented-out blocks, no unused exports, no leftover `console.log`.
- **Extensibility:** make the next dataset, page or chart an addition rather than an edit: data-driven config over hard-coded branches. Do not build abstractions for needs that do not exist yet; three real uses before generalising.

## 5. Comments and documentation

- Comment **why**, not what. Explain intent, constraints, trade-offs, and anything surprising. Do not narrate the code.
- Every exported function, component, hook and type gets a doc comment: purpose, parameters, return value, units where relevant.
- Every file that touches scientific data states the dataset, the units, the coordinate system or time zone, and any transformation applied.
- `TODO(name): reason` only. A bare `TODO` is not allowed.
- Update comments and docs in the same change as the code they describe. A wrong comment is worse than none.
- Keep `README.md` current: what the project is, how to run it, which NASA data it uses.

## 6. Security

- **Secrets never enter the repo.** API keys (including NASA `api.nasa.gov` keys) live in environment variables. Commit `.env.example` with names only; `.env*` is gitignored.
- Anything shipped to the browser is public. Keys that must stay private go behind a server route or serverless function.
- Treat all external input as untrusted: user input, URL params, and dataset contents. Validate and escape it. No `dangerouslySetInnerHTML`, `innerHTML` or `eval` on dynamic content.
- Use HTTPS endpoints only. Pin dependency versions through the lockfile; do not install from unknown registries or Git URLs.
- No personal data collection unless the feature needs it. If it does, collect the minimum and say so in the UI.
- Before every commit, check the diff for keys, tokens and credentials. If one is committed, tell the team at once: it must be rotated, since deleting the commit is not enough.

## 7. NASA data (the Validity score)

- Record every dataset in `docs/DATA_SOURCES.md`: name, provider, source URL, date accessed, licence, what it is used for, and any processing done.
- **Never fabricate, estimate or "fill in" data.** Placeholder or mock data must be labelled as such in code and in the UI, and removed before submission.
- Keep raw data and processed data separate. Processing is done by a committed script, so the result can be reproduced.
- Show the source in the UI next to any chart, map or figure that uses it.
- Do not commit files over about 25 MB. Commit a fetch script or a trimmed sample and document where the full set lives.
- Claims in the pitch and the UI must be traceable to a dataset or a cited source.

## 8. UI and UX: DESIGN.md is the source of truth

**Read `DESIGN.md` before writing or changing any UI.** It is binding, not a suggestion.

- Use only its tokens for colour, typography, spacing, radius and elevation. No raw hex codes, pixel sizes or shadows in components.
- Tokens are defined once in `src/styles/` (CSS variables or theme config) and mirrored from `DESIGN.md`. Components reference tokens by name.
- Build from its named components (`button-primary`, `card-base`, `text-input`, and so on). A new variant is added to `DESIGN.md` first, then implemented.
- Follow its Do's and Don'ts and its responsive breakpoints and collapsing rules. Design mobile and desktop together.
- **If `DESIGN.md` is silent or contradicts itself, stop and ask.** Do not improvise a style and do not "improve" on the spec.
- If `DESIGN.md` changes, update the token files in the same change.

Baseline that applies on top of the spec:

- Semantic HTML, keyboard reachable controls, visible focus states, alt text, form labels.
- Text contrast meets WCAG AA. If a token pair in `DESIGN.md` fails AA, flag it instead of shipping it.
- Touch targets at least 44px. Respect `prefers-reduced-motion`.
- Do not ship another company's proprietary fonts, logos or illustrations. Use the fallback font stack listed in `DESIGN.md` and original or openly licensed assets.

## 9. Git workflow

- Small, focused commits. Imperative subject line under 72 characters, with the reason in the body when it is not obvious.
- Work on a branch; do not push straight to `main`. No force pushes to shared branches.
- Never commit build output, `node_modules`, `.env` files, editor settings or OS junk.
- `main` must always build and run. It is what the judges will open.

## 10. Before calling work done

1. Lint, type check and tests pass. Report failures as failures; never skip or disable a test to get green.
2. The change was run and looked at in a browser, at mobile and desktop widths, including its loading, empty and error states.
3. The UI matches `DESIGN.md`.
4. No secrets, debug output or dead code in the diff.
5. Docs, comments and `docs/DATA_SOURCES.md` are updated.
6. Logic that transforms data has tests. Presentation-only components do not need them this weekend.

## 11. How to work in this repo

- Read the surrounding code and match its patterns before adding new ones.
- Do what was asked. Flag unrelated problems; do not fix them in the same change.
- Ask before: adding a dependency, changing the folder layout, changing `DESIGN.md`, or deleting someone else's work.
- Be direct about risk. If a request will not be finished or will not hold up by the deadline, say so and propose a smaller version.
- A working, honest, well-presented prototype beats an ambitious broken one. Protect the demo path first.
