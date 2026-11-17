/* =========================================================================
   sim.js — the shared data store, the SIMULATED live feed and alert rules.
   Nothing here connects to a real system. A timer in your browser advances
   a simulated clock; orders arrive and move through the warehouse according
   to their (hidden) schedules. Every change is recorded as an event so the
   dashboard can explain *why* a number changed.
   ========================================================================= */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const LIVE_SEED = 777;

  const S = (OD.store = {
    orders: [],
    now: C.START_NOW,
    rng: null,
    seq: 0,
    running: false,
    speed: 1, // simulated minutes per real second
    timer: null,
    events: [], // newest first
    kpiLog: [], // newest first
    alerts: [], // all alert instances (active, acknowledged, resolved)
    alertSeq: 0,
    shortageUntil: -1,
    changeId: 0,
    lastChange: null, // {label, events, kpiChanges} of the latest update
    flags: {}, // student progress flags used by the guided activities
    listeners: [],
    rows: [], // cached snapshot at `now`
    rules: null,
  });

  // ---- Alert rules: transparent "IF metric crosses threshold THEN alert" --
  function defaultRules() {
    return [
      {
        id: "overdue", name: "Overdue orders", severity: "critical", op: ">=", threshold: 6, unit: "orders",
        metricLabel: "open orders past their ship-by time",
        metric: (k) => k.overdue,
        why: "Each overdue order is a broken delivery promise. Several at once usually means a process problem, not bad luck.",
        investigate: () => ({ status: "open", sla: "Overdue" }),
      },
      {
        id: "backlog", name: "Zone backlog high", severity: "warning", op: ">=", threshold: 20, unit: "open orders",
        perZone: true, metricLabel: "open orders in one zone",
        metric: (k, rows, zone) => rows.filter((r) => r.zone === zone && C.OPEN_STATUSES.includes(r.status)).length,
        why: "Work is arriving faster than the zone can pick it. If nothing changes, orders will start missing their ship-by time.",
        investigate: (zone) => ({ status: "open", zone }),
      },
      {
        id: "express", name: "Express orders at risk", severity: "warning", op: ">=", threshold: 2, unit: "orders",
        metricLabel: "Express orders with ≤ 60 min left",
        metric: (k, rows) => rows.filter((r) => r.priority === "Express" && r.sla === "At risk").length,
        why: "Express customers paid for speed. These orders can still be saved if someone acts now.",
        investigate: () => ({ priority: "Express", sla: "At risk" }),
      },
      {
        id: "ontime", name: "On-time ship rate low", severity: "critical", op: "<", threshold: 90, unit: "%",
        metricLabel: "today's on-time ship rate",
        metric: (k) => (k.onTimeRate == null ? 100 : +k.onTimeRate.toFixed(1)),
        why: "The day's overall service level has dropped below the minimum acceptable level.",
        investigate: () => ({ status: "Shipped", sla: "Shipped late" }),
      },
      {
        id: "hold", name: "Orders on hold", severity: "warning", op: ">=", threshold: 4, unit: "orders",
        metricLabel: "orders stuck On Hold",
        metric: (k) => k.onHold,
        why: "Held orders don't move until someone resolves the stock, payment or address problem.",
        investigate: () => ({ status: "On Hold" }),
      },
    ];
  }

  // ---- Store basics ---------------------------------------------------------
  OD.subscribe = (fn) => S.listeners.push(fn);
  function notify() {
    S.listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }
  OD.notify = notify;
  function refreshRows() { S.rows = OD.snapshot(S.orders, S.now); return S.rows; }
  OD.rows = () => S.rows;
  OD.kpis = () => OD.computeKpis(S.rows);
  OD.setFlag = (k, v) => { if (S.flags[k] !== (v === undefined ? true : v)) { S.flags[k] = v === undefined ? true : v; notify(); } };

  OD.reset = function (keepFlags) {
    pause();
    S.orders = OD.generateOrders();
    S.seq = S.orders.length;
    S.now = C.START_NOW;
    S.rng = OD.mulberry32(LIVE_SEED);
    S.events = [];
    S.kpiLog = [];
    S.alerts = [];
    S.shortageUntil = -1;
    S.lastChange = null;
    if (!keepFlags) S.flags = {};
    S.rules = S.rules || defaultRules();
    refreshRows();
    evaluateAlerts(true);
    notify();
  };
  OD.resetRules = function () { S.rules = defaultRules(); evaluateAlerts(); notify(); };

  // ---- Change tracking: before -> change -> after -> explain ---------------
  const KPI_DEFS = [
    { key: "received", label: "Orders received", fmt: (v) => OD.fmtInt(v) },
    { key: "value", label: "Order value", fmt: (v) => OD.fmtMoney(v) },
    { key: "onTimeRate", label: "On-time ship rate", fmt: (v) => OD.fmtPct(v) },
    { key: "avgHoursToShip", label: "Avg time to ship", fmt: (v) => (v == null ? "—" : v.toFixed(2) + " h") },
    { key: "open", label: "Open backlog", fmt: (v) => OD.fmtInt(v) },
    { key: "overdue", label: "Overdue orders", fmt: (v) => OD.fmtInt(v) },
  ];
  OD.KPI_DEFS = KPI_DEFS;

  function diffRows(before, after) {
    const prev = new Map(before.map((r) => [r.id, r]));
    const ev = [];
    for (const r of after) {
      const p = prev.get(r.id);
      const tag = `${r.id} (${C.ZONES[r.zone].name}, ${r.priority})`;
      if (!p) { ev.push({ type: "new", id: r.id, zone: r.zone, text: `New order ${tag} arrived — must ship by ${OD.fmtTime(r.shipBy)}.` }); continue; }
      if (p.status !== r.status) {
        let text = `${tag} moved ${p.status} → ${r.status}.`;
        let type = "status";
        if (r.status === "Shipped") {
          type = r.sla === "Shipped on time" ? "shipped-ontime" : "shipped-late";
          text = `${tag} shipped ${r.sla === "Shipped on time" ? "on time" : "LATE (" + OD.fmtDuration(r.ref.shippedAt - r.shipBy) + " after ship-by)"}.`;
        } else if (r.status === "Cancelled") { type = "cancelled"; text = `${tag} was cancelled by the customer.`; }
        else if (r.status === "On Hold") { type = "hold"; text = `${tag} put On Hold: ${r.ref.hold.reason}.`; }
        ev.push({ type, id: r.id, zone: r.zone, from: p.status, to: r.status, wasOverdue: p.sla === "Overdue", text });
      } else if (p.sla !== r.sla && C.OPEN_STATUSES.includes(r.status)) {
        if (r.sla === "Overdue") ev.push({ type: "overdue", id: r.id, zone: r.zone, text: `${tag} passed its ship-by time (${OD.fmtTime(r.shipBy)}) while still ${r.status}. No one touched it — time passing made it overdue.` });
        else if (r.sla === "At risk") ev.push({ type: "atrisk", id: r.id, zone: r.zone, text: `${tag} now has ≤ 60 min left before ship-by (${OD.fmtTime(r.shipBy)}).` });
      }
    }
    return ev;
  }

  // Which events can move which KPI — used to explain each change.
  const CAUSES = {
    received: (e) => e.type === "new",
    value: (e) => e.type === "new" || e.type === "cancelled",
    onTimeRate: (e) => e.type.startsWith("shipped"),
    avgHoursToShip: (e) => e.type.startsWith("shipped"),
    open: (e) => e.type === "new" || e.type.startsWith("shipped") || e.type === "cancelled",
    overdue: (e) => e.type === "overdue" || (e.wasOverdue && (e.type.startsWith("shipped") || e.type === "cancelled")),
  };

  /* Run `fn` (which mutates orders and/or the clock) and record what changed. */
  function applyChange(label, fn, opts) {
    opts = opts || {};
    const beforeRows = S.rows;
    const kBefore = OD.computeKpis(beforeRows);
    fn();
    const afterRows = refreshRows();
    const kAfter = OD.computeKpis(afterRows);
    const events = diffRows(beforeRows, afterRows).map((e) => Object.assign(e, { t: S.now, source: label }));
    const kpiChanges = [];
    for (const d of KPI_DEFS) {
      const a = kBefore[d.key], b = kAfter[d.key];
      const changed = d.key === "onTimeRate" || d.key === "avgHoursToShip" ? Math.abs((a || 0) - (b || 0)) > 1e-9 : a !== b;
      if (changed) {
        const causes = events.filter(CAUSES[d.key]);
        kpiChanges.push({ t: S.now, key: d.key, label: d.label, from: a, to: b, fromTxt: d.fmt(a), toTxt: d.fmt(b), causes: causes.map((c) => c.text) });
      }
    }
    if (opts.scenarioText) events.unshift({ t: S.now, type: "scenario", text: opts.scenarioText, source: label });
    S.events = events.slice().reverse().concat(S.events).slice(0, 400);
    S.kpiLog = kpiChanges.slice().reverse().concat(S.kpiLog).slice(0, 120);
    S.lastChange = { id: ++S.changeId, label, t: S.now, events, kpiChanges };
    evaluateAlerts();
    return S.lastChange;
  }

  // ---- The simulated clock ------------------------------------------------------
  function arrivalRate() {
    const h = Math.floor(S.now / 60) % 24;
    return h < C.HOURLY_RATE.length ? C.HOURLY_RATE[h] : 15; // orders per hour
  }
  function oneMinute() {
    S.now += 1;
    if (S.rng() < arrivalRate() / 60) {
      S.seq += 1;
      const placed = S.now - S.rng() * 0.9;
      const shortage = S.now <= S.shortageUntil;
      const o = OD.makeOrder(S.rng, S.seq, placed, { noCancel: true });
      if (shortage && o.zone === "B") stretchPick(o, 3);
      S.orders.push(o);
    }
  }
  function stretchPick(o, factor) {
    const pickDur = o.packedAt - o.pickStartAt;
    const extra = Math.round(pickDur * (factor - 1));
    o.packedAt += extra;
    o.shippedAt += extra;
  }

  /* Advance the simulated clock by n minutes (one "tick" per minute). */
  OD.advance = function (n) {
    n = n || 1;
    let last = null;
    const allEvents = [], allChanges = [];
    for (let i = 0; i < n; i++) {
      last = applyChange("clock", oneMinute);
      allEvents.push(...last.events);
      allChanges.push(...last.kpiChanges);
    }
    S.lastChange = { id: ++S.changeId, label: n === 1 ? "+1 simulated minute" : `+${n} simulated minutes`, t: S.now, events: allEvents, kpiChanges: allChanges, minutes: n };
    S.flags.advanced = true;
    notify();
  };

  function pause() { S.running = false; if (S.timer) clearInterval(S.timer); S.timer = null; }
  OD.play = function () {
    if (S.running) return;
    S.running = true;
    S.flags.played = true;
    S.timer = setInterval(() => OD.advance(S.speed), 1000);
    notify();
  };
  OD.pause = () => { pause(); notify(); };
  OD.setSpeed = (v) => { S.speed = v; notify(); };

  // ---- Scenarios (deliberate disruptions to make alerts happen) ------------
  OD.scenarios = {
    shortage: {
      label: "Picker shortage in Zone B",
      desc: "Two pickers in Zone B go on an unplanned break. For the next 90 simulated minutes every Zone B order takes much longer to pick.",
      run() {
        applyChange("scenario", () => {
          S.shortageUntil = S.now + 90;
          S.shortageAt = S.now;
          S.orders.forEach((o) => {
            if (o.zone === "B" && !o.hold && o.cancelledAt == null && o.packedAt > S.now && o.placedAt <= S.now) {
              const extra = 60 + Math.round(S.rng() * 60);
              o.packedAt = Math.max(o.packedAt, S.now) + extra;
              o.shippedAt = o.packedAt + o._packDur + 15;
            }
          });
        }, { scenarioText: "SCENARIO: Picker shortage in Zone B — Zone B picking slows down for 90 min." });
        S.flags.shortage = true;
        notify();
      },
    },
    flash: {
      label: "Flash sale (order burst)",
      desc: "A marketing email (mostly Apparel deals) goes out. 16 orders arrive at once: half of them Express, 7 of them for Zone B.",
      run() {
        applyChange("scenario", () => {
          for (let i = 0; i < 16; i++) {
            S.seq += 1;
            const zone = "BABCBDBABCBDBACD"[i]; // Apparel-heavy sale
            const o = OD.makeOrder(S.rng, S.seq, S.now, { zone, priority: i % 2 ? "Express" : "Standard", extraWait: 25, noCancel: true });
            if (S.now <= S.shortageUntil && o.zone === "B") stretchPick(o, 2.5);
            S.orders.push(o);
          }
        }, { scenarioText: "SCENARIO: Flash sale — 16 orders arrived at once." });
        S.flags.flash = true;
        notify();
      },
    },
    stock: {
      label: "Stock mismatch in Zone C",
      desc: "A shelf count in Zone C doesn't match the system. 4 orders waiting for those items are put On Hold.",
      run() {
        applyChange("scenario", () => {
          const cand = S.rows.filter((r) => (r.status === "New" || r.status === "Picking") && !r.ref.hold)
            .sort((a, b) => (a.zone === "C" ? 0 : 1) - (b.zone === "C" ? 0 : 1) || a.shipBy - b.shipBy)
            .slice(0, 4);
          cand.forEach((r) => { r.ref.hold = { reason: "Stock mismatch", since: S.now }; });
        }, { scenarioText: "SCENARIO: Stock mismatch — 4 orders put On Hold." });
        S.flags.stock = true;
        notify();
      },
    },
  };

  // ---- Operator actions (used by the role-based lesson) --------------------
  function findOrder(id) { return S.orders.find((o) => o.id === id); }
  OD.actions = {
    startPicking(id) {
      const o = findOrder(id);
      applyChange("operator", () => {
        const dur = o.packedAt - o.pickStartAt;
        o.pickStartAt = S.now;
        o.packedAt = S.now + Math.max(5, Math.min(dur, 45));
        o.shippedAt = o.packedAt + o._packDur + 15;
      });
      S.flags.opAction = true;
      notify();
    },
    markPacked(id) {
      const o = findOrder(id);
      applyChange("operator", () => {
        if (o.pickStartAt > S.now) o.pickStartAt = S.now;
        o.packedAt = S.now;
        o.shippedAt = S.now + 20; // carrier hand-over ~20 min after packing
      });
      S.flags.opAction = true;
      S.flags.packed = true;
      notify();
    },
    releaseHold(id) {
      const o = findOrder(id);
      applyChange("operator", () => {
        o.hold = null;
        o.pickStartAt = Math.min(o.pickStartAt, S.now);
        o.packedAt = S.now + 15;
        o.shippedAt = o.packedAt + o._packDur + 15;
      });
      S.flags.opAction = true;
      notify();
    },
  };

  // ---- Alert evaluation -------------------------------------------------------------
  function compare(v, op, th) { return op === ">=" ? v >= th : v < th; }
  function evaluateAlerts(silent) {
    const k = OD.computeKpis(S.rows);
    const checks = [];
    for (const rule of S.rules) {
      const keys = rule.perZone ? OD.ZONE_KEYS : [""];
      for (const key of keys) {
        const value = rule.metric(k, S.rows, key);
        checks.push({ rule, key, value, firing: compare(value, rule.op, rule.threshold) });
      }
    }
    for (const c of checks) {
      const open = S.alerts.find((a) => a.ruleId === c.rule.id && a.key === c.key && a.status !== "resolved");
      if (c.firing && !open) {
        S.alertSeq += 1;
        const a = {
          uid: S.alertSeq, ruleId: c.rule.id, key: c.key, severity: c.rule.severity,
          title: c.rule.name + (c.key ? ` — ${C.ZONES[c.key].name} (${C.ZONES[c.key].category})` : ""),
          status: "active", triggeredAt: S.now, valueAtTrigger: c.value, value: c.value, threshold: c.rule.threshold, op: c.rule.op,
        };
        S.alerts.unshift(a);
        if (!silent) S.events.unshift({ t: S.now, type: "alert", text: `ALERT ${c.rule.severity.toUpperCase()}: ${a.title} — value ${c.value} ${c.rule.op} threshold ${c.rule.threshold}.` });
      } else if (open) {
        open.value = c.value;
        open.threshold = c.rule.threshold;
        if (!c.firing) {
          open.status = "resolved";
          open.resolvedAt = S.now;
          S.events.unshift({ t: S.now, type: "alert-resolved", text: `RESOLVED: ${open.title} — value back to ${c.value} (threshold ${c.rule.op} ${c.rule.threshold}).` });
        }
      }
    }
    S.ruleChecks = checks;
  }
  OD.evaluateAlerts = () => { evaluateAlerts(); notify(); };
  OD.ackAlert = (uid) => {
    const a = S.alerts.find((x) => x.uid === uid);
    if (a && a.status === "active") { a.status = "acknowledged"; a.ackAt = S.now; S.flags.acked = true; }
    notify();
  };
  OD.setThreshold = (ruleId, v) => {
    const r = S.rules.find((x) => x.id === ruleId);
    if (!r || !isFinite(v)) return;
    r.threshold = v;
    S.flags.threshold = true;
    evaluateAlerts();
    notify();
  };
  OD.activeAlerts = () => S.alerts.filter((a) => a.status !== "resolved");
})();
