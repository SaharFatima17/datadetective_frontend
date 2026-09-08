# DataDetective — web interface

React + Vite + Tailwind front end for the DataDetective API (proposal §16, §17).

Runs as its own project. The API stays exactly where it is; this folder never
touches the Python code.

---

## Setup

You need **Node.js 18 or newer**. Download it from
[nodejs.org](https://nodejs.org) — the Windows installer needs no compiler, so
it installs in a couple of minutes.

```bash
cd datadetective-frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

The backend must be running separately on port 8000:

```bash
# in the datadetective folder, with its venv active
uvicorn app.main:app --reload
```

That's all the configuration there is. `vite.config.js` proxies `/api` to
`127.0.0.1:8000`, so the browser only ever talks to one origin and there is
nothing to configure for CORS. `.env.example` is only needed if you later move
the API somewhere else.

### Build for submission

```bash
npm run build      # writes dist/
npm run preview    # serves dist/ on http://localhost:4173
```

---

## Screens

Each one maps to a requirement in proposal §17.

| Screen | §17 requirement |
|---|---|
| Dashboard | Ask DataDetective, project workspace |
| Sources | Upload / connect screen — file, database, web page |
| Dataset → Health | Data health dashboard: missingness, duplicates, schema warnings |
| Dataset → Columns | Schema with inferred types and sensitive-column marking |
| Dataset → Clean | Cleaning review with before/after impact |
| Dataset → Versions | Lineage — what produced each version |
| Investigation → Findings | Findings, forecast panel, recommendation cards |
| Investigation → Evidence | Evidence panel: the exact calculation behind each claim |
| Investigation → Trail | Timeline of hypotheses and agent actions |
| Investigation → Report | Executive summary, findings, limitations |
| Reports | Every completed investigation |
| Knowledge base | Business context the agents retrieve |

---

## Design decisions

**Colour carries meaning, not decoration.** Teal means verified or driver.
Amber means association or caution. Slate means measurement. Red means a defect
in the data. Nothing else in the interface uses those hues, so a colour means
the same thing on every screen. That is why a finding's caveat is set in muted
grey rather than amber — a caveat is a note, not a category change.

**The evidence thread.** A hairline runs from each claim down to the
calculation beneath it, in the timeline and the version lineage. It is the one
piece of ornament in the product, and it exists because connectedness is the
argument the whole system makes.

**A withheld forecast is not an empty chart.** When the model fails its
backtest, the panel states the reason and shows the numbers greyed rather than
hiding them. A blank panel would suggest the system had nothing to say, when in
fact it decided the projection was not good enough to present as fact.

**Radius is not uniform.** Panels 14px, controls 8px, inline chips 6px. One
radius on everything flattens hierarchy and is the clearest sign of a template.

**One entrance animation, no ambient motion.** Drifting cards make numbers feel
less trustworthy, which is the opposite of what this product is for. Motion
here answers a click — expanding a calculation, opening a panel.
`prefers-reduced-motion` is respected throughout.

**The token in memory only.** A JWT in `localStorage` can be read by any
injected script. Keeping it in memory means a refresh signs you out, which is
the right trade for a tool that reads private business data.

---

## Layout

```
src/
  api.js                     one client, all endpoints, token handling
  App.jsx                    routing, theme, session
  styles.css                 design tokens and the light/dark surfaces
  components/
    Nav.jsx                  sidebar + top bar
    ui.jsx                   panels, buttons, badges, empty/error/loading states
    Dropzone.jsx             drag-and-drop upload
    ForecastChart.jsx        history line + confidence band
    Investigation.jsx        timeline and evidence panel
    RecommendationCard.jsx   action, impact, confidence, feedback
  pages/
    Login.jsx  Dashboard.jsx  Sources.jsx  DatasetDetail.jsx
    Investigations.jsx  InvestigationDetail.jsx  Reports.jsx  Knowledge.jsx
```

---

## One backend change is required

The evidence endpoint needed to return the id of the tool run behind each
finding, so the **Re-run this calculation** button can verify a number in front
of you. `REQUIRED-BACKEND-PATCH.md` in this folder has the three lines to add.

Without it every other screen still works; only that one button stays disabled.

---

## Notes

- Light and dark both ship; the choice is remembered per browser.
- Responsive to 360px. The sidebar becomes a drawer below 1024px.
- Keyboard focus is visible on every control.
- Fonts load from Google Fonts and fall back to the system stack offline.
