/* =========================================================================
   data.js — the BrightCart order data model.
   Everything here is SIMULATED. Orders are generated from a fixed seed so
   every student sees exactly the same starting numbers.
   Time is stored as "minutes since 00:00 today" (16:00 = 960).
   ========================================================================= */
(function () {
  const OD = (window.OD = window.OD || {});

  // ---- Seeded random numbers (same seed -> same data for everyone) --------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  OD.mulberry32 = mulberry32;

  // ---- Business constants -------------------------------------------------
  const C = {
    DATE_LABEL: "Fri 13 Nov 2026",
    START_NOW: 16 * 60, // the dashboard opens at 16:00
    SLA_MIN: { Express: 120, Standard: 360 }, // ship within 2 h / 6 h of placement
    AT_RISK_MIN: 60, // open order with <= 60 min left = "At risk"
    TARGETS: { onTimeRate: 95, avgHoursToShip: 2.0, overdue: 0 },
    ZONES: {
      A: { name: "Zone A", category: "Electronics", weight: 0.27, pick: [12, 25], exception: 0.08, value: [1500, 24000] },
      B: { name: "Zone B", category: "Apparel", weight: 0.3, pick: [25, 60], exception: 0.45, value: [600, 4200] },
      C: { name: "Zone C", category: "Home & Kitchen", weight: 0.25, pick: [12, 30], exception: 0.06, value: [400, 6500] },
      D: { name: "Zone D", category: "Beauty", weight: 0.18, pick: [8, 20], exception: 0.04, value: [200, 2600] },
    },
    STATUSES: ["New", "Picking", "Packed", "On Hold", "Shipped", "Cancelled"],
    OPEN_STATUSES: ["New", "Picking", "Packed", "On Hold"],
    // orders per hour, 00:00 .. 15:00 (quiet night, morning ramp, late-morning peak)
    HOURLY_RATE: [4, 3, 3, 3, 4, 6, 9, 12, 16, 21, 24, 24, 22, 19, 17, 16],
  };
  OD.C = C;
  OD.ZONE_KEYS = Object.keys(C.ZONES);

  const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Meera",
    "Karan", "Isha", "Aditya", "Divya", "Siddharth", "Pooja", "Nikhil", "Riya", "Varun", "Neha",
    "Daniel", "Sara", "Omar", "Lena", "James", "Fatima", "Leo", "Maya", "Ethan", "Zara",
    "Harsh", "Tanvi", "Manish", "Shreya", "Kabir", "Aisha", "Dev", "Nisha", "Yash", "Ira"];
  const LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Shah", "Nair", "Gupta", "Rao", "Khan", "Menon",
    "Das", "Kapoor", "Joshi", "Verma", "Bose", "Pillai", "Singh", "Mehta", "Chopra", "Kulkarni",
    "Fernandes", "Thomas", "Ali", "Brown", "Wilson", "Mishra", "Banerjee", "Agarwal", "Malhotra", "Desai"];
  const HOLD_REASONS = ["Stock mismatch", "Payment review", "Address check"];

  const between = (r, lo, hi) => lo + r() * (hi - lo);
  const pickWeighted = (r, entries) => {
    const x = r();
    let acc = 0;
    for (const [k, w] of entries) { acc += w; if (x < acc) return k; }
    return entries[entries.length - 1][0];
  };

  /* Build one order. `r` is a random function, `placed` the minute it arrived.
     The order carries its own (hidden) schedule: when picking starts, when it
     is packed and when it ships. The dashboard only ever shows events whose
     time has already passed. */
  function makeOrder(r, seq, placed, opts) {
    opts = opts || {};
    const zone = opts.zone || pickWeighted(r, OD.ZONE_KEYS.map((k) => [k, C.ZONES[k].weight]));
    const z = C.ZONES[zone];
    const priority = opts.priority || (r() < 0.25 ? "Express" : "Standard");
    const items = 1 + Math.floor(Math.pow(r(), 1.8) * 6);
    const value = Math.round(between(r, z.value[0], z.value[1]) * (0.8 + items * 0.15) / 10) * 10;
    const customer = FIRST[Math.floor(r() * FIRST.length)] + " " + LAST[Math.floor(r() * LAST.length)];
    const hour = Math.floor(placed / 60) % 24;
    const peak = hour >= 9 && hour <= 13;
    let wait = between(r, 5, 25) + (peak ? 15 : 0) + (opts.extraWait || 0);
    if (priority === "Express") wait *= 0.5;
    let pick = between(r, z.pick[0], z.pick[1]) * (opts.pickFactor || 1);
    // Exceptions: an item can't be found, a bin is mislabelled... adds a long delay.
    if (r() < z.exception) pick += between(r, 150, 450);
    const pack = between(r, 8, 20);
    const handover = between(r, 10, 35);
    const o = {
      id: "ORD-" + (10000 + seq),
      customer,
      zone,
      priority,
      items,
      value,
      placedAt: Math.round(placed),
      shipBy: Math.round(placed) + C.SLA_MIN[priority],
      pickStartAt: Math.round(placed + wait),
      packedAt: Math.round(placed + wait + pick),
      shippedAt: Math.round(placed + wait + pick + pack + handover),
      cancelledAt: null,
      hold: null, // { reason, since }
    };
    o._packDur = Math.round(pack);
    // Small share of cancellations (customer cancels before picking finishes)
    if (!opts.noCancel && r() < 0.03) o.cancelledAt = Math.round(placed + between(r, 5, 40));
    return o;
  }
  OD.makeOrder = makeOrder;

  /* Generate today's orders from 00:00 until `now` (default 16:00). */
  function generateOrders(seed) {
    const r = mulberry32(seed || 20261143);
    const orders = [];
    const placedTimes = [];
    C.HOURLY_RATE.forEach((rate, h) => {
      const n = Math.max(0, Math.round(rate + (r() - 0.5) * 4));
      for (let i = 0; i < n; i++) placedTimes.push(h * 60 + r() * 59.9);
    });
    placedTimes.sort((a, b) => a - b);
    placedTimes.forEach((t, i) => orders.push(makeOrder(r, i + 1, t)));
    // A few recent open orders are on hold (stock / payment / address checks)
    orders.forEach((o) => {
      if (o.cancelledAt == null && o.placedAt > C.START_NOW - 240 && o.pickStartAt <= C.START_NOW && o.packedAt > C.START_NOW && r() < 0.12) {
        o.hold = { reason: HOLD_REASONS[Math.floor(r() * HOLD_REASONS.length)], since: o.pickStartAt };
      }
    });
    return orders;
  }
  OD.generateOrders = generateOrders;

  // ---- Derived fields: status and SLA at a given time `now` ----------------
  function statusAt(o, now) {
    if (o.cancelledAt != null && o.cancelledAt <= now) return "Cancelled";
    // A hold freezes the order: its schedule doesn't move until it is released.
    if (o.hold && o.hold.since <= now) return "On Hold";
    if (o.shippedAt <= now) return "Shipped";
    if (o.packedAt <= now) return "Packed";
    if (o.pickStartAt <= now) return "Picking";
    return "New";
  }
  OD.statusAt = statusAt;

  /* SLA labels:
     open orders  -> "On track" | "At risk" (<= 60 min left) | "Overdue" (past ship-by)
     shipped      -> "Shipped on time" | "Shipped late"
     cancelled    -> "—" */
  function slaAt(o, status, now) {
    if (status === "Cancelled") return "—";
    if (status === "Shipped") return o.shippedAt <= o.shipBy ? "Shipped on time" : "Shipped late";
    const left = o.shipBy - now;
    if (left < 0) return "Overdue";
    if (left <= C.AT_RISK_MIN) return "At risk";
    return "On track";
  }
  OD.slaAt = slaAt;
  OD.SLA_VALUES = ["On track", "At risk", "Overdue", "Shipped on time", "Shipped late", "—"];

  /* Returns a lightweight "view" of every order that has been placed by `now`,
     with status and sla filled in. Future-scheduled times are not exposed. */
  function snapshot(orders, now) {
    const out = [];
    for (const o of orders) {
      if (o.placedAt > now) continue;
      const status = statusAt(o, now);
      out.push({
        ref: o,
        id: o.id,
        customer: o.customer,
        zone: o.zone,
        priority: o.priority,
        items: o.items,
        value: o.value,
        placedAt: o.placedAt,
        shipBy: o.shipBy,
        status,
        sla: slaAt(o, status, now),
        minutesLeft: o.shipBy - now,
      });
    }
    return out;
  }
  OD.snapshot = snapshot;

  // ---- KPI calculations (each returns the numbers used, for "show the math")
  function computeKpis(rows) {
    const received = rows.length;
    const notCancelled = rows.filter((r) => r.status !== "Cancelled");
    const shipped = rows.filter((r) => r.status === "Shipped");
    const onTime = shipped.filter((r) => r.sla === "Shipped on time");
    const open = rows.filter((r) => C.OPEN_STATUSES.includes(r.status));
    const overdue = open.filter((r) => r.sla === "Overdue");
    const value = notCancelled.reduce((s, r) => s + r.value, 0);
    const totalShipMinutes = shipped.reduce((s, r) => s + (r.ref.shippedAt - r.placedAt), 0);
    return {
      received,
      cancelled: received - notCancelled.length,
      value,
      shipped: shipped.length,
      onTime: onTime.length,
      onTimeRate: shipped.length ? (onTime.length / shipped.length) * 100 : null,
      totalShipMinutes,
      avgHoursToShip: shipped.length ? totalShipMinutes / shipped.length / 60 : null,
      open: open.length,
      overdue: overdue.length,
      atRisk: open.filter((r) => r.sla === "At risk").length,
      onHold: open.filter((r) => r.status === "On Hold").length,
    };
  }
  OD.computeKpis = computeKpis;

  // ---- Formatting helpers --------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  OD.fmtTime = function (m) {
    m = Math.round(m);
    const day = Math.floor(m / 1440);
    const mm = ((m % 1440) + 1440) % 1440;
    const t = pad(Math.floor(mm / 60)) + ":" + pad(mm % 60);
    return day > 0 ? t + " (+1d)" : t;
  };
  OD.fmtDuration = function (min) {
    const sign = min < 0 ? "-" : "";
    min = Math.abs(Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    return sign + (h ? h + "h " + pad(m) + "m" : m + "m");
  };
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  OD.fmtMoney = (v) => inr.format(v);
  OD.fmtInt = (v) => new Intl.NumberFormat("en-IN").format(v);
  OD.fmtPct = (v, d = 1) => (v == null ? "—" : v.toFixed(d) + "%");
  OD.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
})();
