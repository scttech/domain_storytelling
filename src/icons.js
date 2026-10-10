// Icon registry. The raw artwork is vendored in vendor/tabler-icons.js (MIT).
// Users pick icons by name only, so shared URLs stay small.
import { TABLER } from '../vendor/tabler-icons.js';

export const ICON_GROUPS = [
  { title: 'People', icons: ['user', 'users', 'user-circle', 'user-cog', 'user-check', 'user-shield', 'chef-hat', 'stethoscope', 'headset', 'robot'] },
  { title: 'Organizations & places', icons: ['building', 'building-store', 'building-bank', 'home', 'school', 'map-pin', 'world', 'truck', 'car', 'bike', 'bus', 'ship', 'plane'] },
  { title: 'Systems', icons: ['device-desktop', 'device-laptop', 'device-mobile', 'server', 'database', 'cloud', 'cpu', 'code', 'api', 'wifi', 'printer', 'brain', 'settings', 'tool', 'tools-kitchen-2'] },
  { title: 'Documents & data', icons: ['file', 'file-text', 'file-invoice', 'file-check', 'receipt', 'clipboard', 'clipboard-list', 'forms', 'list-details', 'report', 'folder', 'archive', 'book', 'certificate', 'signature', 'writing-sign', 'barcode', 'qrcode', 'id', 'ticket'] },
  { title: 'Messages', icons: ['mail', 'mail-opened', 'mailbox', 'inbox', 'send', 'message', 'phone', 'bell', 'photo', 'video', 'microphone', 'camera', 'link', 'share'] },
  { title: 'Things & money', icons: ['package', 'box', 'basket', 'shopping-cart', 'gift', 'credit-card', 'credit-card-pay', 'cash', 'pizza', 'coffee', 'pill', 'vaccine', 'first-aid-kit', 'medical-cross', 'microscope', 'heart', 'bulb', 'key', 'lock', 'shield'] },
  { title: 'Misc', icons: ['calendar', 'clock', 'chart-bar', 'scale', 'gavel', 'flag', 'star', 'check', 'x', 'search', 'eye', 'hand-stop', 'paperclip'] },
];

// Friendlier names that map onto vendored icons.
const ALIASES = {
  person: 'user', people: 'users', customer: 'user', computer: 'device-desktop', laptop: 'device-laptop',
  phone: 'device-mobile', mobile: 'device-mobile', document: 'file-text', invoice: 'file-invoice',
  order: 'clipboard-list', money: 'cash', email: 'mail', store: 'building-store', bank: 'building-bank',
  warehouse: 'building', doctor: 'stethoscope', cook: 'chef-hat', chef: 'chef-hat',
};
delete ALIASES.phone; // "phone" is a real icon (a handset); "mobile" is the phone device

export const DEFAULT_ICONS = { actor: 'user', actors: 'users', system: 'device-desktop', object: 'file-text' };

export function resolveIcon(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  if (TABLER[key]) return key;
  if (ALIASES[key] && TABLER[ALIASES[key]]) return ALIASES[key];
  return null;
}

export function iconMarkup(name) {
  return TABLER[resolveIcon(name)] || TABLER['file'];
}

export const ALL_ICON_NAMES = Object.keys(TABLER).sort();
