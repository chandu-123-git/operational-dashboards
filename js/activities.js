/* =========================================================================
   activities.js — the four guided student activities.
   Steps tick automatically when the student performs the action.
   Answers are checked against the CURRENT data, so they stay correct even
   after the simulation has moved on (Reset returns to the 16:00 baseline).
   ========================================================================= */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const F = () => OD.store.flags;
  const rows = () => OD.rows();
  const open = (r) => C.OPEN_STATUSES.includes(r.status);
  const zoneRate = (z) => OD.computeKpis(rows().filter((r) => r.zone === z)).onTimeRate;

  let answers = {};
  try { answers = JSON.parse(localStorage.getItem("orderops-answers") || "{}"); } catch (e) { answers = {}; }
  const save = () => { try { localStorage.setItem("orderops-answers", JSON.stringify(answers)); } catch (e) { /* storage unavailable */ } };
  OD.answers = answers;

  OD.ACTIVITIES = {
    orders: {
      n: 1, title: "Find the overdue orders in Zone B",
      goal: "A shift lead says “Zone B feels behind today.” Use the table to find the evidence.",
      steps: [
        { text: "Search for a customer by name, e.g. type “shah”.", done: () => F().l1_search },
        { text: "Filter Zone = Zone B. Watch the funnel count drop.", done: () => F().l1_zoneB },
        { text: "Add the filter SLA = Overdue (keep Zone B).", done: () => F().l1_overdueB },
        { text: "Sort by Ship-by so the most urgent order is first.", done: () => F().l1_sortShip },
        { text: "Clear filters and move to page 2 using pagination.", done: () => F().l1_page },
        { text: "Click any row to open the order detail.", done: () => F().l1_detail },
      ],
      questions: [
        { id: "q1_pages", type: "number", text: "With no filters and 10 rows per page, how many pages does the table have?",
          answer: () => Math.ceil(rows().length / 10),
          hint: "Look at the pager (“Page 1 of …”), or divide the total orders by 10 and round up.",
          explain: (a) => `${rows().length} orders ÷ 10 per page = ${(rows().length / 10).toFixed(1)}, rounded up = ${a} pages. The last page is only partly full.` },
        { id: "q1_overdueB", type: "number", text: "How many Zone B orders are Overdue right now?",
          answer: () => rows().filter((r) => r.zone === "B" && r.sla === "Overdue").length,
          hint: "Set Zone = Zone B and SLA = Overdue, then read the last number in the funnel.",
          explain: (a) => `Correct: ${a}. Filters combine with AND: an order must be in Zone B AND be Overdue to stay in the table.` },
        { id: "q1_oldest", type: "text", text: "Which Zone B overdue order has the earliest ship-by time? (Type its order ID, e.g. ORD-10123.)",
          answer: () => { const r = rows().filter((x) => x.zone === "B" && x.sla === "Overdue").sort((a, b) => a.shipBy - b.shipBy)[0]; return r ? r.id : "none"; },
          hint: "Keep the two filters, then click the Ship-by column header until it sorts ascending (▲). The first row is the answer.",
          explain: (a) => `${a} has been waiting longest past its promise. Sorting doesn't remove anything; it puts the most important rows first.` },
        { id: "q1_reset", type: "choice", text: "You are on page 3, then you add a filter. Why does the table jump back to page 1?",
          options: ["It's a bug in the dashboard", "The filtered result is a new, smaller list, so page 3 may no longer exist", "Filters only work on page 1", "Pagination deletes the other pages"],
          answer: () => 1,
          hint: "Think about what happens to the number of matching rows when you filter.",
          explain: () => "A filter changes the result set. Page 3 of the old list means nothing in the new list (it may not even exist), so good tables reset to page 1." },
      ],
    },
    business: {
      n: 2, title: "Is today's delivery promise being kept?",
      goal: "The operations director wants a one-line answer and a reason. Use KPIs to see the overall picture, then charts to find where the problem is.",
      steps: [
        { text: "Click the On-time ship rate card and read “How it's calculated”.", done: () => F().l2_calc_onTimeRate },
        { text: "Use the Zone filter above the cards to look at a single zone.", done: () => F().l2_zone },
        { text: "Open “View data” under any chart to see the numbers behind it.", done: () => F().l2_table },
        { text: "Click a bar in “On-time ship rate by zone” to drill down to the orders.", done: () => F().l2_drill },
      ],
      questions: [
        { id: "q2_rate", type: "number", text: "What is today's overall on-time ship rate (All zones)? Give one decimal, e.g. 87.5.",
          answer: () => +OD.computeKpis(rows()).onTimeRate.toFixed(1), tolerance: 0.05,
          hint: "Set the zone filter to “All zones” and read the On-time ship rate card.",
          explain: (a) => `${a}% is below the 95% target, so the card shows “Watch”. But which part of the operation is causing it?` },
        { id: "q2_zone", type: "choice", text: "Which zone has the lowest on-time ship rate?",
          options: ["Zone A · Electronics", "Zone B · Apparel", "Zone C · Home & Kitchen", "Zone D · Beauty"],
          answer: () => OD.ZONE_KEYS.indexOf(OD.ZONE_KEYS.slice().sort((a, b) => zoneRate(a) - zoneRate(b))[0]),
          hint: "Look at the “On-time ship rate by zone” chart. Which bar is shortest?",
          explain: () => "The overall average hid this: three zones are near or above target and one zone pulls the total down. Breaking a KPI down by segment is how you find where to act." },
        { id: "q2_lateB", type: "number", text: "How many Zone B orders shipped late today?",
          answer: () => rows().filter((r) => r.zone === "B" && r.sla === "Shipped late").length,
          hint: "Click Zone B's bar in the zone chart. It opens the table filtered to Zone B + Shipped late.",
          explain: (a) => `${a} late shipments. The drill-down took you from a summary (a %) to the actual orders behind it, which is where you can find causes.` },
        { id: "q2_kpi", type: "choice", text: "“Orders received” has no target. Is it a KPI?",
          options: ["Yes, every number on a dashboard is a KPI", "Not really: it's a context metric. Without a target you can't say if it's good or bad", "No, because it can't be charted", "Yes, because it is the biggest number"],
          answer: () => 1,
          hint: "What turns a number into a Key Performance Indicator?",
          explain: () => "A KPI = a metric + a target + a direction (higher or lower is better). Volume numbers give context but don't tell you whether performance is good." },
      ],
    },
    live: {
      n: 3, title: "Watch the floor live, then handle an alert",
      goal: "You're on the evening shift. Watch how the numbers move, trigger a realistic problem, and respond to the alert it causes.",
      steps: [
        { text: "Advance the simulated clock (▶ Start, or a Step button).", done: () => F().advanced },
        { text: "Read one explanation in “Why did the numbers change?”.", done: () => F().advanced && OD.store.kpiLog.length > 0 },
        { text: "Run the scenario “Picker shortage in Zone B”.", done: () => F().shortage },
        { text: "While Zone B is short-staffed, run “Flash sale” and watch an alert fire.", done: () => F().shortage && F().flash && OD.store.alerts.some((a) => a.triggeredAt >= OD.store.shortageAt) },
        { text: "Acknowledge an active alert.", done: () => F().acked },
        { text: "Click Investigate on an alert to see the orders behind it.", done: () => F().l3_investigate },
        { text: "Change an alert threshold and watch alerts appear or disappear.", done: () => F().threshold },
      ],
      questions: [
        { id: "q3_time", type: "choice", text: "The Overdue count went up by 1, but no one touched that order. Why?",
          options: ["The simulation has a bug", "Time passed its ship-by time while it was still in the warehouse", "A new order arrived", "Someone changed its priority"],
          answer: () => 1,
          hint: "Look for an event saying “passed its ship-by time” in the event stream.",
          explain: () => "Many operational metrics depend on the clock, not just on events. An order that is fine at 16:59 can be overdue at 17:00 without any change to the order itself." },
        { id: "q3_zone", type: "choice", text: "When the flash sale hit during the picker shortage, which zone's “Zone backlog high” alert fired?",
          options: ["Zone A", "Zone B", "Zone C", "Zone D"],
          answer: () => 1,
          hint: "Check the alert's title, or filter the event stream for ALERT lines.",
          explain: () => "Zone B got the most new orders and had the fewest pickers, so its open orders piled up past the threshold. The alert pointed you at the right place before those orders became overdue." },
        { id: "q3_ack", type: "choice", text: "What is the difference between Acknowledged and Resolved?",
          options: ["They mean the same thing", "Acknowledged = a person has seen it and is on it; Resolved = the metric is back on the safe side of the threshold", "Resolved means someone clicked a button", "Acknowledged alerts are deleted"],
          answer: () => 1,
          hint: "Acknowledge an alert and watch: does it disappear?",
          explain: () => "Acknowledging stops it nagging other people, but the problem still exists. Only the data can resolve an alert, once the metric is back within limits." },
        { id: "q3_fatigue", type: "choice", text: "If you set the Overdue alert threshold to 1, what is the main risk?",
          options: ["No risk: more alerts are always safer", "Alert fatigue: so many alerts fire that people start ignoring them, including the important ones", "The dashboard will slow down", "Overdue orders will increase"],
          answer: () => 1,
          hint: "Try it in the rules table and count the active alerts.",
          explain: () => "Thresholds are a trade-off. Too sensitive means noise and ignored alerts; too relaxed means problems are noticed too late." },
      ],
    },
    roles: {
      n: 4, title: "Same data, different jobs",
      goal: "Compare how the Operations Manager and a Zone B Warehouse Operator use the dashboard, and see that both views read the same order data.",
      steps: [
        { text: "View as Operations Manager. Note the on-time rate and the pipeline counts.", done: () => F().l4_manager },
        { text: "View as Warehouse Operator (Zone B).", done: () => F().l4_operator },
        { text: "As the operator, act on the most urgent order (top of the queue).", done: () => F().opAction },
        { text: "Open Side by side and find what changed in the manager's view.", done: () => F().l4_side },
      ],
      questions: [
        { id: "q4_question", type: "choice", text: "Which question does the operator view answer best?",
          options: ["How is the whole facility performing against targets?", "What should I work on next, and how urgent is it?", "Which zone should get more staff tomorrow?", "How much revenue did we take today?"],
          answer: () => 1,
          hint: "Look at how the operator view is sorted.",
          explain: () => "Operators need a short, prioritised to-do list for right now. Managers need summaries, comparisons and trends to make decisions across the whole operation." },
        { id: "q4_queue", type: "number", text: "How many orders are in the Zone B operator queue right now?",
          answer: () => rows().filter((r) => r.zone === "B" && ["New", "Picking", "On Hold"].includes(r.status)).length,
          hint: "Switch to the operator view with Zone B selected and read “In my queue”.",
          explain: (a) => `${a}. The queue counts New, Picking and On Hold orders in Zone B; packed orders have moved on to the dispatch team.` },
        { id: "q4_changed", type: "choice", text: "Right after the operator clicked “Mark packed”, what changed in the manager's view?",
          options: ["Nothing: the views use different data", "The pipeline: Picking went down by 1 and Packed went up by 1", "The on-time ship rate immediately", "The order value"],
          answer: () => 1,
          hint: "Use Side by side, then click Mark packed and watch the highlighted pipeline boxes.",
          explain: () => "Both views read the same data. The order isn't shipped yet, so the on-time rate only changes later, when the carrier collects it (≈ 20 simulated min)." },
        { id: "q4_security", type: "choice", text: "The operator view hides order value. In a real system, is hiding it in the screen enough to protect it?",
          options: ["Yes, if it's not shown, nobody can see it", "No: the server must only send each role the data it is allowed to see (real access control)", "Yes, as long as the button is disabled", "Only on mobile"],
          answer: () => 1,
          hint: "Here anyone can click the role switch. What stops that in a real product?",
          explain: () => "Hiding is about focus and usability. Security needs authentication (who are you?) and server-side authorization (what may you see?). This lab only simulates roles." },
      ],
    },
  };

  OD.activityProgress = function (key) {
    const a = OD.ACTIVITIES[key];
    const steps = a.steps.filter((s) => s.done()).length;
    const qs = a.questions.filter((q) => answers[q.id] && answers[q.id].correct).length;
    return { steps, qs, total: a.steps.length + a.questions.length, done: steps + qs };
  };

  OD.renderActivity = function (key) {
    const a = OD.ACTIVITIES[key];
    const p = OD.activityProgress(key);
    const qhtml = a.questions.map((q, i) => {
      const st = answers[q.id];
      let input;
      if (q.type === "choice") {
        input = `<div class="opts" role="radiogroup">${q.options.map((o, j) => `<label><input type="radio" name="${q.id}" value="${j}" ${st && +st.value === j ? "checked" : ""}> <span>${OD.esc(o)}</span></label>`).join("")}</div>
          <div style="margin-top:6px"><button class="btn sm primary" data-check="${q.id}">Check</button></div>`;
      } else {
        input = `<div class="ans"><input class="input" id="in-${q.id}" ${q.type === "number" ? 'inputmode="decimal"' : ""} value="${st ? OD.esc(st.value) : ""}" aria-label="Answer"><button class="btn sm primary" data-check="${q.id}">Check</button></div>`;
      }
      let fb = "";
      if (st) fb = st.correct ? `<div class="fb ok">✓ ${OD.esc(st.msg)}</div>` : `<div class="fb no">✕ Not quite. Hint: ${OD.esc(st.msg)}</div>`;
      return `<div class="q" data-q="${q.id}"><div class="qt">Q${i + 1}. ${OD.esc(q.text)}</div>${input}${fb}</div>`;
    }).join("");
    return `<div class="card activity" id="activity">
      <div class="eyebrow">Guided activity ${a.n} of 4</div>
      <h3>${OD.esc(a.title)}</h3>
      <p class="goal">${OD.esc(a.goal)}</p>
      <div class="progress" aria-label="Progress ${p.done} of ${p.total}"><span style="width:${(p.done / p.total) * 100}%"></span></div>
      <div class="small muted" style="margin:-6px 0 8px">${p.steps}/${a.steps.length} steps · ${p.qs}/${a.questions.length} questions</div>
      <ol class="steps">${a.steps.map((s) => `<li class="${s.done() ? "done" : ""}"><span class="box" aria-hidden="true">${s.done() ? "✓" : ""}</span><span class="txt">${OD.esc(s.text)}${s.done() ? '<span class="sr-only"> (done)</span>' : ""}</span></li>`).join("")}</ol>
      ${qhtml}
    </div>`;
  };

  function check(qid) {
    let q, key;
    for (const k in OD.ACTIVITIES) { const f = OD.ACTIVITIES[k].questions.find((x) => x.id === qid); if (f) { q = f; key = k; } }
    let value;
    if (q.type === "choice") {
      const sel = document.querySelector(`input[name="${qid}"]:checked`);
      if (!sel) return;
      value = sel.value;
    } else {
      value = (document.getElementById("in-" + qid).value || "").trim();
      if (!value) return;
    }
    const expected = q.answer();
    let correct;
    if (q.type === "number") correct = Math.abs(parseFloat(value.replace(/[,%\s]/g, "")) - expected) <= (q.tolerance || 0);
    else if (q.type === "text") correct = value.toUpperCase().replace(/\s/g, "") === String(expected).toUpperCase();
    else correct = +value === expected;
    answers[qid] = { value, correct, msg: correct ? q.explain(expected) : q.hint };
    save();
    OD.rerender();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-check]");
    if (b) check(b.getAttribute("data-check"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id && e.target.id.startsWith("in-")) check(e.target.id.slice(3));
  });
})();
