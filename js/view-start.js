/* view-start.js — the scenario introduction. */
(function () {
  const OD = window.OD;
  const C = OD.C;

  OD.views = OD.views || {};
  OD.views.start = function () {
    const k = OD.kpis();
    const pct = (key) => { const p = OD.activityProgress(key); return Math.round((p.done / p.total) * 100); };
    return `
    <section class="hero">
      <div>
        <div class="eyebrow">Operational Dashboards · hands-on lab</div>
        <h1>Run the evening shift at BrightCart's fulfillment center</h1>
        <p class="lead">You'll learn operational dashboards by using one: investigate orders in a table, read the business through KPIs and charts, watch simulated live data change and trigger alerts, then see how a manager and a warehouse operator need different views of the same data.</p>
        <div class="row" style="margin-top:12px">
          <a class="btn primary" href="#/orders">Start Lesson 1 →</a>
          <span class="muted small">About 60–75 minutes for all four lessons</span>
        </div>
      </div>
      <div class="card">
        <h3>Right now (simulated) · ${OD.fmtTime(OD.store.now)}</h3>
        <div class="grid2" style="gap:10px">
          <div><div class="bigcount">${k.received}</div><div class="small muted">orders received today</div></div>
          <div><div class="bigcount">${k.open}</div><div class="small muted">orders still in the building</div></div>
          <div><div class="bigcount">${OD.fmtPct(k.onTimeRate)}</div><div class="small muted">shipped on time (target 95%)</div></div>
          <div><div class="bigcount">${k.overdue}</div><div class="small muted">orders already overdue</div></div>
        </div>
        <p class="small muted" style="margin:10px 0 0">Something is wrong today. By the end of Lesson 2 you'll know where.</p>
      </div>
    </section>

    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <h2>The scenario</h2>
        <p><strong>BrightCart</strong> (fictional) sells online. Every order is picked, packed and shipped from one fulfillment center with four pick zones:</p>
        <table class="mini"><thead><tr><th>Zone</th><th>Products</th></tr></thead><tbody>
          ${OD.ZONE_KEYS.map((z) => `<tr><td>${C.ZONES[z].name}</td><td>${C.ZONES[z].category}</td></tr>`).join("")}
        </tbody></table>
        <p style="margin-top:10px">Each order has a <strong>ship-by time</strong>, the promise made to the customer: <strong>Express</strong> orders must ship within <strong>2 hours</strong> of being placed, <strong>Standard</strong> within <strong>6 hours</strong>.</p>
      </div>
      <div class="card">
        <h2>An order's journey</h2>
        <div class="flow" aria-label="Order lifecycle">
          ${["New", "Picking", "Packed", "Shipped"].map((s, i) => `${i ? '<span class="arr" aria-hidden="true">→</span>' : ""}${OD.statusPill(s).replace('class="pill', 'class="st pill')}`).join("")}
        </div>
        <p class="small" style="margin-top:10px">Side states: ${OD.statusPill("On Hold")} (waiting on stock, payment or an address check) and ${OD.statusPill("Cancelled")} (the customer cancelled).</p>
        <h3 style="margin-top:10px">SLA labels you'll see</h3>
        <dl class="terms">
          <dt>${OD.slaBadge({ sla: "On track" })}</dt><dd>Open, more than 60 min before ship-by</dd>
          <dt>${OD.slaBadge({ sla: "At risk" })}</dt><dd>Open, 60 min or less left</dd>
          <dt>${OD.slaBadge({ sla: "Overdue" })}</dt><dd>Open and past ship-by: the promise is already broken</dd>
          <dt>${OD.slaBadge({ sla: "Shipped on time" })} / ${OD.slaBadge({ sla: "Shipped late" })}</dt><dd>Final result once shipped</dd>
        </dl>
      </div>
    </div>

    <h2>Four lessons, one story</h2>
    <div class="lessons" style="margin-bottom:16px">
      ${[
        ["orders", 1, "Dashboard Fundamentals", "Tables · Search & Filters · Pagination", ["Search for orders and customers", "Combine filters and watch the result shrink", "Sort and page through results", "See your view as a query"]],
        ["business", 2, "Business Views", "KPIs · Charts", ["Read 6 KPIs against targets", "See the exact math behind each KPI", "Choose the right chart for a question", "Drill from a chart into the orders"]],
        ["live", 3, "Real-Time Operations", "Live data · Alerts", ["Run a clearly-labelled simulated live feed", "See why every number changed", "Trigger disruptions and alerts", "Acknowledge, investigate, tune thresholds"]],
        ["roles", 4, "Role-Based Operations", "Role-specific dashboards", ["Operations Manager view", "Warehouse Operator view", "Act as operator, watch the manager view update", "Simulated roles vs real access control"]],
      ].map(([r, n, t, sub, items]) => `
        <a class="card lessoncard" href="#/${r}">
          <span class="num">${n}</span><h3 style="margin:0">${t}</h3><span class="small muted">${sub}</span>
          <ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>
          <span class="small muted">Activity progress: ${pct(r)}%</span>
          <span class="go">Open lesson →</span>
        </a>`).join("")}
    </div>

    <div class="card">
      <h2>What's real and what's simulated</h2>
      <div class="truth">
        <div><h3>Realistic</h3><ul>
          <li>The order lifecycle, SLA rules and KPI formulas are the ones real fulfillment teams use.</li>
          <li>Every number is calculated from the order rows. Nothing is hard-coded, so you can always verify a KPI in the table.</li>
          <li>The dashboard patterns (filters, drill-down, alert rules, role views) are standard practice.</li></ul></div>
        <div><h3>Simulated</h3><ul>
          <li><strong>Data:</strong> ${k.received} orders generated from a fixed seed, so every student starts with identical numbers.</li>
          <li><strong>Live updates:</strong> a timer in your browser moves a <em>simulated clock</em>. No server, no real feed. The purple <span class="simtag"><span class="dot"></span>SIMULATED</span> tag is always visible.</li>
          <li><strong>Roles:</strong> anyone can switch roles here. Real systems enforce roles on the server after login.</li></ul></div>
      </div>
    </div>`;
  };
})();
