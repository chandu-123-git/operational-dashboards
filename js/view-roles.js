/* view-roles.js — Lesson 4: role-specific dashboards (simulated roles). */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const esc = OD.esc;
  const U = () => OD.ui;
  const PIPE = ["New", "Picking", "Packed", "On Hold", "Shipped"];

  function lastOperatorChange() {
    const lc = OD.store.lastChange;
    if (!lc || lc.label !== "operator") return null;
    const e = lc.events.find((x) => x.type === "status" || x.type.startsWith("shipped"));
    return e ? { id: lc.id, e } : null;
  }

  function managerView(compact) {
    const rows = OD.rows();
    const k = OD.computeKpis(rows);
    const op = lastOperatorChange();
    const changed = op && op.id !== U().rolesSeen ? [op.e.from, op.e.to] : [];
    const overdue = rows.filter((r) => r.sla === "Overdue").sort((a, b) => a.shipBy - b.shipBy).slice(0, 5);
    const active = OD.activeAlerts();
    return `<section class="roleview manager" aria-label="Operations Manager dashboard">
      <div class="rolehead"><span class="rolebadge">👔 Operations Manager</span><strong>Whole facility · today</strong></div>
      <p class="rq">“Are we keeping today's promises, and where should I send help?”</p>
      <div class="kpis ${compact ? "cols2" : "cols4"}" style="margin:10px 0">
        ${["onTimeRate", "overdue", "open", "value"].map((key) => { const m = OD.KPI_META[key]; return `<div class="kpi" style="cursor:default"><span class="lbl">${m.label}</span><span class="val">${m.fmt(k)}</span><span class="foot">${OD.stateChip(m.state(k))}</span></div>`; }).join("")}
      </div>
      <h4 style="margin:6px 0">Pipeline (orders by status)</h4>
      <div class="pipeline">${PIPE.map((s) => `<div class="${changed.includes(s) ? "changed" : ""}">${s}<b>${rows.filter((r) => r.status === s).length}</b></div>`).join("")}</div>
      ${op ? `<p class="small" style="margin:6px 0 0">Latest floor update: ${esc(op.e.text)}</p>` : ""}
      <h4 style="margin:12px 0 4px">On-time ship rate by zone</h4>
      <div class="chart" id="ch-mgr-zone"></div>
      <h4 style="margin:12px 0 4px">Open alerts (${active.length})</h4>
      ${active.length ? `<ul class="log">${active.map((a) => `<li class="alert"><span class="t">${OD.fmtTime(a.triggeredAt)}</span><span>${a.severity === "critical" ? "✕" : "▲"} ${esc(a.title)}: ${a.value}</span></li>`).join("")}</ul>` : `<p class="small muted">None. Lesson 3's scenarios can create some.</p>`}
      <h4 style="margin:12px 0 4px">Most overdue orders (all zones)</h4>
      ${overdue.length ? `<div class="tablewrap" style="border:none"><table class="mini"><thead><tr><th>Order</th><th>Zone</th><th>Status</th><th>Over by</th><th class="num">Value</th></tr></thead><tbody>
        ${overdue.map((r) => `<tr><td class="mono">${r.id}</td><td>${r.zone}</td><td>${r.status}</td><td>${OD.fmtDuration(-r.minutesLeft)}</td><td class="num">${OD.fmtMoney(r.value)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">No overdue orders.</p>`}
    </section>`;
  }

  function operatorView() {
    const z = U().opZone;
    const now = OD.store.now;
    const queue = OD.rows().filter((r) => r.zone === z && ["New", "Picking", "On Hold"].includes(r.status)).sort((a, b) => a.shipBy - b.shipBy);
    const dueSoon = queue.filter((r) => r.sla === "At risk").length;
    const over = queue.filter((r) => r.sla === "Overdue").length;
    const packedToday = OD.rows().filter((r) => r.zone === z && r.ref.packedAt <= now && r.status !== "Cancelled" && r.status !== "On Hold").length;
    const show = queue.slice(0, 8);
    return `<section class="roleview operator" aria-label="Warehouse Operator dashboard">
      <div class="rolehead"><span class="rolebadge">🧺 Warehouse Operator</span>
        <label class="row small"><strong>My zone</strong><select class="input" data-opzone>${OD.ZONE_KEYS.map((k) => `<option value="${k}" ${k === z ? "selected" : ""}>${OD.zoneLabel(k, true)}</option>`).join("")}</select></label></div>
      <p class="rq">“What should I pick next?”</p>
      <div class="grid3" style="margin:10px 0">
        <div class="card" style="padding:10px"><div class="bigcount">${queue.length}</div><div class="small muted">In my queue</div></div>
        <div class="card" style="padding:10px"><div class="bigcount" style="color:var(--warning-ink)">${dueSoon}</div><div class="small muted">! Due within 1 h</div></div>
        <div class="card" style="padding:10px"><div class="bigcount" style="color:var(--critical-ink)">${over}</div><div class="small muted">✕ Overdue</div></div>
      </div>
      <h4 style="margin:6px 0">My queue, most urgent first</h4>
      ${show.length ? `<ul class="tasks">${show.map((r, i) => {
        const cls = r.sla === "Overdue" ? "overdue" : r.sla === "At risk" ? "risk" : "";
        const action = r.status === "New" ? ["startPicking", "Start picking"] : r.status === "Picking" ? ["markPacked", "Mark packed"] : ["releaseHold", "Release hold"];
        return `<li class="task ${cls}"><div class="left">
            <div class="top"><span class="mono"><strong>${r.id}</strong></span>${OD.prioPill(r.priority)}${OD.statusPill(r.status)}${i === 0 ? '<span class="pill s-picking">Next up</span>' : ""}</div>
            <span>${r.items} item${r.items > 1 ? "s" : ""} · ship by <strong>${OD.fmtTime(r.shipBy)}</strong> · <span class="countdown">${r.minutesLeft >= 0 ? OD.fmtDuration(r.minutesLeft) + " left" : OD.fmtDuration(-r.minutesLeft) + " OVERDUE"}</span>${r.status === "On Hold" ? ` · ${esc(r.ref.hold.reason)}` : ""}</span></div>
          <button class="btn sm ${i === 0 ? "primary" : ""}" data-opaction="${action[0]}" data-id="${r.id}">${action[1]}</button></li>`;
      }).join("")}</ul>${queue.length > show.length ? `<p class="small muted" style="margin-top:6px">+ ${queue.length - show.length} more in the queue</p>` : ""}` : `<p class="empty">Queue empty. Nice work!</p>`}
      <p class="small muted" style="margin-top:8px">Packed in ${C.ZONES[z].name} today: <strong>${packedToday}</strong>. Not shown here: other zones, order value, company KPIs.</p>
    </section>`;
  }

  OD.views.roles = function () {
    const u = U();
    const mode = u.role;
    return `
    <div class="lesson-head">
      <div class="eyebrow">Lesson 4 of 4 · Role-Based Operations</div>
      <h1>Role-specific dashboards</h1>
      <p class="lead">The manager and the warehouse operator look at the <em>same orders</em>, but they have different jobs, so they need different dashboards. A good role view shows each person what they need to decide or do next, and leaves out the rest.</p>
    </div>
    <div class="layout">
      <div class="stack">
        <div class="simbanner" role="note"><span aria-hidden="true">🎭</span><div><strong>Simulated role switch: this is NOT access control.</strong> Anyone can click between roles here, and all data is already in your browser. In a real system you would sign in, and the <em>server</em> would decide which data to send based on your role. Hiding something on screen is about focus, not security.</div></div>

        <div class="card">
          <div class="rolebar">
            <strong>View as</strong>
            <div class="seg" role="group" aria-label="Choose a role">
              <button data-role="manager" aria-pressed="${mode === "manager"}">👔 Operations Manager</button>
              <button data-role="operator" aria-pressed="${mode === "operator"}">🧺 Warehouse Operator</button>
              <button data-role="side" aria-pressed="${mode === "side"}">Side by side</button>
            </div>
            <span class="spacer"></span>
            <button class="btn sm" data-sim="step5">+5 sim min</button>
          </div>
          <p class="small muted" style="margin:8px 0 0">Tip: use <strong>Side by side</strong>, then click an operator action and watch the highlighted boxes in the manager's pipeline.</p>
        </div>

        ${mode === "side" ? `<div class="grid2">${managerView(true)}${operatorView()}</div>` : mode === "manager" ? managerView(false) : operatorView()}

        <div class="card">
          <h2>Who sees what, and why</h2>
          <div class="tablewrap" style="border:none"><table class="matrix">
            <thead><tr><th></th><th>👔 Operations Manager</th><th>🧺 Warehouse Operator</th></tr></thead>
            <tbody>
              <tr><th>Main question</th><td>Are we meeting targets? Where do I need to intervene?</td><td>What do I pick next? Is anything about to be late?</td></tr>
              <tr><th>Scope</th><td>All zones, the whole day</td><td>Only my zone, right now</td></tr>
              <tr><th>Level of detail</th><td>Summaries: KPIs, comparisons, exceptions</td><td>Individual orders, one at a time</td></tr>
              <tr><th>Typical action</th><td>Move staff, escalate, change priorities</td><td>Start picking, mark packed, flag a problem</td></tr>
              <tr><th>Order value (₹)</th><td><span class="yes">✓ Shown</span>: needed to judge business impact</td><td><span class="no">✕ Hidden</span>: not needed to pick, and adds noise</td></tr>
              <tr><th>Other zones</th><td><span class="yes">✓ Shown</span>: needed to compare</td><td><span class="no">✕ Hidden</span>: can't act on them</td></tr>
              <tr><th>Alerts</th><td><span class="yes">✓ All alerts</span></td><td>Only urgency of own tasks (colour + countdown)</td></tr>
              <tr><th>Design style</th><td>Dense, analytical, trends and targets</td><td>Big text, few numbers, one obvious button</td></tr>
            </tbody></table></div>
          <p class="small muted" style="margin-top:8px">One data source, two lenses: both views are built from the same order rows you explored in Lesson 1. Change one, and the other updates.</p>
        </div>

        ${OD.howItWorks("How it works: role-based dashboards and access control", `
          <p><strong>The idea.</strong> A hospital has one patient record, but the surgeon, the nurse and the billing clerk each see a different screen. Same truth, different job.</p>
          <div class="howgrid">
            <div><h4>Designing a role view</h4><ul>
              <li>Start from the role's decisions and actions, not from the data you have.</li>
              <li>Match time horizon: operators need “now”, managers need “today / this week”.</li>
              <li>Give the next action a button, right where the information is.</li>
              <li>Remove anything the role can't act on.</li></ul></div>
            <div><h4>Real access control (not simulated here)</h4><dl class="terms">
              <dt>Authentication</dt><dd>Proving who you are (sign-in).</dd>
              <dt>Authorization</dt><dd>What your role may see and do, checked on the <em>server</em> for every request.</dd>
              <dt>RBAC</dt><dd>Role-Based Access Control: permissions attached to roles, roles assigned to people.</dd>
              <dt>Least privilege</dt><dd>Give each role only the data and actions it needs.</dd></dl></div>
          </div>`)}
      </div>
      <div class="side">${OD.renderActivity("roles")}</div>
    </div>`;
  };

  OD.after.roles = function () {
    if (U().role !== "side") OD.store.flags["l4_" + U().role] = true;
    const host = document.getElementById("ch-mgr-zone");
    if (host) {
      const all = OD.rows();
      OD.hbar(host, OD.ZONE_KEYS.map((z) => {
        const kz = OD.computeKpis(all.filter((r) => r.zone === z));
        return { label: `Zone ${z}`, value: kz.onTimeRate || 0, valueText: OD.fmtPct(kz.onTimeRate), tip: `<b>Zone ${z} · ${C.ZONES[z].category}</b>${kz.onTime} of ${kz.shipped} on time` };
      }), { max: 100, target: { value: 95, label: "95%" }, labelWidth: 70, aria: "On-time ship rate by zone" });
    }
    const op = lastOperatorChange();
    if (op) U().rolesSeen = op.id;
  };

  document.addEventListener("click", (e) => {
    if (OD.route !== "roles") return;
    let b;
    if ((b = e.target.closest("[data-role]"))) {
      const r = b.getAttribute("data-role");
      U().role = r;
      OD.store.flags["l4_" + r] = true;
      if (r === "side") { OD.store.flags.l4_manager = true; OD.store.flags.l4_operator = true; }
      OD.rerender();
    } else if ((b = e.target.closest("[data-opaction]"))) {
      OD.actions[b.getAttribute("data-opaction")](b.getAttribute("data-id"));
    }
  });
  document.addEventListener("change", (e) => {
    if (OD.route === "roles" && e.target.matches("[data-opzone]")) { U().opZone = e.target.value; OD.rerender(); }
  });
})();
