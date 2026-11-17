# OrderOps Lab

**OrderOps Lab** is a browser-based application for exploring operational dashboards through a simulated order-fulfillment system at **BrightCart**, a fictional online retailer.

This repository contains the application source code. Use the application alongside the *Operational Dashboards* learning document.

## Live Application

**Application Link:** https://chandu-123-git.github.io/operational-dashboards/

Open the application directly in your browser. No installation or sign-in is required.

## Technologies Used

- **HTML** — application structure
- **CSS** — styling and responsive layout
- **JavaScript** — order data, dashboard interactions, calculations, and simulations
- **SVG** — charts rendered in the browser

The application runs entirely in the browser. No backend, database, or build step is required.

## Run the Application Locally

1. On this repository page, select **Code → Download ZIP** and extract it. Alternatively, clone the repository:

   ```bash
   git clone https://github.com/chandu-123-git/operational-dashboards.git
   ```

2. Open the extracted or cloned **`operational-dashboards`** folder.
3. Double-click **`index.html`** to launch the application in a browser.

**Optional:** If you prefer to use a local server, open a terminal in the project folder and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

No package installation is needed to use the application.

## Project Structure

| File or folder | Purpose |
|---|---|
| `index.html` | Entry point; loads the application interface, styles, and JavaScript files. |
| `css/app.css` | Styles the dashboards and responsive interface. |
| `js/data.js` | Generates sample orders and defines status, SLA, and KPI calculations. |
| `js/sim.js` | Manages the simulated clock, order updates, scenarios, and alert rules. |
| `js/ui.js` | Provides shared interface state and helpers, including filtering and sorting. |
| `js/charts.js` | Draws interactive SVG charts and supports chart drill-down. |
| `js/view-start.js` | Displays the application introduction and lesson navigation. |
| `js/view-orders.js` | Displays the order table, search, filters, sorting, and pagination. |
| `js/view-business.js` | Displays KPIs, charts, and business-performance views. |
| `js/view-live.js` | Displays the simulated live feed, events, and alerts. |
| `js/view-roles.js` | Displays Operations Manager and Warehouse Operator views. |
| `js/activities.js` | Defines guided activities, progress checks, and answer verification. |
| `js/app.js` | Handles page navigation, rendering, and interface updates. |
| `docs/` | Supporting activity documentation, screenshots, and test results. |
| `tests/test_app.py` | Automated browser tests; not required to run the application. |

## How the Files Work Together

1. **`index.html`** loads the styles and JavaScript files.
2. **`data.js`** supplies sample order data and business calculations; **`sim.js`** manages changes to the simulated operation.
3. **`ui.js`** and **`charts.js`** provide shared interface and chart functions.
4. **`view-*.js`** files display the different dashboard screens, while **`activities.js`** manages guided activities.
5. **`app.js`** handles navigation and updates what appears in the browser.

**Where to start exploring the code:** Open `index.html`, then `js/data.js`, `js/sim.js`, and the `js/view-*.js` file for the dashboard you want to understand.

## Important Notes

- BrightCart and its orders, customers, and operational events are fictional.
- Live updates are simulated inside the browser; they are not connected to a real warehouse.
- The role switch is a demonstration of different dashboard views, **not** real authentication or access control.
