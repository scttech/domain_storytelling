import { parse } from './parser/parse.js';
import { autoLayout } from './layout/layout.js';
import { createForce } from './layout/force.js';
import { applyPositions, removePositions } from './model/edit.js';
import { createRenderer } from './render/storyRenderer.js';
import { exportPng, exportSvg, exportText, SECTION_STYLES } from './export.js';
import { readSharedStory, shareUrl } from './share.js';
import { SAMPLES, DEFAULT_SAMPLE } from './samples.js';
import { createHelpDialog } from './help/helpDialog.js';
import { createTutorial } from './tutorial/tutorial.js';

const STORAGE_KEY = 'domainStory.text';
const $ = (id) => document.getElementById(id);
const editor = $('editor');

let model = parse('');
let currentText = '';
const history = { stack: [], index: -1 };
const UI_KEY = 'domainStory.ui';
const side = { assumptions: true, comments: true };
let parseTimer = null;
let historyTimer = null;

// ---- persistence (localStorage can be unavailable) ----
const store = {
  get() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ } },
};

try { Object.assign(side, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch { /* defaults */ }

// ---- helpers ----
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}

function pushHistory(text) {
  if (history.stack[history.index] === text) return;
  history.stack = history.stack.slice(0, history.index + 1);
  history.stack.push(text);
  if (history.stack.length > 200) history.stack.shift();
  history.index = history.stack.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $('btn-undo').disabled = history.index <= 0;
  $('btn-redo').disabled = history.index >= history.stack.length - 1;
}

function renderErrors() {
  const ul = $('errors');
  ul.replaceChildren(...model.errors.map((e) => {
    const li = document.createElement('li');
    li.innerHTML = `<button><span class="ln">Line ${e.line}</span> ${e.message.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</button>`;
    li.firstChild.onclick = () => selectLine(e.line);
    return li;
  }));
  ul.classList.toggle('has-errors', model.errors.length > 0);
  editor.classList.toggle('invalid', model.errors.length > 0);
}

// Assumptions and comments live in a side panel; each list can be shown or hidden.
function renderSide() {
  let any = false;
  for (const kind of ['assumptions', 'comments']) {
    const items = model[kind];
    const button = $(`btn-${kind}`);
    const section = $(`sec-${kind}`);
    const visible = items.length > 0 && side[kind];
    button.querySelector('.count').textContent = items.length;
    button.disabled = items.length === 0;
    button.setAttribute('aria-pressed', String(side[kind]));
    section.hidden = !visible;
    any ||= visible;
    section.querySelector('ol').replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      li.title = `Line ${item.line} — click to find it in the editor`;
      li.onclick = () => selectLine(item.line);
      return li;
    }));
  }
  $('side-panel').hidden = !any;
}

for (const kind of ['assumptions', 'comments']) {
  $(`btn-${kind}`).onclick = () => {
    side[kind] = !side[kind];
    try { localStorage.setItem(UI_KEY, JSON.stringify(side)); } catch { /* ignore */ }
    const wasHidden = $('side-panel').hidden;
    renderSide();
    if (wasHidden !== $('side-panel').hidden) setTimeout(() => renderer.fit(false), 50); // canvas width changed
  };
}

// The lists that are currently shown in the side panel are also drawn into SVG/PNG exports.
function exportSections() {
  return ['assumptions', 'comments']
    .filter((kind) => side[kind] && model[kind].length)
    .map((kind) => ({ ...SECTION_STYLES[kind], items: model[kind] }));
}

function selectLine(lineNo) {
  const lines = editor.value.split('\n');
  const start = lines.slice(0, lineNo - 1).reduce((n, l) => n + l.length + 1, 0);
  editor.focus();
  editor.setSelectionRange(start, start + (lines[lineNo - 1] || '').length);
}

// ---- rendering ----
const force = createForce({
  onTick: () => renderer.updateGeometry(),
  onEnd: () => persistPositions(),
});

const renderer = createRenderer($('canvas'), {
  onDragStart: (d) => { if (force.active && d.kind) force.drag(d, d.x, d.y); },
  onDrag: (d, x, y) => { if (force.active && d.kind) force.drag(d, x, y); },
  onDragEnd: (d) => {
    if (force.active && d.kind) force.release(d);
    else persistPositions();
  },
});

// Writes every node and note position into the text so the whole layout is saved, not just the dragged item.
// The model already holds these positions, so the text is updated without re-parsing or re-rendering.
function persistPositions() {
  const all = [...model.nodes.filter((n) => !n.hidden), ...model.notes];
  const next = applyPositions(currentText, all.map((n) => ({ line: n.line, x: n.x, y: n.y })));
  all.forEach((n) => { n.hasPos = true; });
  if (next === currentText) return;
  currentText = next;
  editor.value = next;
  if (!tutorial.active) store.set(next);
  pushHistory(next);
  tutorial.refresh();
}

function setText(text, { fit = false, fromEditor = false, history: record = true } = {}) {
  currentText = text;
  if (!fromEditor) editor.value = text;
  model = parse(text);
  autoLayout(model);
  renderer.render(model);
  renderErrors();
  renderSide();
  if (fit) renderer.fit(false);
  $('story-title').textContent = model.title;
  document.title = model.title ? `${model.title} – Domain Storytelling` : 'Domain Storytelling';
  if (force.active) force.start(model, 0.3);
  if (play.on) syncPlay();
  if (!tutorial.active) store.set(text);
  if (record) {
    if (fromEditor) { clearTimeout(historyTimer); historyTimer = setTimeout(() => pushHistory(text), 500); } else pushHistory(text);
  }
  tutorial.refresh();
}

// ---- play-through ----
const play = { on: false, index: 0, timer: null };

function syncPlay() {
  const steps = model.steps;
  if (!steps.length) { exitPlay(); return; }
  play.index = Math.max(0, Math.min(play.index, steps.length - 1));
  const s = steps[play.index];
  renderer.setPlay(play.index);
  $('play-count').textContent = `Step ${s.label}  (${play.index + 1}/${steps.length})`;
  $('play-sentence').textContent = s.sentence;
  $('play-prev').disabled = play.index === 0;
  $('play-next').disabled = play.index === steps.length - 1;
}

function startPlay() {
  if (!model.steps.length) { toast('Add a sentence to play the story.'); return; }
  play.on = true;
  play.index = 0;
  $('playbar').hidden = false;
  $('btn-play').classList.add('active');
  syncPlay();
}

function stopAuto() { clearInterval(play.timer); play.timer = null; $('play-auto').textContent = '▶'; }
function exitPlay() {
  stopAuto();
  play.on = false;
  $('playbar').hidden = true;
  $('btn-play').classList.remove('active');
  renderer.setPlay(null);
}
function stepPlay(delta) { play.index += delta; syncPlay(); }

$('btn-play').onclick = () => (play.on ? exitPlay() : startPlay());
$('play-exit').onclick = exitPlay;
$('play-prev').onclick = () => { stopAuto(); stepPlay(-1); };
$('play-next').onclick = () => { stopAuto(); stepPlay(1); };
$('play-auto').onclick = () => {
  if (play.timer) { stopAuto(); return; }
  if (play.index >= model.steps.length - 1) { play.index = 0; syncPlay(); }
  $('play-auto').textContent = '❚❚';
  play.timer = setInterval(() => {
    if (play.index >= model.steps.length - 1) { stopAuto(); return; }
    stepPlay(1);
  }, 1600);
};

// ---- toolbar ----
$('btn-fit').onclick = () => renderer.fit();
$('btn-layout').onclick = () => {
  if (force.active) stopForce();
  setText(removePositions(currentText), { fit: true });
};
function stopForce() {
  force.stop();
  $('btn-force').setAttribute('aria-pressed', 'false');
  $('btn-force').classList.remove('active');
}
$('btn-force').onclick = (e) => {
  const on = !force.active;
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.classList.toggle('active', on);
  if (on) force.start(model, 0.9);
  else { force.stop(); persistPositions(); }
};
$('btn-undo').onclick = undo;
$('btn-redo').onclick = redo;

function undo() {
  if (history.index <= 0) return;
  clearTimeout(historyTimer);
  history.index -= 1;
  setText(history.stack[history.index], { history: false });
  updateHistoryButtons();
}
function redo() {
  if (history.index >= history.stack.length - 1) return;
  history.index += 1;
  setText(history.stack[history.index], { history: false });
  updateHistoryButtons();
}

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? redo : undo)(); return; }
  if (mod && !e.altKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (!play.on || e.target === editor) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); stopAuto(); stepPlay(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); stepPlay(-1); }
  else if (e.key === 'Escape') exitPlay();
});

$('btn-share').onclick = async () => {
  try {
    const url = await shareUrl(currentText);
    try { await navigator.clipboard.writeText(url); toast(`Link copied (${url.length} characters)`); } catch { window.prompt('Copy this link:', url); }
  } catch (e) { toast(`Could not create link: ${e.message}`); }
};

document.querySelectorAll('[data-export]').forEach((b) => {
  b.onclick = async () => {
    $('export-menu').open = false;
    try {
      if (b.dataset.export === 'text') exportText(currentText, model.title);
      else if (b.dataset.export === 'svg') exportSvg(renderer, model.title, exportSections());
      else await exportPng(renderer, model.title, exportSections());
    } catch (e) { toast(e.message); }
  };
});
document.addEventListener('click', (e) => { if (!e.target.closest('#export-menu')) $('export-menu').open = false; });

const samplesSelect = $('samples');
for (const s of SAMPLES) samplesSelect.append(new Option(s.name, s.id));
samplesSelect.onchange = () => {
  const s = SAMPLES.find((x) => x.id === samplesSelect.value);
  samplesSelect.value = '';
  if (!s) return;
  if (tutorial.active) tutorial.stop();
  if (force.active) stopForce();
  setText(s.text, { fit: true });
};

const help = createHelpDialog();
$('btn-help').onclick = () => help.open('syntax');

const tutorial = createTutorial({
  getText: () => currentText,
  getModel: () => model,
  setText: (text, opts) => setText(text, opts),
});
$('btn-tutorial').onclick = () => tutorial.open();

function setEditorVisible(visible) {
  document.body.classList.toggle('editor-hidden', !visible);
  $('btn-expand').hidden = visible;
  setTimeout(() => renderer.fit(false), 50);
}
$('btn-collapse').onclick = () => setEditorVisible(false);
$('btn-expand').onclick = () => setEditorVisible(true);

editor.addEventListener('input', () => {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(() => setText(editor.value, { fromEditor: true }), 150);
});
editor.addEventListener('keydown', (e) => {
  // Keep Tab usable for indenting inside the editor.
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
  }
});

// ---- startup: shared link → last session → default sample ----
(async function init() {
  const shared = await readSharedStory();
  const initial = shared ?? store.get() ?? DEFAULT_SAMPLE.text;
  setText(initial, { fit: true });
  if (shared) toast('Loaded story from shared link');
  window.addEventListener('hashchange', async () => {
    const text = await readSharedStory();
    if (text) setText(text, { fit: true });
  });
})();
