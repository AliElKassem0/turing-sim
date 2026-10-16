import { h } from './dom.ts';
import { icon, type IconName } from './icons.ts';
import { load, save } from './storage.ts';

type Theme = 'system' | 'light' | 'dark';
const KEY = 'tm-sim.theme';
const OPTIONS: [Theme, IconName, string][] = [
  ['system', 'monitor', 'System theme'],
  ['light', 'sun', 'Light theme'],
  ['dark', 'moon', 'Dark theme'],
];

function apply(theme: Theme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** Segmented control: follow the system, or force light / dark. */
export function themeToggle(): HTMLElement {
  let current = load<Theme>(KEY, 'system');
  apply(current);
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Color theme' });
  const buttons = OPTIONS.map(([theme, name, label]) => {
    const b = h('button', { type: 'button', role: 'radio', title: label, 'aria-label': label }, icon(name, 15));
    b.addEventListener('click', () => {
      current = theme;
      apply(theme);
      save(KEY, theme);
      sync();
    });
    return b;
  });
  const sync = () => OPTIONS.forEach(([theme], i) => buttons[i].setAttribute('aria-checked', String(theme === current)));
  sync();
  group.append(...buttons);
  return group;
}
