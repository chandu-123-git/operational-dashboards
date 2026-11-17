/* =========================================================================
   charts.js — tiny SVG chart helpers (no library).
   Horizontal bars for comparing categories, vertical columns for counts
   over time. Every mark has a hover/focus tooltip; bars can be clickable
   to drill down into the orders table.
   ========================================================================= */
(function () {
  const OD = window.OD;
  const NS = "http://www.w3.org/2000/svg";
  const tip = () => document.getElementById("tooltip");

  function showTip(evt, html) {
    const t = tip();
    t.innerHTML = html;
    t.hidden = false;
    let x, y;
    if (evt.clientX != null && evt.type.startsWith("mouse")) { x = evt.clientX; y = evt.clientY; }
    else { const b = evt.target.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top; }
    const w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, x + 12)) + "px";
    t.style.top = Math.max(6, y - h - 10) + "px";
  }
  function hideTip() { const t = tip(); if (t) t.hidden = true; }
  OD.hideTip = hideTip;

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  // Bar with rounded data-end (4px) and square baseline end.
  function hBarPath(x, y, w, h, r) {
    r = Math.min(r, w, h / 2);
    if (w <= 0) return "";
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }
  function vBarPath(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    if (h <= 0) return "";
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  function wire(g, d, opts) {
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", opts.onClick ? "button" : "img");
    g.setAttribute("aria-label", d.aria || `${d.label}: ${d.valueText}`);
    const html = d.tip || `<b>${OD.esc(d.label)}</b>${OD.esc(d.valueText)}`;
    g.addEventListener("mousemove", (e) => showTip(e, html + (opts.onClick ? '<div style="opacity:.7;margin-top:3px">Click to see these orders</div>' : "")));
    g.addEventListener("mouseleave", hideTip);
    g.addEventListener("focus", (e) => showTip(e, html));
    g.addEventListener("blur", hideTip);
    if (opts.onClick) {
      g.addEventListener("click", () => { hideTip(); opts.onClick(d); });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hideTip(); opts.onClick(d); } });
    }
  }

  /* Horizontal bar chart.
     data: [{label, value, valueText, color?, faded?, tip?}]
     opts: {max, target:{value,label}, onClick, labelWidth} */
  OD.hbar = function (container, data, opts) {
    opts = opts || {};
    container.innerHTML = "";
    container.classList.toggle("clickable", !!opts.onClick);
    const W = Math.max(260, container.clientWidth || 480);
    const labelW = opts.labelWidth || Math.min(150, Math.round(W * 0.34));
    const valueW = 64;
    const rowH = 30, gap = 8, top = opts.target ? 22 : 4;
    const H = top + data.length * (rowH + gap) + 4;
    const plotW = W - labelW - valueW;
    const max = opts.max || Math.max(1, ...data.map((d) => d.value));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": opts.aria || "Bar chart" }, container);
    data.forEach((d, i) => {
      const y = top + i * (rowH + gap);
      const g = el("g", { class: "item" }, svg);
      el("rect", { x: 0, y: y - 3, width: W, height: rowH + 6, fill: "transparent", class: "hit" }, g);
      const t = el("text", { x: labelW - 10, y: y + rowH / 2 + 4, "text-anchor": "end", class: "lbl" }, g);
      t.textContent = d.label;
      el("rect", { x: labelW, y, width: plotW, height: rowH, fill: "#f1f1ed", rx: 4 }, g);
      const w = Math.max(d.value > 0 ? 2 : 0, (d.value / max) * plotW);
      el("path", { d: hBarPath(labelW, y, w, rowH, 4), fill: d.color || "var(--series-1)", class: "bar", opacity: d.faded ? 0.35 : 1 }, g);
      const v = el("text", { x: labelW + plotW + 8, y: y + rowH / 2 + 4, class: "val" }, g);
      v.textContent = d.valueText;
      wire(g, d, opts);
    });
    if (opts.target) {
      const x = labelW + (opts.target.value / max) * plotW;
      const tg = el("g", { class: "target" }, svg);
      el("line", { x1: x, x2: x, y1: 14, y2: H - 2 }, tg);
      const tt = el("text", { x, y: 10, "text-anchor": "middle" }, tg);
      tt.textContent = opts.target.label;
    }
  };

  /* Vertical column chart (e.g. orders per hour).
     data: [{label, value, valueText, tickLabel?}] */
  OD.vbar = function (container, data, opts) {
    opts = opts || {};
    container.innerHTML = "";
    const W = Math.max(260, container.clientWidth || 480);
    const H = opts.height || 210;
    const left = 30, right = 6, top = 10, bottom = 26;
    const plotW = W - left - right, plotH = H - top - bottom;
    const rawMax = Math.max(1, ...data.map((d) => d.value));
    const step = rawMax > 20 ? 10 : 5;
    const max = Math.ceil(rawMax / step) * step;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": opts.aria || "Column chart" }, container);
    const grid = el("g", { class: "grid" }, svg);
    for (let v = 0; v <= max; v += step) {
      const y = top + plotH - (v / max) * plotH;
      el("line", { x1: left, x2: W - right, y1: y, y2: y }, grid);
      const t = el("text", { x: left - 6, y: y + 4, "text-anchor": "end", class: "tick" }, grid);
      t.textContent = v;
    }
    const slot = plotW / data.length;
    const bw = Math.max(3, Math.min(28, slot - 2));
    data.forEach((d, i) => {
      const x = left + i * slot + (slot - bw) / 2;
      const h = (d.value / max) * plotH;
      const g = el("g", { class: "item" }, svg);
      el("rect", { x: left + i * slot, y: top, width: slot, height: plotH, fill: "transparent", class: "hit" }, g);
      el("path", { d: vBarPath(x, top + plotH - h, bw, h, Math.min(4, bw / 2)), fill: d.color || "var(--series-1)", class: "bar" }, g);
      if (d.tickLabel) {
        const t = el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", class: "tick" }, svg);
        t.textContent = d.tickLabel;
      }
      wire(g, d, opts);
    });
  };
})();
