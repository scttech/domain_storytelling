// D3 renderer. Dragging mutates the model in place; the caller decides how to persist positions to text.
import { iconMarkup } from '../icons.js';

export const R = 30; // node radius used for arrow clipping
const NOTE_CHARS = 22;
const LABEL_GAP = 40; // distance from an arrow to its carried-object icon

export function wrapText(text, max = NOTE_CHARS) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// A carried work object gets an icon beside its arrow unless the story says `arrow-icons off`.
const showsIcon = (step, model) => !!step.carried && model.options.arrowIcons;

const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

// Geometry of one arrow: a quadratic curve whose bend separates parallel/opposite arrows between the same pair.
export function edgeGeometry(step, model, siblings) {
  const s = model.nodeMap.get(step.source);
  const t = model.nodeMap.get(step.target);
  if (!s || !t) return null;
  if (s === t) {
    const path = `M${s.x - 14},${s.y - R} C${s.x - 70},${s.y - R - 90} ${s.x + 70},${s.y - R - 90} ${s.x + 14},${s.y - R}`;
    const mid = [s.x, s.y - R - 68];
    return { path, mid, label: showsIcon(step, model) ? [mid[0], mid[1] - LABEL_GAP] : mid, start: [s.x - 40, s.y - R - 42] };
  }
  const [ux, uy] = norm(t.x - s.x, t.y - s.y);
  const nx = -uy, ny = ux;
  const key = [step.source, step.target].sort().join('\u0000');
  const group = siblings.get(key);
  const i = group.indexOf(step.index);
  const spread = (i - (group.length - 1) / 2) * 84 * (step.source < step.target ? 1 : -1);
  const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
  const cx = mx + nx * spread * 2, cy = my + ny * spread * 2;
  const [d1x, d1y] = norm(cx - s.x, cy - s.y);
  const [d2x, d2y] = norm(t.x - cx, t.y - cy);
  const sx = s.x + d1x * (R + 4), sy = s.y + d1y * (R + 4);
  const ex = t.x - d2x * (R + 8), ey = t.y - d2y * (R + 8);
  const at = (p) => [(1 - p) ** 2 * sx + 2 * (1 - p) * p * cx + p * p * ex, (1 - p) ** 2 * sy + 2 * (1 - p) * p * cy + p * p * ey];
  const len = Math.hypot(ex - sx, ey - sy);
  const mid = at(0.5);
  // A carried work object sits beside the arrow (above it, or to the right of a vertical arrow), never on top of it.
  let [lx, ly] = norm(ey - sy, sx - ex);
  if (Math.abs(ly) < 0.3 ? lx < 0 : ly > 0) { lx = -lx; ly = -ly; }
  return {
    path: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`,
    mid,
    label: showsIcon(step, model) ? [mid[0] + lx * LABEL_GAP, mid[1] + ly * LABEL_GAP] : mid,
    start: at(Math.min(0.4, Math.max(0.14, 34 / Math.max(len, 1)))),
  };
}

function siblingMap(model) {
  const map = new Map();
  for (const s of model.steps) {
    const key = [s.source, s.target].sort().join('\u0000');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s.index);
  }
  return map;
}

function drawIcon(sel, name, size) {
  const k = size / 24;
  sel.html(`<g class="icon-art" transform="translate(${-size / 2},${-size / 2}) scale(${k})">${iconMarkup(name)}</g>`);
}

export function createRenderer(svgNode, hooks = {}) {
  const svg = d3.select(svgNode);
  svg.selectAll('*').remove();
  svg.classed('story-svg', true);
  svg.append('defs').html(
    '<marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#334155"/></marker>' +
    '<marker id="arrowhead-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="#d9480f"/></marker>');
  const viewport = svg.append('g').attr('class', 'viewport');
  const gGroups = viewport.append('g').attr('class', 'groups');
  const gLinks = viewport.append('g').attr('class', 'note-links');
  const gEdges = viewport.append('g').attr('class', 'edges');
  const gNodes = viewport.append('g').attr('class', 'nodes');
  const gNotes = viewport.append('g').attr('class', 'notes');

  let model = null;
  let playStep = null;
  let transform = d3.zoomIdentity;

  const zoom = d3.zoom().scaleExtent([0.15, 3]).on('zoom', (e) => {
    transform = e.transform;
    viewport.attr('transform', transform);
  });
  svg.call(zoom).on('dblclick.zoom', null);

  const dragBehavior = () => d3.drag()
    .container(viewport.node())
    .on('start', function (e, d) { d3.select(this).classed('dragging', true); hooks.onDragStart?.(d); })
    .on('drag', function (e, d) {
      d.x = e.x; d.y = e.y;
      hooks.onDrag?.(d, e.x, e.y);
      updateGeometry();
    })
    .on('end', function (e, d) { d3.select(this).classed('dragging', false); hooks.onDragEnd?.(d); });

  function render(newModel) {
    model = newModel;

    gGroups.selectAll('g.group').data(model.groups, (d) => d.id).join(
      (enter) => {
        const g = enter.append('g').attr('class', 'group');
        g.append('rect').attr('rx', 18);
        g.append('text').attr('class', 'group-title');
        return g;
      },
    ).select('text').text((d) => d.title);

    gLinks.selectAll('line.note-link').data(model.notes.filter((n) => n.target), (d) => d.id)
      .join('line').attr('class', 'note-link');

    const edges = gEdges.selectAll('g.edge').data(model.steps, (d) => d.index).join((enter) => {
      const g = enter.append('g').attr('class', 'edge');
      g.append('path').attr('class', 'edge-path').attr('marker-end', 'url(#arrowhead)');
      const badge = g.append('g').attr('class', 'badge');
      badge.append('circle').attr('r', 12);
      badge.append('text').attr('dy', '0.35em');
      const lab = g.append('g').attr('class', 'elabel');
      lab.append('g').attr('class', 'carried-icon');
      lab.append('text').attr('class', 'activity halo');
      lab.append('text').attr('class', 'carried-name halo');
      return g;
    });
    edges.select('.badge text').text((d) => d.label);
    // With icons: verb above the icon, object name below it. Without: one line, "verb Object", on the arrow.
    edges.select('text.activity').each(function (d) {
      const t = d3.select(this).text(null);
      t.append('tspan').text(d.activity);
      if (d.carried && !showsIcon(d, model)) t.append('tspan').attr('class', 'inline-object').text(` ${d.carried}`);
    });
    edges.select('text.carried-name').text((d) => (showsIcon(d, model) ? d.carried : ''));
    edges.select('.elabel').classed('has-carried', (d) => showsIcon(d, model));
    edges.select('.carried-icon').each(function (d) {
      const sel = d3.select(this);
      if (showsIcon(d, model)) drawIcon(sel, model.nodeMap.get(d.carried)?.icon, 30); else sel.html('');
    });

    const nodes = gNodes.selectAll('g.node').data(model.nodes.filter((n) => !n.hidden), (d) => d.id).join((enter) => {
      const g = enter.append('g').attr('class', 'node').call(dragBehavior());
      g.append('circle').attr('r', R + 4).attr('class', 'node-bg');
      g.append('g').attr('class', 'node-icon');
      g.append('text').attr('class', 'node-label halo').attr('y', R + 22);
      return g;
    });
    nodes.attr('class', (d) => `node ${d.kind}`);
    nodes.select('.node-icon').each(function (d) { drawIcon(d3.select(this), d.icon, 38); });
    nodes.select('text.node-label').text((d) => d.name);

    gNotes.selectAll('g.note').data(model.notes, (d) => d.id).join((enter) => {
      const g = enter.append('g').attr('class', 'note').call(dragBehavior());
      g.append('rect').attr('rx', 3);
      g.append('text');
      return g;
    }).each(function (d) {
      const lines = wrapText(d.text);
      const w = Math.max(...lines.map((l) => l.length)) * 7.4 + 20;
      const h = lines.length * 17 + 16;
      d._w = w; d._h = h;
      const g = d3.select(this);
      g.select('rect').attr('x', -w / 2).attr('y', -h / 2).attr('width', w).attr('height', h);
      g.select('text').attr('y', -h / 2 + 22).selectAll('tspan').data(lines).join('tspan')
        .attr('x', -w / 2 + 10).attr('dy', (l, i) => (i ? 17 : 0)).text((l) => l);
    });

    updateGeometry();
    applyPlay();
  }

  function updateGeometry() {
    if (!model) return;
    const siblings = siblingMap(model);
    gEdges.selectAll('g.edge').each(function (d) {
      const geo = edgeGeometry(d, model, siblings);
      const g = d3.select(this);
      if (!geo) { g.style('display', 'none'); return; }
      g.style('display', null);
      g.select('path').attr('d', geo.path);
      g.select('.badge').attr('transform', `translate(${geo.start[0]},${geo.start[1]})`);
      const lab = g.select('.elabel').attr('transform', `translate(${geo.label[0]},${geo.label[1]})`);
      if (showsIcon(d, model)) {
        lab.select('.carried-icon').attr('transform', 'translate(0,0)');
        lab.select('text.activity').attr('y', -26);
        lab.select('text.carried-name').attr('y', 32);
      } else {
        lab.select('text.activity').attr('y', 0).attr('dy', '0.35em');
      }
    });
    gNodes.selectAll('g.node').attr('transform', (d) => `translate(${d.x},${d.y})`);
    gNotes.selectAll('g.note').attr('transform', (d) => `translate(${d.x},${d.y})`);
    gLinks.selectAll('line.note-link').each(function (d) {
      const t = model.nodeMap.get(d.target);
      d3.select(this).attr('x1', d.x).attr('y1', d.y).attr('x2', t.x).attr('y2', t.y);
    });
    gGroups.selectAll('g.group').each(function (d) {
      const ms = d.members.map((n) => model.nodeMap.get(n)).filter(Boolean);
      const g = d3.select(this);
      if (!ms.length) { g.style('display', 'none'); return; }
      g.style('display', null);
      const x0 = d3.min(ms, (n) => n.x) - R - 44, x1 = d3.max(ms, (n) => n.x) + R + 44;
      const y0 = d3.min(ms, (n) => n.y) - R - 40, y1 = d3.max(ms, (n) => n.y) + R + 56;
      g.select('rect').attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', y1 - y0);
      g.select('text').attr('x', x0 + 16).attr('y', y0 + 22);
    });
  }

  // Play-through: show steps up to and including `n` (0-based); null shows everything.
  function setPlay(n) { playStep = n; applyPlay(); }
  function applyPlay() {
    const active = playStep !== null;
    svg.classed('playing', active);
    const seen = new Set();
    gEdges.selectAll('g.edge')
      .classed('future', (d) => active && d.index > playStep)
      .classed('current', (d) => active && d.index === playStep)
      .each(function (d) {
        if (active && d.index <= playStep) { seen.add(d.source); seen.add(d.target); }
        d3.select(this).select('path').attr('marker-end', active && d.index === playStep ? 'url(#arrowhead-active)' : 'url(#arrowhead)');
      });
    gNodes.selectAll('g.node').classed('dim', (d) => active && !seen.has(d.id));
  }

  function bounds() {
    if (!model) return null;
    const pts = [];
    for (const n of model.nodes.filter((m) => !m.hidden)) pts.push([n.x - R - 50, n.y - R - 50], [n.x + R + 50, n.y + R + 60]);
    for (const n of model.notes) pts.push([n.x - (n._w || 100) / 2 - 10, n.y - (n._h || 40) / 2 - 10], [n.x + (n._w || 100) / 2 + 10, n.y + (n._h || 40) / 2 + 10]);
    if (!pts.length) return { x: 0, y: 0, width: 400, height: 300 };
    const x0 = d3.min(pts, (p) => p[0]) - 20, x1 = d3.max(pts, (p) => p[0]) + 20;
    const y0 = d3.min(pts, (p) => p[1]) - 40, y1 = d3.max(pts, (p) => p[1]) + 20;
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }

  function fit(animate = true) {
    const b = bounds();
    if (!b) return;
    const w = svgNode.clientWidth || 800, h = svgNode.clientHeight || 600;
    const k = Math.min(1.4, Math.min(w / b.width, h / b.height));
    const tx = (w - b.width * k) / 2 - b.x * k;
    const ty = (h - b.height * k) / 2 - b.y * k;
    const t = d3.zoomIdentity.translate(tx, ty).scale(k);
    (animate ? svg.transition().duration(350) : svg).call(zoom.transform, t);
  }

  return { render, updateGeometry, setPlay, fit, bounds, svg: svgNode, get transform() { return transform; } };
}
