// Share links: the story text is deflated (when the browser supports it) and stored in the URL hash.
const PREFIX = '#story=';

const toB64Url = (bytes) => {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeStory(text) {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'function') {
    try { return 'z.' + toB64Url(await pipe(raw, new CompressionStream('deflate-raw'))); } catch { /* fall through */ }
  }
  return 'p.' + toB64Url(raw);
}

export async function decodeStory(code) {
  const [kind, body] = [code.slice(0, 2), code.slice(2)];
  const bytes = fromB64Url(body);
  if (kind === 'z.') return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  if (kind === 'p.') return new TextDecoder().decode(bytes);
  throw new Error('Unrecognized share link');
}

export async function shareUrl(text) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${PREFIX}${await encodeStory(text)}`;
}

export async function readSharedStory(hash = window.location.hash) {
  if (!hash.startsWith(PREFIX)) return null;
  try { return await decodeStory(hash.slice(PREFIX.length)); } catch { return null; }
}
