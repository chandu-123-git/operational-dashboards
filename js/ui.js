/* =========================================================================
   ui.js — shared UI state and helpers used by all lessons.
   ========================================================================= */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const esc = OD.esc;

  OD.ui = {
    filters: { q: "", status: "all", zone: "all", priority: "all", sla: "all" },
    sort: { key: "placedAt", dir: "desc" },
    page: 1,
    pageSize: 10,
    lastAction: null,
    provenance: null,
    showQuery: false,
    bizZone: "all",
    selectedKpi: "onTimeRate",
    showData: {},
    role: "manager",
    opZone: "B",
  };
  OD.DEFAULT_FILTERS = () => ({ q: "", status: "all", zone: "all", priority: "all", sla: "all" });

  // ---- Filtering (the order of steps is also used for the "funnel") ------
  OD.FILTER_STEPS = [
    { key: "q", label: (v) => `Search "${v}"`, test: (r, v) => { const s = v.trim().toLowerCase(); return r.id.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s); }, active: (v) => v.trim() !== "" },
    { key: "status", label: (v) => (v === "open" ? "Status: All open" : `Status: ${v}`), test: (r, v) => (v === "open" ? C.OPEN_STATUSES.includes(r.status) : r.status === v), active: (v) => v !== "all" },
    { key: "zone", label: (v) => `Zone ${v}`, test: (r, v) => r.zone === v, active: (v) => v !== "all" },
    { key: "priority", label: (v) => `Priority: ${v}`, test: (r, v) => r.priority === v, active: (v) => v !== "all" },
    { key: "sla", label: (v) => `SLA: ${v}`, test: (r, v) => r.sla === v, active: (v) => v !== "all" },
  ];
  OD.applyFilters = function (rows, f) {
    const funnel = [{ label: "Orders today", count: rows.length }];
    let cur = rows;
    for (const st of OD.FILTER_STEPS) {
      const v = f[st.key];
      if (!st.active(v)) continue;
      cur = cur.filter((r) => st.test(r, v));
      funnel.push({ label: st.label(v), count: cur.length, key: st.key });
    }
    return { rows: cur, funnel };
  };
  OD.SORTERS = {
    id: (r) => r.id, customer: (r) => r.customer, placedAt: (r) => r.placedAt, zone: (r) => r.zone,
    priority: (r) => r.priority, items: (r) => r.items, value: (r) => r.value,
    status: (r) => C.STATUSES.indexOf(r.status), shipBy: (r) => r.shipBy,
  };
  OD.sortRows = function (rows, sort) {
    const get = OD.SORTERS[sort.key];
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const x = get(a), y = get(b);
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.id < b.id ? -1 : 1; // stable tie-break
    });
  };

  /* Jump to the orders table with a filter preset (drill-down). */
  OD.drillTo = function (filters, provenance) {
    OD.ui.filters = Object.assign(OD.DEFAULT_FILTERS(), filters);
    OD.ui.page = 1;
    OD.ui.sort = { key: "shipBy", dir: "asc" };
    OD.ui.provenance = provenance;
    OD.ui.lastAction = { type: "drill", provenance };
    location.hash = "#/orders";
  };

  // ---- Small renderers ----------------------------------------------------------
  const statusClass = { New: "s-new", Picking: "s-picking", Packed: "s-packed", "On Hold": "s-hold", Shipped: "s-shipped", Cancelled: "s-cancelled" };
  OD.statusPill = (s) => `<span class="pill ${statusClass[s]}">${esc(s)}</span>`;
  OD.prioPill = (p) => `<span class="pill ${p === "Express" ? "express" : "standard"}">${p === "Express" ? "⚡ " : ""}${esc(p)}</span>`;
  OD.slaBadge = function (r, withTime) {
    const map = {
      "On track": ["ok", "✓"], "At risk": ["risk", "!"], Overdue: ["over", "✕"],
      "Shipped on time": ["done", "✓"], "Shipped late": ["late", "!"], "—": ["done", "–"],
    };
    const [cls, ico] = map[r.sla];
    let extra = "";
    if (withTime && (r.sla === "On track" || r.sla === "At risk")) extra = ` <span class="muted">· ${OD.fmtDuration(r.minutesLeft)} left</span>`;
    if (withTime && r.sla === "Overdue") extra = ` <span>· ${OD.fmtDuration(-r.minutesLeft)} over</span>`;
    return `<span class="sla ${cls}"><i aria-hidden="true">${ico}</i>${esc(r.sla)}${extra}</span>`;
  };
  OD.zoneLabel = (z, long) => (long ? `${C.ZONES[z].name} · ${C.ZONES[z].category}` : C.ZONES[z].name);

  OD.stateChip = function (state) {
    const m = { good: ["✓", "On target"], watch: ["▲", "Watch"], bad: ["✕", "Off target"], info: ["i", "No target"] };
    return `<span class="state ${state}"><span aria-hidden="true">${m[state][0]}</span>${m[state][1]}</span>`;
  };

  // ---- KPI meta: label, formatting, targets and the "show the math" text --
  OD.KPI_META = {
    received: { label: "Orders received", fmt: (k) => OD.fmtInt(k.received), target: "No target — context", state: () => "info",
      formula: (k) => `count(all orders placed today) = <b>${k.received}</b>`,
      explain: "A volume metric. It tells you how busy the day is, but there's no good or bad value on its own, so it has no target." },
    value: { label: "Order value", fmt: (k) => OD.fmtMoney(k.value), target: "No target — context", state: () => "info",
      formula: (k) => `sum(order value) of ${k.received - k.cancelled} non-cancelled orders = <b>${OD.fmtMoney(k.value)}</b>`,
      explain: "Cancelled orders are excluded because that money won't be collected. It's business context: it shows what is at stake if orders go wrong, so it has no target here." },
    onTimeRate: { label: "On-time ship rate", fmt: (k) => OD.fmtPct(k.onTimeRate), target: `Target ≥ ${C.TARGETS.onTimeRate}%`,
      state: (k) => (k.onTimeRate == null ? "info" : k.onTimeRate >= 95 ? "good" : k.onTimeRate >= 90 ? "watch" : "bad"),
      formula: (k) => `shipped on time ÷ all shipped = ${k.onTime} ÷ ${k.shipped} = <b>${OD.fmtPct(k.onTimeRate)}</b>`,
      explain: "The headline service KPI: of the orders we shipped, how many left before their ship-by time? Open orders don't count yet; they only affect this KPI once they ship. ≥ 95% is on target, 90–95% is 'watch', below 90% is off target." },
    avgHoursToShip: { label: "Avg time to ship", fmt: (k) => (k.avgHoursToShip == null ? "—" : k.avgHoursToShip.toFixed(2) + " h"), target: `Target ≤ ${C.TARGETS.avgHoursToShip.toFixed(1)} h`,
      state: (k) => (k.avgHoursToShip == null ? "info" : k.avgHoursToShip <= 2 ? "good" : k.avgHoursToShip <= 2.5 ? "watch" : "bad"),
      formula: (k) => `total minutes from placed → shipped ÷ shipped orders = ${OD.fmtInt(k.totalShipMinutes)} min ÷ ${k.shipped} = ${(k.totalShipMinutes / Math.max(1, k.shipped)).toFixed(1)} min = <b>${k.avgHoursToShip == null ? "—" : k.avgHoursToShip.toFixed(2) + " h"}</b>`,
      explain: "An efficiency KPI. Averages can hide problems: a few very slow orders and many fast ones can still give a good-looking average. Pair it with the on-time rate." },
    open: { label: "Open backlog", fmt: (k) => OD.fmtInt(k.open), target: "No target — context", state: () => "info",
      formula: (k) => `count(status in New, Picking, Packed, On Hold) = <b>${k.open}</b>`,
      explain: "Work still inside the building. A growing backlog is an early warning sign: if more arrives than ships, deadlines will be missed later." },
    overdue: { label: "Overdue orders", fmt: (k) => OD.fmtInt(k.overdue), target: "Target = 0",
      state: (k) => (k.overdue === 0 ? "good" : k.overdue < 6 ? "watch" : "bad"),
      formula: (k) => `count(open orders where now > ship-by) = <b>${k.overdue}</b>`,
      explain: "Open orders that have already missed their promise. This number can rise even when nothing happens: if the clock passes an order's ship-by time, it becomes overdue." },
  };
  OD.KPI_ORDER = ["received", "value", "onTimeRate", "avgHoursToShip", "open", "overdue"];

  // ---- Header sim chip (always visible: makes "simulated" explicit) --------
  OD.renderSimChip = function () {
    const S = OD.store;
    const el = document.getElementById("simchip");
    el.innerHTML = `
      <span class="simtag ${S.running ? "running" : ""}" title="All data and updates are simulated in your browser"><span class="dot"></span>SIMULATED ${S.running ? "· LIVE" : "· PAUSED"}</span>
      <span class="clock" title="Simulated clock">${C.DATE_LABEL.split(" ").slice(0, 3).join(" ")} · ${OD.fmtTime(S.now)}</span>
      <button class="btn sm" data-sim="toggle" aria-label="${S.running ? "Pause" : "Start"} simulated live feed">${S.running ? "⏸ Pause" : "▶ Live"}</button>
      <button class="btn sm" data-sim="step5" title="Advance the simulated clock by 5 minutes">+5 min</button>
      <button class="btn sm ghost" data-sim="reset" title="Restore the original 16:00 data">Reset</button>`;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sim]");
    if (!b) return;
    const a = b.getAttribute("data-sim");
    if (a === "toggle") (OD.store.running ? OD.pause : OD.play)();
    if (a === "step5") OD.advance(5);
    if (a === "reset") {
      if (confirm("Reset all data back to 16:00? Live changes, scenarios and alerts will be cleared. (Your activity answers are kept.)")) OD.reset(true);
    }
  });

  // ---- Order drawer ----------------------------------------------------------
  OD.openOrder = function (id) {
    const r = OD.rows().find((x) => x.id === id);
    if (!r) return;
    const o = r.ref, now = OD.store.now;
    const tl = [];
    tl.push({ t: o.placedAt, text: "Order placed" });
    if (r.status === "Cancelled") tl.push({ t: o.cancelledAt, text: "Cancelled by customer" });
    else {
      if (o.pickStartAt <= now) tl.push({ t: o.pickStartAt, text: "Picking started" });
      if (o.hold && o.hold.since <= now) tl.push({ t: o.hold.since, text: `Put On Hold — ${o.hold.reason}` });
      else {
        if (o.packedAt <= now) tl.push({ t: o.packedAt, text: "Packed" });
        if (o.shippedAt <= now) tl.push({ t: o.shippedAt, text: "Shipped (handed to carrier)" });
      }
    }
    const shipped = r.status === "Shipped";
    const slaWhy = {
      "On track": `It has ${OD.fmtDuration(r.minutesLeft)} left before its ship-by time (more than 60 min).`,
      "At risk": `Only ${OD.fmtDuration(r.minutesLeft)} left before ship-by (60 min or less). Someone should act soon.`,
      Overdue: `It is still ${r.status} and its ship-by time passed ${OD.fmtDuration(-r.minutesLeft)} ago.`,
      "Shipped on time": `It shipped at ${OD.fmtTime(o.shippedAt)}, before its ship-by time of ${OD.fmtTime(r.shipBy)}.`,
      "Shipped late": `It shipped at ${OD.fmtTime(o.shippedAt)}, ${OD.fmtDuration(o.shippedAt - r.shipBy)} after its ship-by time of ${OD.fmtTime(r.shipBy)}.`,
      "—": "Cancelled orders have no shipping promise.",
    }[r.sla];
    const d = document.getElementById("drawer");
    d.innerHTML = `
      <div class="row"><h2 id="drawer-title" style="margin:0">${esc(r.id)}</h2><span class="spacer"></span><button class="btn sm" data-close>Close ✕</button></div>
      <p class="muted small">Order detail · simulated record</p>
      <dl class="kv">
        <dt>Customer</dt><dd>${esc(r.customer)}</dd>
        <dt>Zone</dt><dd>${OD.zoneLabel(r.zone, true)}</dd>
        <dt>Priority</dt><dd>${OD.prioPill(r.priority)} <span class="muted small">(${r.priority === "Express" ? "ship within 2 h" : "ship within 6 h"})</span></dd>
        <dt>Items · Value</dt><dd>${r.items} items · ${OD.fmtMoney(r.value)}</dd>
        <dt>Status</dt><dd>${OD.statusPill(r.status)}</dd>
        <dt>Ship-by</dt><dd>${OD.fmtTime(r.shipBy)}</dd>
        <dt>SLA</dt><dd>${OD.slaBadge(r, true)}</dd>
      </dl>
      <div class="explain"><span class="what">Why "${esc(r.sla)}"?</span> ${slaWhy}</div>
      <h3 style="margin-top:16px">Timeline</h3>
      <ul class="timeline">${tl.map((x) => `<li><span class="mono">${OD.fmtTime(x.t)}</span> — ${x.text}</li>`).join("")}
      ${!shipped && r.status !== "Cancelled" ? `<li class="future">Next: ${r.status === "New" ? "picking" : r.status === "Picking" ? "packing" : r.status === "Packed" ? "carrier hand-over" : "resolve the hold"}</li>` : ""}</ul>
      <p class="note">A dashboard only shows what has already happened. Future steps are unknown until they occur.</p>`;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    document.getElementById("scrim").hidden = false;
    d.querySelector("[data-close]").focus();
    OD.setFlag("l1_detail");
  };
  OD.closeDrawer = function () {
    const d = document.getElementById("drawer");
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
    document.getElementById("scrim").hidden = true;
  };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.id === "scrim") OD.closeDrawer(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") OD.closeDrawer(); });

  OD.howItWorks = function (title, html) {
    return `<details class="how"><summary>${esc(title)}</summary><div class="body">${html}</div></details>`;
  };
})();
