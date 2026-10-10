// Text mutations: the editor text is the source of truth, so dragging rewrites the "@ x,y" part of a line.
const POS_RE = /\s*@\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/;

export function withPosition(line, x, y) {
  const pos = ` @ ${Math.round(x)},${Math.round(y)}`;
  let comment = '';
  let body = line;
  const c = body.match(/\s\/\/.*$/);
  if (c) { comment = c[0]; body = body.slice(0, c.index); }
  body = body.replace(/\s+$/, '');
  const arrow = /^\s*note\s/i.test(body) ? body.match(/\s*->\s*[^@]*$/) : null;
  let tail = '';
  if (arrow) { tail = arrow[0]; body = body.slice(0, arrow.index); }
  body = body.replace(POS_RE, '');
  // Icon brackets and names come first; "@ x,y" always goes last (before a note's "-> target").
  return `${body}${pos}${tail.startsWith(' ') || !tail ? tail : ` ${tail}`}${comment}`;
}

// updates: [{ line (1-based), x, y }]
export function applyPositions(text, updates) {
  const lines = text.split(/\r?\n/);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  for (const u of updates) {
    const i = u.line - 1;
    if (i >= 0 && i < lines.length) lines[i] = withPosition(lines[i], u.x, u.y);
  }
  return lines.join(eol);
}

export function removePositions(text) {
  return text.split(/\r?\n/).map((l) => {
    if (!/^\s*(actor|actors|system|object|note)\s/i.test(l)) return l;
    return l.replace(POS_RE, '');
  }).join(text.includes('\r\n') ? '\r\n' : '\n');
}
