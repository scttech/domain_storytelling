// Parses the plain-text story definition into a model. Pure (no DOM) so it can be unit tested.
import { DEFAULT_ICONS, resolveIcon } from '../icons.js';

const NODE_KEYWORDS = new Set(['actor', 'actors', 'system', 'object']);
const PREPOSITIONS = ['to', 'from', 'with', 'for', 'at', 'in', 'into', 'on', 'onto', 'by', 'using', 'via', 'of', 'and'];
const POS_RE = /\s*@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const LABEL_RE = /^(\d+[a-z]?)\s*[.:)]\s+/i;

export function stripComment(line) {
  const t = line.trim();
  if (t.startsWith('//')) return '';
  return line.replace(/\s\/\/.*$/, '').trim();
}

// Returns {name, end} for the declared name that starts at `from` (longest wins), or null.
function nameAt(text, from, names) {
  if (from > 0 && !/[\s"'(]/.test(text[from - 1])) return null;
  for (const name of names) {
    if (!text.startsWith(name, from)) continue;
    const next = text[from + name.length];
    if (next === undefined || /[\s.,;:!?)"']/.test(next)) return { name, end: from + name.length };
  }
  return null;
}

function parseDecl(keyword, rest, lineNo, model) {
  let text = rest.trim();
  let x = null, y = null;
  const pos = text.match(POS_RE);
  if (pos) { x = parseFloat(pos[1]); y = parseFloat(pos[2]); text = text.slice(0, pos.index).trim(); }
  let icon = null;
  const ic = text.match(/\s*\[([^\]]*)\]\s*$/);
  if (ic) {
    icon = resolveIcon(ic[1]);
    if (!icon) model.errors.push({ line: lineNo, message: `Unknown icon "${ic[1].trim()}" (see Help → Icons)` });
    text = text.slice(0, ic.index).trim();
  }
  if (!text) { model.errors.push({ line: lineNo, message: `"${keyword}" needs a name` }); return; }
  if (model.nodeMap.has(text)) { model.errors.push({ line: lineNo, message: `Duplicate name "${text}"` }); return; }
  const node = {
    id: text, name: text, kind: keyword, icon: icon || DEFAULT_ICONS[keyword],
    x: x ?? 0, y: y ?? 0, hasPos: x !== null, line: lineNo,
  };
  model.nodes.push(node);
  model.nodeMap.set(text, node);
}

function parseNote(rest, lineNo, model) {
  let text = rest.trim();
  let target = null;
  const tg = text.match(/\s*->\s*(.+)$/);
  if (tg) { target = tg[1].trim(); text = text.slice(0, tg.index).trim(); }
  let x = null, y = null;
  const pos = text.match(POS_RE);
  if (pos) { x = parseFloat(pos[1]); y = parseFloat(pos[2]); text = text.slice(0, pos.index).trim(); }
  if (!text) { model.errors.push({ line: lineNo, message: 'A note needs some text' }); return; }
  model.notes.push({ id: `note:${lineNo}`, text, target, x: x ?? 0, y: y ?? 0, hasPos: x !== null, line: lineNo });
}

function parseSentence(raw, lineNo, model, names, state) {
  let text = raw;
  let label = null;
  const lm = text.match(LABEL_RE);
  if (lm) { label = lm[1].toLowerCase(); text = text.slice(lm[0].length); }
  text = text.replace(/[.!]\s*$/, '').trim();
  const fail = (message) => model.errors.push({ line: lineNo, message });

  const subject = nameAt(text, 0, names);
  if (!subject) return fail('A sentence must start with a declared actor or object, e.g. "Customer orders Pizza from Cashier"');
  let rest = text.slice(subject.end).trim();

  let activity = null;
  const q = rest.match(/^"([^"]+)"\s*/);
  if (q) { activity = q[1].trim(); rest = rest.slice(q[0].length); }

  let found = null;
  for (let i = 0; i < rest.length && !found; i++) {
    const hit = nameAt(rest, i, names);
    if (hit) found = { ...hit, start: i };
  }
  if (!found) return fail(`No declared actor or object found after "${rest || subject.name}". Declare names first (e.g. "object Pizza").`);
  if (activity === null) activity = rest.slice(0, found.start).trim();
  if (!activity) return fail('Missing activity (the verb) between the two names');

  const after = rest.slice(found.end).trim().replace(/[.!]$/, '').trim();
  let carried = null;
  let target = found.name;
  if (after) {
    const m = after.match(new RegExp(`^(?:${PREPOSITIONS.join('|')})\\s+(.+)$`, 'i'));
    const t2 = m && names.find((n) => n === m[1].trim());
    if (!t2) return fail(`Unexpected text "${after}" — expected "<preposition> <declared name>", e.g. "to Cashier"`);
    carried = found.name;
    target = t2;
  }
  if (carried && model.nodeMap.get(carried).kind !== 'object') {
    return fail(`"${carried}" is carried on the arrow, so it should be an "object", not an ${model.nodeMap.get(carried).kind}`);
  }
  if (!label) {
    label = String(state.auto);
  }
  const n = parseInt(label, 10);
  if (!Number.isNaN(n)) state.auto = n + 1;
  model.steps.push({
    index: model.steps.length, label, source: subject.name, target, carried, activity,
    sentence: `${subject.name} ${activity} ${carried ? `${carried} ${after.split(/\s+/)[0].toLowerCase()} ${target}` : target}`,
    line: lineNo,
  });
}

export function parse(source) {
  const model = {
    title: '', nodes: [], nodeMap: new Map(), notes: [], groups: [], steps: [], assumptions: [], comments: [], errors: [],
    options: { arrowIcons: true },
  };
  const lines = String(source ?? '').split(/\r?\n/);
  const sentences = [];
  const groups = [];

  // `assumptions { - item }` and `comments { - item }` blocks span several lines.
  let block = null;

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = stripComment(rawLine);
    if (!line) return;
    if (block) {
      if (line === '}') { block = null; return; }
      if (/^-\s+/.test(line) || !block.last) {
        block.last = { text: line.replace(/^-\s+/, ''), line: lineNo };
        model[block.kind].push(block.last);
      } else {
        block.last.text += ` ${line}`; // continuation of the previous item
      }
      return;
    }
    const open = line.match(/^(assumptions|comments)\s*\{$/i);
    if (open) { block = { kind: open[1].toLowerCase(), line: lineNo, last: null }; return; }
    const m = line.match(/^(\S+)(?:\s+(.*))?$/);
    const keyword = m[1].toLowerCase();
    const rest = m[2] || '';
    if (keyword === 'title') model.title = rest.trim();
    else if (keyword === 'arrow-icons') {
      const value = rest.trim().toLowerCase();
      if (value === 'on' || value === 'off') model.options.arrowIcons = value === 'on';
      else model.errors.push({ line: lineNo, message: 'Use "arrow-icons on" or "arrow-icons off"' });
    }
    else if (NODE_KEYWORDS.has(keyword)) parseDecl(keyword, rest, lineNo, model);
    else if (keyword === 'note') parseNote(rest, lineNo, model);
    else if (keyword === 'group') groups.push({ rest, lineNo });
    else sentences.push({ line, lineNo });
  });

  if (block) model.errors.push({ line: block.line, message: `This ${block.kind} block is never closed — add a line with just "}"` });

  const names = [...model.nodeMap.keys()].sort((a, b) => b.length - a.length);
  const state = { auto: 1 };
  for (const s of sentences) parseSentence(s.line, s.lineNo, model, names, state);

  // Work objects that only ever ride on arrows have no node of their own.
  const used = new Set(model.steps.flatMap((s) => [s.source, s.target]));
  const carried = new Set(model.steps.map((s) => s.carried).filter(Boolean));
  for (const n of model.nodes) n.hidden = carried.has(n.id) && !used.has(n.id);

  for (const g of groups) {
    const gm = g.rest.match(/^(.*?)\s*:\s*(.+)$/);
    if (!gm || !gm[1]) { model.errors.push({ line: g.lineNo, message: 'Use "group Title: Name, Name"' }); continue; }
    const members = gm[2].split(',').map((s) => s.trim()).filter(Boolean);
    const bad = members.filter((n) => !model.nodeMap.has(n));
    if (bad.length) model.errors.push({ line: g.lineNo, message: `Unknown name in group: ${bad.join(', ')}` });
    model.groups.push({ id: `group:${g.lineNo}`, title: gm[1], members: members.filter((n) => model.nodeMap.has(n)), line: g.lineNo });
  }
  for (const n of model.notes) {
    if (n.target && !model.nodeMap.has(n.target)) {
      model.errors.push({ line: n.line, message: `Note points to unknown name "${n.target}"` });
      n.target = null;
    }
  }
  model.errors.sort((a, b) => a.line - b.line);
  return model;
}
