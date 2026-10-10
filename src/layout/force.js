// Optional live force-directed layout (d3-force). Drag still works: a dragged node is pinned until release.
export function createForce({ onTick, onEnd }) {
  let sim = null;
  let noteOffsets = [];

  function build(model) {
    if (sim) sim.stop();
    noteOffsets = model.notes
      .filter((n) => n.target && model.nodeMap.get(n.target))
      .map((n) => { const t = model.nodeMap.get(n.target); return { note: n, t, dx: n.x - t.x, dy: n.y - t.y }; });
    const links = model.steps.filter((s) => s.source !== s.target)
      .map((s) => ({ source: model.nodeMap.get(s.source), target: model.nodeMap.get(s.target) }));
    sim = d3.forceSimulation(model.nodes.filter((n) => !n.hidden))
      .force('link', d3.forceLink(links).distance(230).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-1100))
      .force('collide', d3.forceCollide(78))
      .force('x', d3.forceX().strength(0.02))
      .force('y', d3.forceY().strength(0.02))
      .on('tick', () => {
        for (const o of noteOffsets) { o.note.x = o.t.x + o.dx; o.note.y = o.t.y + o.dy; }
        onTick();
      })
      .on('end', () => onEnd());
    return sim;
  }

  return {
    start(model, alpha = 0.9) {
      // Keep the picture roughly where it is: pull toward the current centroid instead of the origin.
      build(model);
      const cx = d3.mean(model.nodes.filter((n) => !n.hidden), (n) => n.x) || 0;
      const cy = d3.mean(model.nodes.filter((n) => !n.hidden), (n) => n.y) || 0;
      sim.force('x', d3.forceX(cx).strength(0.02)).force('y', d3.forceY(cy).strength(0.02));
      sim.alpha(alpha).restart();
    },
    stop() { if (sim) { sim.stop(); sim = null; } },
    get active() { return !!sim; },
    reheat(alpha = 0.4) { if (sim) sim.alphaTarget(0).alpha(alpha).restart(); },
    drag(node, x, y) { node.fx = x; node.fy = y; if (sim) sim.alphaTarget(0.3).restart(); },
    release(node) { node.fx = null; node.fy = null; if (sim) sim.alphaTarget(0); },
  };
}
