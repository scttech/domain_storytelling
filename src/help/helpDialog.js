import { renderMarkdown } from './markdown.js';
import { ICON_GROUPS, iconMarkup } from '../icons.js';

let syntaxHtml = null;

async function loadSyntax() {
  if (syntaxHtml) return syntaxHtml;
  try {
    const res = await fetch(new URL('../../docs/syntax.md', import.meta.url));
    if (!res.ok) throw new Error(res.statusText);
    syntaxHtml = renderMarkdown(await res.text());
  } catch (e) {
    return `<p class="error">Could not load docs/syntax.md (${e.message}). Serve the app over http (Live Server) rather than file://.</p>`;
  }
  return syntaxHtml;
}

function iconGrid(onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'icon-browser';
  const filter = document.createElement('input');
  filter.type = 'search';
  filter.placeholder = 'Filter icons…';
  const hint = document.createElement('p');
  hint.className = 'muted';
  hint.textContent = 'Click an icon to copy its name, then use it as [name] in a declaration.';
  wrap.append(filter, hint);
  for (const group of ICON_GROUPS) {
    const h = document.createElement('h4');
    h.textContent = group.title;
    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    for (const name of group.icons) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-cell';
      b.dataset.name = name;
      b.title = name;
      b.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconMarkup(name)}</svg><span>${name}</span>`;
      b.addEventListener('click', () => onPick(name, b));
      grid.append(b);
    }
    wrap.append(h, grid);
  }
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    wrap.querySelectorAll('.icon-cell').forEach((c) => { c.hidden = !!q && !c.dataset.name.includes(q); });
  });
  return wrap;
}

export function createHelpDialog() {
  const dlg = document.createElement('dialog');
  dlg.className = 'help-dialog';
  dlg.innerHTML = `
    <header><h2>Help</h2>
      <nav><button data-tab="syntax" class="active">Syntax</button><button data-tab="icons">Icons</button></nav>
      <button class="close" aria-label="Close">×</button></header>
    <div class="help-body"></div>`;
  document.body.append(dlg);
  const body = dlg.querySelector('.help-body');
  const tabs = dlg.querySelectorAll('nav button');

  async function show(tab) {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'syntax') {
      body.innerHTML = await loadSyntax();
    } else {
      body.replaceChildren(iconGrid(async (name, button) => {
        try { await navigator.clipboard.writeText(name); button.classList.add('copied'); setTimeout(() => button.classList.remove('copied'), 800); } catch { /* clipboard unavailable */ }
      }));
    }
    body.scrollTop = 0;
  }
  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  return { open(tab = 'syntax') { show(tab); if (!dlg.open) dlg.showModal(); } };
}
