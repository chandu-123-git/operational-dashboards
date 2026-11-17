/* view-business.js — Lesson 2: KPIs and charts. */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const esc = OD.esc;
  const U = () => OD.ui;
  OD.after = OD.after || {};

  const scopeRows = () => (U().bizZone === "all" ? OD.rows() : OD.rows().filter((r) => r.zone === U().bizZone));
  const scopeName = () => (U().bizZone === "all" ? "all zones" : OD.zoneLabel(U().bizZone, true));

  const DRILL = {
    received: () => ({}),
    value: () => ({}),
    onTimeRate: () => ({ status: "Shipped" }),
    avgHoursToShip: () => ({ status: "Shipped" }),
    open: () => ({ status: "open" }),
    overdue: () => ({ status: "open", sla: "Overdue" }),
  };

  function chartCard(id, title, sub, why, clickHint) {
    const show = U().showData[id];
    return `<div class="card">
      <h3 style="margin:0">${title}</h3>
      <p class="card-sub">${sub}</p>
      <div class="chart" id="ch-${id}" style="margin-top:10px"></div>
      <div class="whychart"><strong>Why this chart?</strong> ${why}</div>
      <div class="chart-foot"><span>${clickHint || "Hover a bar for details."}</span>
        <button class="btn sm" data-showdata="${id}" aria-expanded="${!!show}">${show ? "Hide data" : "View data"}</button></div>
      <div id="tbl-${id}"></div>
    </div>`;
  }

  OD.views.business = function () {
    const u = U();
    const k = OD.computeKpis(scopeRows());
    const sel = u.selectedKpi;
    const meta = OD.KPI_META[sel];
    return `
    <div class="lesson-head">
      <div class="eyebrow">Lesson 2 of 4 · Business Views</div>
      <h1>KPIs and charts</h1>
      <p class="lead">A table shows individual orders. A business view <em>summarises</em> them so you can answer “are we doing well?” in seconds. KPIs give the verdict, charts show where and when, and drill-down takes you back to the rows that explain it.</p>
    </div>
    <div class="layout">
      <div class="stack">
        <div class="keyidea"><span class="ico" aria-hidden="true">💡</span><div><p><strong>Key idea:</strong> a KPI is a metric <em>plus</em> a target <em>plus</em> a direction (higher or lower is better). Every chart should answer one business question. Its title should be that question.</p></div></div>

        <div class="card">
          <div class="row">
            <strong>Zone filter</strong>
            <div class="seg" role="group" aria-label="Zone filter">
              ${["all", ...OD.ZONE_KEYS].map((z) => `<button data-bizzone="${z}" aria-pressed="${u.bizZone === z}">${z === "all" ? "All zones" : "Zone " + z}</button>`).join("")}
            </div>
            <span class="small muted">Applies to every KPI and chart on this page except the zone comparison, which always shows all zones.</span>
          </div>
        </div>

        <div class="kpis" role="group" aria-label="Key performance indicators">
          ${OD.KPI_ORDER.map((key) => {
            const m = OD.KPI_META[key];
            return `<button class="kpi" data-kpi="${key}" aria-pressed="${sel === key}">
              <span class="lbl">${m.label}</span>
              <span class="val">${m.fmt(k)}</span>
              <span class="tgt">${m.target}</span>
              <span class="foot">${OD.stateChip(m.state(k))}<span class="how">How it's calculated</span></span>
            </button>`;
          }).join("")}
        </div>

        <div class="card" aria-live="polite">
          <div class="card-h"><div><div class="eyebrow">How it's calculated · ${esc(scopeName())}</div><h3>${meta.label}: ${meta.fmt(k)}</h3></div>
            <button class="btn sm" data-kpidrill="${sel}">See these orders in the table →</button></div>
          <div class="calc">
            <div class="formula">${meta.formula(k)}</div>
            <p style="margin:0">${meta.explain}</p>
            <p class="small muted" style="margin:0">${meta.target}. Status now: ${OD.stateChip(meta.state(k))}${meta.state(k) === "info" ? " A number without a target gives context, but can't tell you whether you're doing well." : ""}</p>
          </div>
        </div>

        <div class="grid2">
          ${chartCard("status", "Where is today's work right now?", "Orders by current status · " + esc(scopeName()), "Comparing a handful of categories by size: a sorted horizontal bar chart is easiest to read, and long labels fit.", "Click a bar to see those orders.")}
          ${chartCard("hourly", "When did today's orders arrive?", "Orders received per hour · " + esc(scopeName()), "Counts over time: columns in time order show peaks and quiet periods. (A pie chart couldn't show time.)", "Hover a column to see the hour's count.")}
          ${chartCard("zone", "Which zone is breaking the delivery promise?", "On-time ship rate by zone · dashed line = 95% target", "Comparing one rate across groups against a target: bars with a reference line make “who is below target” obvious.", "Click a zone to see its late shipments.")}
          ${chartCard("urgency", "How urgent is the work still open?", "Open orders by SLA state · " + esc(scopeName()), "Status colours (red / amber / green) are used <em>only</em> for meaning, always with a text label, never just for decoration.", "Click a bar to see those orders.")}
        </div>

        ${OD.howItWorks("How it works: KPIs and charts", `
          <p><strong>The idea.</strong> A car dashboard doesn't show every engine reading. It shows speed, fuel and warning lights. A business view does the same for operations: a few numbers that tell you whether to relax or act, and charts that show <em>where</em> to look.</p>
          <div class="howgrid">
            <div><h4>Metric vs KPI</h4><dl class="terms">
              <dt>Metric</dt><dd>Any measured number (orders received: ${k.received}).</dd>
              <dt>KPI</dt><dd>A metric tied to a goal: on-time ship rate ≥ 95%.</dd>
              <dt>Target</dt><dd>The value that counts as “good”.</dd>
              <dt>Segment</dt><dd>A slice of the data (a zone). Averages can hide a bad segment.</dd>
              <dt>Drill-down</dt><dd>Click from a summary into the rows behind it.</dd></dl></div>
            <div><h4>Choosing a chart</h4><ul>
              <li><strong>Compare categories</strong> → bar chart (sorted).</li>
              <li><strong>Change over time</strong> → column or line chart.</li>
              <li><strong>Against a goal</strong> → add a target line.</li>
              <li><strong>One headline number</strong> → a KPI card, not a chart.</li></ul>
              <h4 style="margin-top:10px">Watch out for</h4><ul>
              <li>Averages hiding outliers (check the zone chart!).</li>
              <li>Charts without a question in the title.</li>
              <li>Colour as the only way to tell things apart.</li></ul></div>
          </div>`)}
      </div>
      <div class="side">${OD.renderActivity("business")}</div>
    </div>`;
  };

  // ---- Charts are drawn after the HTML is in the page ------------------------------
  OD.after.business = function () {
    const rows = scopeRows();
    const u = U();
    const zoneTxt = u.bizZone === "all" ? "" : ` · Zone ${u.bizZone}`;

    // 1. Orders by status
    const statusData = C.STATUSES.map((s) => {
      const n = rows.filter((r) => r.status === s).length;
      return { label: s, value: n, valueText: String(n), key: s, tip: `<b>${s}</b>${n} orders (${((n / Math.max(1, rows.length)) * 100).toFixed(0)}% of ${rows.length})` };
    }).sort((a, b) => b.value - a.value);
    OD.hbar(document.getElementById("ch-status"), statusData, {
      aria: "Orders by status",
      onClick: (d) => { OD.setFlag("l2_drill_any"); OD.drillTo({ status: d.key, zone: u.bizZone === "all" ? "all" : u.bizZone }, `Lesson 2 chart “Orders by status” → ${d.key}${zoneTxt}`); },
    });

    // 2. Orders per hour
    const lastHour = Math.floor(OD.store.now / 60);
    const hourly = [];
    for (let h = 0; h <= lastHour; h++) {
      const n = rows.filter((r) => Math.floor(r.placedAt / 60) === h).length;
      const hh = String(h % 24).padStart(2, "0");
      hourly.push({ label: `${hh}:00–${hh}:59`, value: n, valueText: `${n} orders${h === lastHour ? " (hour in progress)" : ""}`, tickLabel: h % 3 === 0 ? hh : "" });
    }
    OD.vbar(document.getElementById("ch-hourly"), hourly, { aria: "Orders received per hour" });

    // 3. On-time by zone (always all zones; selected zone highlighted)
    const all = OD.rows();
    const zoneData = OD.ZONE_KEYS.map((z) => {
      const kz = OD.computeKpis(all.filter((r) => r.zone === z));
      const below = kz.onTimeRate != null && kz.onTimeRate < C.TARGETS.onTimeRate;
      return {
        label: `Zone ${z} · ${C.ZONES[z].category}`, value: kz.onTimeRate || 0, key: z,
        valueText: OD.fmtPct(kz.onTimeRate) + (below ? " ▼" : ""),
        faded: u.bizZone !== "all" && u.bizZone !== z,
        tip: `<b>Zone ${z} · ${C.ZONES[z].category}</b>${kz.onTime} of ${kz.shipped} shipped on time = ${OD.fmtPct(kz.onTimeRate)}<br>${kz.shipped - kz.onTime} shipped late · ${below ? "below" : "meets"} the 95% target`,
      };
    });
    OD.hbar(document.getElementById("ch-zone"), zoneData, {
      aria: "On-time ship rate by zone", max: 100, target: { value: C.TARGETS.onTimeRate, label: "95% target" }, labelWidth: Math.min(170, Math.round((document.getElementById("ch-zone").clientWidth || 400) * 0.4)),
      onClick: (d) => { OD.store.flags.l2_drill = true; OD.drillTo({ zone: d.key, sla: "Shipped late" }, `Lesson 2 chart “On-time ship rate by zone” → Zone ${d.key}, Shipped late`); },
    });

    // 4. Urgency of open work
    const openRows = rows.filter((r) => C.OPEN_STATUSES.includes(r.status));
    const urg = [
      { key: "Overdue", color: "var(--critical)", label: "✕ Overdue" },
      { key: "At risk", color: "var(--warning)", label: "! At risk (≤ 60 min)" },
      { key: "On track", color: "var(--good)", label: "✓ On track" },
    ].map((x) => { const n = openRows.filter((r) => r.sla === x.key).length; return Object.assign(x, { value: n, valueText: String(n), tip: `<b>${x.key}</b>${n} of ${openRows.length} open orders` }); });
    OD.hbar(document.getElementById("ch-urgency"), urg, {
      aria: "Open orders by SLA state",
      onClick: (d) => { OD.setFlag("l2_drill_any"); OD.drillTo({ status: "open", sla: d.key, zone: u.bizZone === "all" ? "all" : u.bizZone }, `Lesson 2 chart “Open orders by SLA state” → ${d.key}${zoneTxt}`); },
    });

    // Data tables (accessible alternative + "a chart is a summarised table")
    const tables = {
      status: [["Status", "Orders"], statusData.map((d) => [d.label, d.value])],
      hourly: [["Hour", "Orders"], hourly.map((d) => [d.label, d.value])],
      zone: [["Zone", "On-time rate"], zoneData.map((d) => [d.label, d.valueText])],
      urgency: [["SLA state", "Open orders"], urg.map((d) => [d.key, d.value])],
    };
    for (const id in tables) {
      const host = document.getElementById("tbl-" + id);
      if (!u.showData[id]) { host.innerHTML = ""; continue; }
      const [head, body] = tables[id];
      host.innerHTML = `<table class="mini"><thead><tr><th>${head[0]}</th><th class="num">${head[1]}</th></tr></thead><tbody>${body.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td></tr>`).join("")}</tbody></table>`;
    }
  };

  document.addEventListener("click", (e) => {
    if (OD.route !== "business") return;
    let b;
    if ((b = e.target.closest("[data-kpi]"))) {
      const key = b.getAttribute("data-kpi");
      U().selectedKpi = key;
      OD.store.flags["l2_calc_" + key] = true;
      OD.rerender();
    } else if ((b = e.target.closest("[data-bizzone]"))) {
      U().bizZone = b.getAttribute("data-bizzone");
      if (U().bizZone !== "all") OD.store.flags.l2_zone = true;
      OD.rerender();
    } else if ((b = e.target.closest("[data-showdata]"))) {
      const id = b.getAttribute("data-showdata");
      U().showData[id] = !U().showData[id];
      OD.store.flags.l2_table = true;
      OD.rerender();
    } else if ((b = e.target.closest("[data-kpidrill]"))) {
      const key = b.getAttribute("data-kpidrill");
      const z = U().bizZone;
      OD.drillTo(Object.assign(DRILL[key](), z === "all" ? {} : { zone: z }), `Lesson 2 KPI “${OD.KPI_META[key].label}”${z === "all" ? "" : " · Zone " + z}`);
    }
  });
})();
