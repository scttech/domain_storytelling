// Export helpers: text, SVG (with computed styles inlined so it renders anywhere) and PNG.
// Image exports include the assumptions/comments lists that are currently shown, drawn to the right of the diagram.
import { wrapText } from './render/storyRenderer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PANEL_WIDTH = 320;
const PANEL_GAP = 28;
const LINE_HEIGHT = 17;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function svgEl(name, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

// sections: [{ title, prefix, accent, ink, items: [{ text }] }] -> { group, height }
function buildSections(sections, x, y) {
  const group = svgEl('g', { 'font-family': FONT });
  let cy = y;
  for (const section of sections) {
    group.append(svgEl('text', { x, y: cy + 12, 'font-size': 13, 'font-weight': 700, fill: '#64748b', 'letter-spacing': '0.5' }, section.title.toUpperCase()));
    cy += 24;
    section.items.forEach((item, i) => {
      const lines = wrapText(item.text, 36);
      const h = Math.max(34, lines.length * LINE_HEIGHT + 16);
      group.append(
        svgEl('rect', { x, y: cy, width: PANEL_WIDTH, height: h, rx: 6, fill: '#f8fafc', stroke: '#d5dbe5' }),
        svgEl('rect', { x, y: cy, width: 4, height: h, rx: 2, fill: section.accent }),
        svgEl('text', { x: x + 12, y: cy + 21, 'font-size': 12, 'font-weight': 700, fill: section.ink }, `${section.prefix}${i + 1}`),
      );
      const text = svgEl('text', { x: x + 42, y: cy + 21, 'font-size': 13, fill: '#1e293b' });
      lines.forEach((line, n) => text.append(svgEl('tspan', { x: x + 42, dy: n ? LINE_HEIGHT : 0 }, line)));
      group.append(text);
      cy += h + 6;
    });
    cy += 14;
  }
  return { group, height: cy - y };
}

export const SECTION_STYLES = {
  assumptions: { title: 'Assumptions', prefix: 'A', accent: '#0d9488', ink: '#0f766e' },
  comments: { title: 'Comments', prefix: 'C', accent: '#7c3aed', ink: '#6d28d9' },
};
const STYLE_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity',
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'paint-order', 'display', 'letter-spacing',
];

function inlineStyles(source, clone) {
  const cs = getComputedStyle(source);
  const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
  clone.setAttribute('style', style);
  const a = source.children, b = clone.children;
  for (let i = 0; i < a.length; i++) inlineStyles(a[i], b[i]);
}

// Returns { text, width, height } for a standalone SVG of the diagram plus the given side sections.
export function buildSvg(renderer, sections = []) {
  const b = renderer.bounds();
  const clone = renderer.svg.cloneNode(true);
  inlineStyles(renderer.svg, clone);
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  clone.removeAttribute('id');
  clone.querySelector('.viewport').removeAttribute('transform');

  const extras = sections.filter((sec) => sec.items.length);
  let { x, y, width, height } = b;
  let panel = null;
  if (extras.length) {
    panel = buildSections(extras, b.x + b.width + PANEL_GAP, b.y + 12);
    width += PANEL_GAP + PANEL_WIDTH + 16;
    height = Math.max(height, panel.height + 24);
  }
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  clone.setAttribute('width', Math.round(width));
  clone.setAttribute('height', Math.round(height));
  clone.insertBefore(svgEl('rect', { x, y, width, height, fill: '#ffffff' }), clone.querySelector('.viewport'));
  if (panel) clone.append(panel.group);
  return { text: new XMLSerializer().serializeToString(clone), width, height };
}

export function download(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function slug(title) {
  return (title || 'domain-story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'domain-story';
}

export function exportText(text, title) {
  download(`${slug(title)}.story`, new Blob([text], { type: 'text/plain' }));
}

export function exportSvg(renderer, title, sections) {
  download(`${slug(title)}.svg`, new Blob([buildSvg(renderer, sections).text], { type: 'image/svg+xml' }));
}

export function exportPng(renderer, title, sections, scale = 2) {
  const { text: svgText, width, height } = buildSvg(renderer, sections);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('PNG export failed'));
        download(`${slug(title)}.png`, blob);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not render the SVG to PNG')); };
    img.src = url;
  });
}
