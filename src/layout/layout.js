// Initial placement for anything that has no "@ x,y" yet: columns by story order, left to right.
export const COL_W = 300;
export const ROW_H = 160;
export const X0 = 110;
export const Y0 = 130;

export function autoLayout(model) {
  const depth = new Map();
  for (const s of model.steps) {
    if (!depth.has(s.source)) depth.set(s.source, 0);
    if (!depth.has(s.target)) depth.set(s.target, depth.get(s.source) + 1);
  }
  for (const n of model.nodes) if (!depth.has(n.id)) depth.set(n.id, 0);
  const visible = model.nodes.filter((n) => !n.hidden);

  const columns = new Map();
  for (const n of visible) {
    if (n.hasPos) continue;
    const d = depth.get(n.id);
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d).push(n);
  }
  const maxRows = Math.max(1, ...[...columns.values()].map((c) => c.length));
  const mid = Y0 + (ROW_H * (maxRows - 1)) / 2;
  for (const [d, nodes] of columns) {
    nodes.forEach((n, i) => {
      n.x = X0 + d * COL_W;
      // Stagger alternate columns so arrows that skip a column do not run through the nodes in between.
      n.y = mid + (i - (nodes.length - 1) / 2) * ROW_H + (d % 2 ? 40 : -40);
    });
  }
  let free = 0;
  for (const note of model.notes) {
    if (note.hasPos) continue;
    const t = note.target && model.nodeMap.get(note.target);
    if (t) { note.x = t.x + 120; note.y = t.y - 95; } else { note.x = X0 + free * 190; note.y = 20 + 40; free++; }
  }
  return model;
}
