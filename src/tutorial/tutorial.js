// Tutorial controller: a picker dialog plus a step card. Entering a step loads its story text into the editor;
// leaving the tutorial restores whatever the user had before.
import { TUTORIALS } from './tutorials.js';

export function createTutorial({ getText, setText, getModel }) {
  const picker = document.createElement('dialog');
  picker.className = 'tutorial-picker';
  picker.innerHTML = '<header><h2>Tutorials</h2><button class="close" aria-label="Close">×</button></header><div class="body"></div>';
  document.body.append(picker);

  const card = document.createElement('aside');
  card.className = 'tutorial-card';
  card.hidden = true;
  document.body.append(card);

  let current = null; // { tutorial, index }
  let backup = null;
  let highlighted = [];

  function clearHighlight() {
    highlighted.forEach((el) => el.classList.remove('tutorial-highlight'));
    highlighted = [];
  }

  function renderCard() {
    const { tutorial, index } = current;
    const step = tutorial.steps[index];
    const last = index === tutorial.steps.length - 1;
    card.innerHTML = `
      <div class="tc-head"><span class="tc-progress">${tutorial.title} · step ${index + 1} of ${tutorial.steps.length}</span><button class="tc-exit" title="Exit tutorial">×</button></div>
      <h3>${step.title}</h3>
      <div class="tc-body">${step.body}</div>
      ${step.task ? `<div class="tc-task"><span class="tc-check" aria-hidden="true"></span><div><strong>Your turn:</strong> ${step.task}</div></div>` : ''}
      <div class="tc-nav"><button class="tc-back" ${index === 0 ? 'disabled' : ''}>Back</button><button class="tc-next primary">${last ? 'Finish' : 'Next'}</button></div>`;
    card.querySelector('.tc-exit').onclick = stop;
    card.querySelector('.tc-back').onclick = () => go(index - 1);
    card.querySelector('.tc-next').onclick = () => (last ? stop() : go(index + 1));
    clearHighlight();
    if (step.highlight) {
      highlighted = [...document.querySelectorAll(step.highlight)];
      highlighted.forEach((el) => el.classList.add('tutorial-highlight'));
    }
    refresh();
  }

  function go(index) {
    current.index = index;
    setText(current.tutorial.steps[index].text, { fit: true });
    renderCard();
  }

  function start(id) {
    const tutorial = TUTORIALS.find((t) => t.id === id);
    if (!tutorial) return;
    if (!current) backup = getText();
    current = { tutorial, index: 0 };
    picker.close();
    card.hidden = false;
    document.body.classList.add('tutorial-active');
    go(0);
  }

  function stop() {
    if (!current) return;
    current = null;
    card.hidden = true;
    document.body.classList.remove('tutorial-active');
    clearHighlight();
    if (backup !== null) setText(backup, { fit: true });
    backup = null;
  }

  // Call after every model change so "Your turn" tasks can tick themselves off.
  function refresh() {
    if (!current) return;
    const step = current.tutorial.steps[current.index];
    const check = card.querySelector('.tc-task');
    if (check && step.done) check.classList.toggle('done', !!step.done(getModel()));
  }

  function open() {
    const body = picker.querySelector('.body');
    body.innerHTML = TUTORIALS.map((t) => `<button class="tutorial-item" data-id="${t.id}"><strong>${t.title}</strong><span>${t.summary}</span><em>${t.steps.length} steps</em></button>`).join('');
    body.querySelectorAll('button').forEach((b) => { b.onclick = () => start(b.dataset.id); });
    if (!picker.open) picker.showModal();
  }

  picker.querySelector('.close').onclick = () => picker.close();
  picker.addEventListener('click', (e) => { if (e.target === picker) picker.close(); });

  return { open, start, stop, refresh, get active() { return !!current; } };
}
