# OrderOps Lab: Learn Operational Dashboards

A hands-on learning app for the **Operational Dashboards** syllabus. Students run the evening shift at *BrightCart* (a fictional online retailer) and learn all four topics through one connected order-fulfillment scenario:

| Lesson | Syllabus topic | What students do |
|---|---|---|
| 1 · Tables | Dashboard Fundamentals: tables, search and filters, pagination | Search, combine filters, sort and page through ~200 orders. A funnel shows how each filter narrows the list, a "what just happened" panel explains every action, and a query inspector shows the same view as SQL. |
| 2 · KPIs & Charts | Business Views: KPIs and charts | Read 6 KPIs against targets, open the exact formula with real numbers, segment by zone, and drill down from a chart bar to the orders behind it. |
| 3 · Live & Alerts | Real-Time Operations: live data and alerts | Run a clearly labelled **simulated** live feed, see *why* every KPI changed (event or simply time passing), trigger disruptions, then acknowledge, investigate and tune alert rules. |
| 4 · Roles | Role-Based Operations: role-specific dashboards | Compare the Operations Manager and Warehouse Operator views of the same data, act as the operator and watch the manager's view update. Clearly labelled as a **simulated role switch, not access control**. |

Each lesson has a guided activity. Its steps tick automatically when the student does them, and its answers are checked against the current data (see `ACTIVITIES.md`).

## The built-in story
The data is generated from a fixed seed, so every student sees the same 16:00 starting point: 197 orders, a 92.9% on-time ship rate against a 95% target, and 4 overdue orders. Zone B (Apparel) is the hidden problem at 80.9% while the other zones are at 97% or above. Students uncover it in Lesson 2, list its overdue orders in Lesson 1, watch it get worse in Lesson 3, and work its queue in Lesson 4.

## Simulated vs real
- **Data:** synthetic orders and customers, all fictional.
- **Live updates:** a timer in the browser advances a simulated clock (1 tick = 1 simulated minute). There is no server and no real feed. A purple `SIMULATED` tag is always shown in the header.
- **Roles:** anyone can switch. The app explains that real systems enforce roles on the server through authentication and authorization.
- **Realistic parts:** the order lifecycle, the SLA rules (Express ships within 2 h, Standard within 6 h) and the KPI formulas. Every number on screen is calculated from the order rows; nothing is hard-coded.

## Run locally
It's a static site with no build step and no dependencies.
```bash
cd orderops-lab
python3 -m http.server 8000      # or: npx serve .
# open http://localhost:8000
```
Opening `index.html` directly from disk also works.

## Deploy
Upload the folder as-is to any static host:
- **Vercel:** `vercel deploy` in the folder, or import the repo. Framework preset "Other", no build command, output directory `.`
- **Netlify:** drag and drop the folder onto app.netlify.com/drop
- **GitHub Pages:** push the folder and enable Pages on the branch root

## Project structure
```
index.html            App shell (header, nav, drawer)
css/app.css           All styles (responsive, no framework)
js/data.js            Seeded order generator, SLA rules, KPI formulas, formatting
js/sim.js             Shared store, simulated clock, scenarios, operator actions, alert rules
js/charts.js          Small SVG bar/column charts with tooltips + keyboard drill-down
js/ui.js              Shared UI state, filtering/sorting, KPI definitions, order drawer
js/activities.js      The four guided activities (auto-ticking steps, answer checking)
js/view-*.js          One file per lesson (start, orders, business, live, roles)
js/app.js             Router and re-rendering
tests/test_app.py     Browser test suite (Playwright + Chrome)
docs/                 Activities, test results, screenshots
```

## Tests
`tests/test_app.py` drives a real Chrome browser through every lesson and checks each number on screen against an independent Python re-implementation of the business rules. The latest run passed 109 of 109 checks; see `docs/TEST_RESULTS.md`.
```bash
pip install playwright && playwright install chromium
python3 -m http.server 8765 &
python3 tests/test_app.py http://localhost:8765/
```
