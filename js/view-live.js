/* view-live.js — Lesson 3: live data (simulated) and alerts. */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const esc = OD.esc;
  const U = () => OD.ui;
  U().eventFilter = "all";

  const EVENT_GROUPS = {
    all: () => true,
    orders: (e) => ["new", "status", "shipped-ontime", "shipped-late", "cancelled", "hold"].includes(e.type),
    sla: (e) => e.type === "overdue" || e.type === "atrisk",
    alerts: (e) => e.type === "alert" || e.type === "alert-resolved" || e.type === "scenario",
  };

  function deltaFor(key, lc) {
    if (!lc) return null;
    const ch = lc.kpiChanges.filter((c) => c.key === key);
    if (!ch.length) return null;
    const from = ch[0].from, to = ch[ch.length - 1].to;
    if (from == null || to == null) return null;
    const d = to - from;
    if (Math.abs(d) < 1e-9) return null;
    let txt;
    if (key === "onTimeRate") txt = (d > 0 ? "+" : "") + d.toFixed(1) + " pts";
    else if (key === "avgHoursToShip") txt = (d > 0 ? "+" : "") + d.toFixed(2) + " h";
    else if (key === "value") txt = (d > 0 ? "+" : "−") + OD.fmtMoney(Math.abs(d));
    else txt = (d > 0 ? "+" : "") + d;
    return { d, txt };
  }

  function alertCard(a) {
    const rule = OD.store.rules.find((r) => r.id === a.ruleId);
    const isNew = a.status === "active" && a.triggeredAt === OD.store.now;
    return `<div class="alertcard ${a.severity} ${a.status} ${isNew ? "new" : ""}" data-alert="${a.uid}">
      <div class="row"><span class="sev">${a.severity === "critical" ? "✕ CRITICAL" : "▲ WARNING"}</span>
        <span class="pill ${a.status === "active" ? "s-hold" : "s-packed"}">${a.status === "active" ? "Active · needs attention" : "Acknowledged · someone is on it"}</span></div>
      <strong>${esc(a.title)}</strong>
      <div class="small">Now: <b>${a.value}${rule.unit === "%" ? "%" : ""}</b> ${rule.metricLabel} · rule: ${rule.op} ${a.threshold}${rule.unit === "%" ? "%" : ""} · fired at ${OD.fmtTime(a.triggeredAt)} (value ${a.valueAtTrigger})</div>
      <div class="small muted">${esc(rule.why)}</div>
      <div class="row" style="margin-top:4px">
        ${a.status === "active" ? `<button class="btn sm" data-ack="${a.uid}">Acknowledge</button>` : ""}
        <button class="btn sm primary" data-investigate="${a.uid}">Investigate →</button>
      </div>
    </div>`;
  }

  OD.views.live = function () {
    const S = OD.store, u = U();
    const k = OD.kpis();
    const lc = S.lastChange;
    const fresh = lc && lc.id !== u.liveSeen;
    const active = OD.activeAlerts();
    const resolved = S.alerts.filter((a) => a.status === "resolved").slice(0, 8);
    const evs = S.events.filter(EVENT_GROUPS[u.eventFilter]).slice(0, 80);
    const speedBtn = (v, label) => `<button data-speed="${v}" aria-pressed="${S.speed === v}">${label}</button>`;

    return `
    <div class="lesson-head">
      <div class="eyebrow">Lesson 3 of 4 · Real-Time Operations</div>
      <h1>Live data and alerts</h1>
      <p class="lead">An operational dashboard is watched <em>while the work happens</em>. Numbers change as orders arrive, move and ship, and also just because time passes. Alerts watch the numbers for you and call for attention when a rule is broken.</p>
    </div>
    <div class="layout">
      <div class="stack">
        <div class="simbanner" role="note"><span aria-hidden="true">🧪</span><div><strong>This is a SIMULATED live feed.</strong> A timer in your browser advances a simulated clock (1 tick = 1 simulated minute) and generates order events from a fixed seed. Nothing is connected to a real warehouse. In a real system the same screen would receive updates from the order database, by <em>polling</em> every few seconds or by <em>push</em> (WebSockets / server-sent events).</div></div>

        <div class="card">
          <div class="card-h"><div><h2>Simulation controls</h2><p class="card-sub">Simulated time: <span class="clock">${OD.fmtTime(S.now)}</span> · ${S.running ? `<strong style="color:var(--sim)">running at ${S.speed} sim-min per second</strong>` : "paused"}${lc ? ` · last update: ${esc(lc.label)} at ${OD.fmtTime(lc.t)}` : " · no updates yet"}</p></div></div>
          <div class="controls">
            <button class="btn ${S.running ? "" : "sim"}" data-live="toggle">${S.running ? "⏸ Pause" : "▶ Start live feed"}</button>
            <button class="btn" data-live="1">Step +1 min</button>
            <button class="btn" data-live="10">+10 min</button>
            <span class="small muted">Speed</span>
            <div class="seg" role="group" aria-label="Simulation speed">${speedBtn(1, "1×")}${speedBtn(5, "5×")}${speedBtn(15, "15×")}</div>
          </div>
          <h3 style="margin-top:14px">Make something happen</h3>
          <div class="scen">
            ${Object.entries(OD.scenarios).map(([id, sc]) => `<div class="card"><strong>${esc(sc.label)}</strong><p>${esc(sc.desc)}</p><button class="btn sm" data-scenario="${id}">Run scenario</button></div>`).join("")}
          </div>
        </div>

        <div class="livekpis" aria-live="off">
          ${OD.KPI_ORDER.map((key) => {
            const m = OD.KPI_META[key];
            const d = deltaFor(key, lc);
            return `<div class="kpi ${d && fresh ? "changed" : ""}"><span class="lbl">${m.label}</span><span class="val">${m.fmt(k)}</span>
              <span class="foot">${OD.stateChip(m.state(k))}${d ? `<span class="delta ${d.d > 0 ? "up" : "down"}" title="Change in the last update">${d.txt}</span>` : '<span class="small muted">no change</span>'}</span></div>`;
          }).join("")}
        </div>

        <div class="grid2">
          <div class="card">
            <h3>Why did the numbers change?</h3>
            <p class="card-sub">Every KPI change, with the events that caused it. Newest first.</p>
            ${S.kpiLog.length ? `<ul class="changes" style="margin-top:8px">${S.kpiLog.slice(0, 14).map((c) => `<li>
              <div class="h"><span class="mono small muted">${OD.fmtTime(c.t)}</span><strong>${esc(c.label)}</strong><span>${esc(c.fromTxt)} → <b>${esc(c.toTxt)}</b></span></div>
              <ul>${(c.causes.length ? c.causes.slice(0, 3) : ["(rounding / derived change)"]).map((t) => `<li>${esc(t)}</li>`).join("")}${c.causes.length > 3 ? `<li class="muted">…and ${c.causes.length - 3} more</li>` : ""}</ul></li>`).join("")}</ul>`
              : `<p class="empty">Press <strong>Step +1 min</strong> to advance the clock and see the first explanations.</p>`}
          </div>
          <div class="card">
            <div class="card-h"><div><h3>Event stream</h3><p class="card-sub">Raw events, newest first.</p></div>
              <div class="seg" role="group" aria-label="Event filter">${[["all", "All"], ["orders", "Orders"], ["sla", "Deadlines"], ["alerts", "Alerts"]].map(([v, l]) => `<button data-evfilter="${v}" aria-pressed="${u.eventFilter === v}">${l}</button>`).join("")}</div></div>
            ${evs.length ? `<ul class="log">${evs.map((e, i) => `<li class="${e.type} ${fresh && e.t === S.now && i < 6 ? "fresh" : ""}"><span class="t">${OD.fmtTime(e.t)}</span><span class="x">${esc(e.text)}</span></li>`).join("")}</ul>` : `<p class="empty">No events yet.</p>`}
          </div>
        </div>

        <div class="card" id="alerts">
          <div class="card-h"><div><h2>Alerts</h2><p class="card-sub">${active.length ? `${active.length} open alert${active.length > 1 ? "s" : ""}` : "No open alerts. All rules are within their thresholds."}</p></div></div>
          <div class="stack" style="gap:10px">${active.map(alertCard).join("")}</div>
          <h3 style="margin-top:16px">Alert rules</h3>
          <p class="card-sub" style="margin-bottom:6px">An alert is just a rule: <strong>IF</strong> a metric crosses a threshold <strong>THEN</strong> notify someone. Change a threshold to see the effect immediately.</p>
          <div class="tablewrap" style="border:none"><table class="data rules"><thead><tr><th>Rule</th><th>Condition</th><th>Threshold</th><th>Current value</th><th>State</th></tr></thead><tbody>
            ${S.rules.map((r) => {
              const checks = S.ruleChecks.filter((c) => c.rule.id === r.id);
              const firing = checks.filter((c) => c.firing);
              const cur = r.perZone ? checks.map((c) => `${c.key}: ${c.value}`).join(" · ") : String(checks[0].value) + (r.unit === "%" ? "%" : "");
              return `<tr style="cursor:default"><td><strong>${esc(r.name)}</strong><br><span class="small muted">${r.severity}</span></td>
                <td class="small">${esc(r.metricLabel)}${r.perZone ? " (each zone)" : ""} ${r.op}</td>
                <td><input class="input" type="number" min="0" step="1" value="${r.threshold}" data-threshold="${r.id}" aria-label="Threshold for ${esc(r.name)}"></td>
                <td class="small">${esc(cur)}</td>
                <td><span class="fire ${firing.length ? "on" : "off"}">${firing.length ? "● FIRING" + (r.perZone ? " (" + firing.map((c) => c.key).join(", ") + ")" : "") : "○ OK"}</span></td></tr>`;
            }).join("")}
          </tbody></table></div>
          <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-resetrules>Restore default thresholds</button></div>
          ${resolved.length ? `<h3 style="margin-top:14px">Recently resolved</h3><ul class="log">${resolved.map((a) => `<li class="alert-resolved"><span class="t">${OD.fmtTime(a.resolvedAt)}</span><span>${esc(a.title)}: fired ${OD.fmtTime(a.triggeredAt)}, resolved when the value returned to ${a.value}</span></li>`).join("")}</ul>` : ""}
        </div>

        ${OD.howItWorks("How it works: live data and alerts", `
          <p><strong>The idea.</strong> A KPI card is like a thermometer: you have to look at it. An alert is like a smoke alarm: it gets your attention when a line is crossed, so nobody has to stare at the screen all shift.</p>
          <div class="howgrid">
            <div><h4>Why numbers change</h4><ul>
              <li><strong>Events:</strong> an order arrives, is picked, packed, shipped or cancelled.</li>
              <li><strong>Time:</strong> an untouched order becomes At risk, then Overdue, as the clock passes its ship-by.</li>
              <li><strong>Scope:</strong> “today” keeps growing, so totals rise all day.</li></ul>
              <h4 style="margin-top:10px">How real dashboards get live data</h4><dl class="terms">
              <dt>Polling</dt><dd>Ask the server every N seconds: simple, a little delayed.</dd>
              <dt>Push</dt><dd>The server sends changes as they happen (WebSocket / SSE).</dd>
              <dt>Freshness</dt><dd>Always show <em>when</em> data was last updated, so stale data is obvious.</dd></dl></div>
            <div><h4>Alert design</h4><dl class="terms">
              <dt>Rule</dt><dd>Metric + operator + threshold (Overdue ≥ 6).</dd>
              <dt>Severity</dt><dd>Warning = look soon; Critical = act now.</dd>
              <dt>Acknowledge</dt><dd>“I've seen it and I'm on it”. The alert stays open.</dd>
              <dt>Resolve</dt><dd>Happens when the metric is back within limits.</dd>
              <dt>Alert fatigue</dt><dd>Too many alerts lead people to ignore them all.</dd>
              <dt>Flapping</dt><dd>A value bouncing around the threshold fires and resolves over and over. Real systems add a delay (“for 5 min”) or a gap between the fire and clear levels.</dd></dl></div>
          </div>`)}
      </div>
      <div class="side">${OD.renderActivity("live")}</div>
    </div>`;
  };
  OD.after.live = function () { U().liveSeen = OD.store.lastChange && OD.store.lastChange.id; };

  document.addEventListener("click", (e) => {
    if (OD.route !== "live") return;
    let b;
    if ((b = e.target.closest("[data-live]"))) {
      const v = b.getAttribute("data-live");
      if (v === "toggle") (OD.store.running ? OD.pause : OD.play)();
      else OD.advance(+v);
    } else if ((b = e.target.closest("[data-speed]"))) OD.setSpeed(+b.getAttribute("data-speed"));
    else if ((b = e.target.closest("[data-scenario]"))) OD.scenarios[b.getAttribute("data-scenario")].run();
    else if ((b = e.target.closest("[data-ack]"))) OD.ackAlert(+b.getAttribute("data-ack"));
    else if ((b = e.target.closest("[data-investigate]"))) {
      const a = OD.store.alerts.find((x) => x.uid === +b.getAttribute("data-investigate"));
      const rule = OD.store.rules.find((r) => r.id === a.ruleId);
      OD.store.flags.l3_investigate = true;
      OD.drillTo(rule.investigate(a.key), `Lesson 3 alert “${a.title}”`);
    } else if ((b = e.target.closest("[data-evfilter]"))) { U().eventFilter = b.getAttribute("data-evfilter"); OD.rerender(); }
    else if (e.target.closest("[data-resetrules]")) OD.resetRules();
  });
  document.addEventListener("change", (e) => {
    if (OD.route === "live" && e.target.matches("[data-threshold]")) OD.setThreshold(e.target.getAttribute("data-threshold"), parseFloat(e.target.value));
  });
})();
