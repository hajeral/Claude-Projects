/* =====================================================================
   Charts — SVG strings that animate once per render (.anim on #page)   [LEAD]
   Time axes always run left→right; legends/tooltips follow dir.
   ===================================================================== */
(function (W) {
  'use strict';
  const t = (k, v) => W.t(k, v);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let uid = 0; const id = (p) => p + (++uid);
  const COL = { rose: 'var(--line-rose)', berry: 'var(--line-berry)', mauve: 'var(--line-mauve)', lime: 'var(--line-lime)', green: 'var(--line-green)', orange: 'var(--line-orange)', grey: 'var(--line-grey)', gray: 'var(--line-grey)' };
  const col = (c) => COL[c] || c || COL.rose;
  const glow = (c) => (c === 'rose' || c === 'berry' ? 'ln-rose' : c === 'lime' ? 'ln-lime' : '');
  function fromSeries(o) {
    if (!o.series || !o.series.some((s) => s.points)) return o;
    const first = (o.series.find((s) => s.points) || {}).points || [];
    return { ...o, labels: o.labels || first.map((p) => p.x), series: o.series.map((s) => (s.points ? { name: s.name || s.label, color: s.color, dashed: s.dashed, fill: s.fill, dots: s.dots, values: s.points.map((p) => p.y) } : s)) };
  }
  const lbl = (s) => { s = String(s); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return W.fmt.text.date(s.slice(0, 10), 'short'); if (/^\d{4}-\d{2}$/.test(s)) return t(W.I18N.months[+s.slice(5) - 1]); const m = s.match(/^([A-Z][a-z]{2})(\s+)(\d+)$/); if (m && W.App.state.lang === 'ar') return `${m[3]} ${t(m[1])}`; return t(s); };

  function smooth(p) {
    if (p.length < 2) return '';
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)},${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)},${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
    }
    return d;
  }
  const niceTicks = (min, max, n = 4) => { const span = max - min || 1; const step = Math.pow(10, Math.floor(Math.log10(span / n))); const err = span / n / step; const s = step * (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1); const out = []; for (let v = Math.floor(min / s) * s; v <= max + s * 0.5; v += s) out.push(+v.toFixed(6)); return out; };

  /* (v1.3) x-axis labels without collisions: estimate each label's width (10.5px axis font), keep the first and the
     last label, then add evenly strided labels in between only where they don't overlap their neighbours. */
  const AX_CH = 6.1, AX_GAP = 10;
  function xTicks(labels, X, y, o = {}) {
    const n = labels.length; if (!n) return '';
    const txt = labels.map((s) => (s ? lbl(s) : ''));
    const anchor = (i) => (!o.edges ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle');
    const ext = (i) => { const w = String(txt[i]).length * AX_CH; const x = X(i); const a = anchor(i); return a === 'start' ? [x, x + w] : a === 'end' ? [x - w, x] : [x - w / 2, x + w / 2]; };
    const span = n > 1 ? Math.abs(X(n - 1) - X(0)) : 0; const maxW = Math.max(1, ...txt.map((x) => String(x).length * AX_CH)) + AX_GAP;
    const fit = Math.max(2, Math.floor(span / maxW) + 1);
    const every = Math.max(1, o.every || Math.ceil((n - 1) / (fit - 1)));
    const keep = new Set(); const last = n - 1;
    const free = (i, others) => { const [a, b] = ext(i); return others.every((j) => { const [c, d] = ext(j); return b + AX_GAP <= c || d + AX_GAP <= a; }); };
    if (txt[0]) keep.add(0);
    if (n > 1 && txt[last] && free(last, [...keep])) keep.add(last);
    for (let i = every; i < last; i += every) if (txt[i] && free(i, [...keep])) keep.add(i);
    return [...keep].sort((a, b) => a - b).map((i) => `<text class="ax" x="${X(i).toFixed(1)}" y="${y}" text-anchor="${anchor(i)}">${esc(txt[i])}</text>`).join('');
  }

  function legend(series, kind = 'line') {
    return `<div class="lgd">${series.map((s) => `<span><i class="${kind === 'bar' ? 'sq' : ''}${s.dashed ? ' dash' : ''}" style="background:${col(s.color)};color:${col(s.color)}"></i>${esc(t(s.name))}</span>`).join('')}</div>`;
  }

  /* area / line */
  function area(o) {
    o = fromSeries(o);
    const W0 = o.width || 600, H = o.height || 240, L = o.yAxis === false ? 8 : 42, T = 12, R = 10, B = 26;
    const w = W0 - L - R, h = H - T - B;
    const all = o.series.flatMap((s) => s.values);
    const ticks = o.yTicks || niceTicks(o.min != null ? o.min : Math.min(0, ...all), o.max != null ? o.max : Math.max(...all));
    const min = o.min != null ? o.min : ticks[0], max = o.max != null ? o.max : ticks[ticks.length - 1];
    const n = Math.max(...o.series.map((s) => s.values.length));
    const X = (i) => L + (n === 1 ? w / 2 : (i * w) / (n - 1));
    const Y = (v) => T + h - ((v - min) / (max - min || 1)) * h;
    const yf = o.yFormat || ((v) => W.fmt.text.compact(v));
    const grid = o.yAxis === false ? '' : ticks.map((v) => `<line class="gl" x1="${L}" x2="${W0 - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${L - 8}" y="${Y(v) + 3.5}" text-anchor="end">${esc(yf(v))}</text>`).join('');
    const labels = o.labels || [];
    const xs = xTicks(labels, X, H - 6, { every: o.labelEvery, edges: true });
    const defs = []; const paths = [];
    o.series.forEach((s, k) => {
      const p = s.values.map((v, i) => [X(i), Y(v)]);
      const d = s.straight ? 'M' + p.map((q) => q.join(' ')).join(' L') : smooth(p);
      const c = col(s.color || (k ? 'mauve' : 'rose'));
      if ((o.fill !== false && k === 0 && !s.dashed) || s.fill) {
        const gid = id('ag'); defs.push(`<linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".3"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`);
        paths.push(`<path class="afill" d="${d} L${p[p.length - 1][0]} ${T + h} L${p[0][0]} ${T + h}Z" fill="url(#${gid})"/>`);
      }
      paths.push(s.dashed
        ? `<path class="afill" d="${d}" fill="none" stroke="${c}" stroke-width="1.7" stroke-dasharray="4 4"/>`
        : `<path class="draw ${glow(s.color || (k ? 'mauve' : 'rose'))}" pathLength="1" d="${d}" fill="none" stroke="${c}" stroke-width="2.2"/>`);
      if (s.dots) p.forEach((q) => paths.push(`<circle class="afill" cx="${q[0]}" cy="${q[1]}" r="3.2" fill="var(--bg)" stroke="${c}" stroke-width="2"/>`));
    });
    let tip = '';
    if (o.tooltip && o.tooltip.index != null) {
      const s0 = o.series[o.tooltip.series || 0]; const i = o.tooltip.index; const x = X(i), y = Y(s0.values[i]); const c = col(s0.color || 'rose');
      paths.push(`<line class="afill" x1="${x}" x2="${x}" y1="${y}" y2="${T + h}" stroke="${c}" stroke-dasharray="2 3"/><circle class="afill" cx="${x}" cy="${y}" r="4.6" fill="var(--bg)" stroke="${c}" stroke-width="2.2"/>`);
      tip = `<div class="tipw" style="inset-inline-start:${(x / W0) * 100}%;top:${(y / H) * 100}%"><div class="tip">${o.tooltip.title || ''}<b>${o.tooltip.value || ''}${o.tooltip.delta ? `<em class="num">${esc(o.tooltip.delta)}</em>` : ''}</b></div></div>`;
    }
    const svg = `<div class="chart" role="img" aria-label="${esc(t(o.label || (o.series[0] && o.series[0].name) || 'Chart'))}"><svg viewBox="0 0 ${W0} ${H}"><defs>${defs.join('')}</defs>${grid}${xs}${paths.join('')}</svg>${tip}</div>`;
    return (o.legend === false || o.series.length < 2 && !o.legend ? '' : legend(o.series)) + svg;
  }
  const line = (o) => area({ ...o, fill: false });

  /* grouped / stacked bars */
  function bars(o) {
    o = fromSeries(o);
    const W0 = o.width || 460, H = o.height || 220, L = 42, T = 8, R = 6, B = 26;
    const w = W0 - L - R, h = H - T - B; const labels = o.labels || []; const n = labels.length || o.series[0].values.length;
    const stack = !!o.stacked;
    const totals = Array.from({ length: n }, (_, i) => (stack ? o.series.reduce((a, s) => a + (s.values[i] || 0), 0) : Math.max(...o.series.map((s) => s.values[i] || 0))));
    const ticks = o.yTicks || niceTicks(0, Math.max(...totals));
    const max = ticks[ticks.length - 1] || 1;
    const yf = o.yFormat || ((v) => W.fmt.text.compact(v));
    const Y = (v) => T + h - (v / max) * h;
    const grid = ticks.map((v) => `<line class="gl" x1="${L}" x2="${W0 - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${L - 8}" y="${Y(v) + 3.5}" text-anchor="end">${esc(yf(v))}</text>`).join('');
    const bw = w / n; const k = o.series.length; const barW = Math.min(o.barWidth || 14, (bw * 0.7) / (stack ? 1 : k));
    let out = '';
    for (let i = 0; i < n; i++) {
      const cx = L + i * bw + bw / 2; let acc = 0;
      o.series.forEach((s, j) => {
        const v = s.values[i] || 0; const hh = (v / max) * h;
        const x = stack ? cx - barW / 2 : cx - (barW * k + 2 * (k - 1)) / 2 + j * (barW + 2);
        const y = stack ? Y(acc + v) : Y(v); acc += v;
        out += `<rect class="grow" style="animation-delay:${i * 50 + j * 30}ms" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, hh).toFixed(1)}" rx="${stack ? 2 : 3}" fill="${col(s.color)}"><title>${esc(t(s.name || ''))}: ${esc(yf(v))}</title></rect>`;
      });
    }
    out += xTicks(labels, (i) => L + i * bw + bw / 2, H - 6, { edges: false });
    return (o.legend === false ? '' : legend(o.series, 'bar')) + `<div class="chart" role="img" aria-label="${esc(o.label ? t(o.label) : o.series.map((s) => t(s.name || '')).join(', '))}"><svg viewBox="0 0 ${W0} ${H}">${grid}${out}</svg></div>`;
  }

  /* donut with sweep mask */
  function donut(o) {
    const size = o.size || 140, th = o.thickness || 18, r = (size - th) / 2, c = size / 2, mid = id('dm');
    const total = o.segments.reduce((a, s) => a + s.value, 0) || 1; let off = 0;
    const arcs = o.segments.map((s) => { const v = (s.value / total) * 100; const a = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col(s.color)}" stroke-width="${th}" pathLength="100" stroke-dasharray="${Math.max(v - 0.8, 0)} 100" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"><title>${esc(t(s.label))}</title></circle>`; off += v; return a; }).join('');
    const svg = `<div class="chart" style="width:${size}px;height:${size}px;flex:none" role="img" aria-label="${esc(o.segments.map((s) => t(s.label) + ' ' + s.value).join(', '))}"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><mask id="${mid}"><circle class="sweep" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#fff" stroke-width="${th + 4}" pathLength="100" transform="rotate(-90 ${c} ${c})"/></mask></defs><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--card-3)" stroke-width="${th}"/><g mask="url(#${mid})">${arcs}</g></svg>${o.center ? `<div class="donut-c"><div><b>${o.center.value}</b><span>${esc(t(o.center.label || ''))}</span></div></div>` : ''}</div>`;
    if (o.legend === false) return svg;
    const lf = o.legendFormat || ((v) => W.fmt.number(v));
    return `<div style="display:flex;gap:18px;align-items:center;min-width:0">${svg}<div class="leg">${o.segments.map((s) => `<div><i style="background:${col(s.color)}"></i><span>${esc(t(s.label))}</span><b>${lf(s.value, s)}</b></div>`).join('')}</div></div>`;
  }

  function spark(vals, o = {}) {
    const W0 = o.width || 120, H = o.height || 36; const mn = Math.min(...vals), mx = Math.max(...vals);
    const p = vals.map((v, i) => [(i * W0) / (vals.length - 1 || 1), 4 + (H - 8) - ((v - mn) / (mx - mn || 1)) * (H - 8)]);
    const d = smooth(p); const gid = id('sg'); const c = col(o.color || 'lime');
    return `<svg class="${o.cls || 'sp'}" viewBox="0 0 ${W0} ${H}" preserveAspectRatio="none" aria-hidden="true" style="direction:ltr"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".22"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>${o.fill === false ? '' : `<path class="afill" d="${d} L${W0} ${H} L0 ${H}Z" fill="url(#${gid})"/>`}<path class="draw ${glow(o.color || 'lime')}" pathLength="1" d="${d}" fill="none" stroke="${c}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* horizontal bars (ratings, breakdowns) — HTML, logical direction */
  function histogram(items, o = {}) {
    const max = o.max || Math.max(...items.map((x) => x.value)) || 1;
    return `<div class="hist">${items.map((x) => `<div><span class="num" style="min-width:${o.labelWidth || 10}px">${esc(t(x.label))}</span>${o.star ? `<svg class="i" viewBox="0 0 24 24" style="width:12px;height:12px;color:#F2B04A;fill:#F2B04A"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>` : ''}<div class="trk"><i class="gw ${x.tone || ''}" style="width:${Math.max(2, (x.value / max) * 100)}%"></i></div><b class="num">${o.format ? o.format(x.value) : W.fmt.text.number(x.value)}</b></div>`).join('')}</div>`;
  }
  function funnel(items, o = {}) {
    const max = items[0] ? items[0].value : 1;
    return `<div class="hist">${items.map((x, i) => `<div style="margin-block-end:10px"><span style="min-width:${o.labelWidth || 120}px;color:var(--muted)">${esc(t(x.label))}</span><div class="trk" style="height:22px;border-radius:7px"><i class="gw" style="width:${Math.max(3, (x.value / max) * 100)}%;border-radius:7px;opacity:${1 - i * 0.12}"></i></div><b class="num" style="width:70px">${W.fmt.text.number(x.value)}</b></div>`).join('')}</div>`;
  }
  const progress = (v, o = {}) => `<div class="trk" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="${o.max || 100}"${o.label ? ` aria-label="${esc(t(o.label))}"` : ''} style="height:${o.height || 6}px"><i class="gw ${o.tone || ''}" style="width:${Math.min(100, (v / (o.max || 100)) * 100)}%"></i></div>`;
  function ring(v, o = {}) {
    const size = o.size || 64, th = o.thickness || 7, r = (size - th) / 2, c = size / 2; const pct = Math.min(100, (v / (o.max || 100)) * 100);
    return `<div class="chart" style="width:${size}px;height:${size}px;flex:none" role="img" aria-label="${esc(t(o.label || ''))} ${pct.toFixed(0)}%"><svg width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--card-3)" stroke-width="${th}"/><circle class="sweep" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col(o.color || 'lime')}" stroke-width="${th}" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100" style="stroke-dasharray:${pct} 100" transform="rotate(-90 ${c} ${c})"/></svg><div class="donut-c"><b style="font-size:${size / 4.4}px">${o.text || W.fmt.pct(pct, { dec: 0 })}</b></div></div>`;
  }

  W.Charts = { xTicks, fromSeries, label: lbl, area, line, bars, donut, spark, histogram, funnel, progress, ring, legend, smooth, niceTicks, color: col };
})(window);
