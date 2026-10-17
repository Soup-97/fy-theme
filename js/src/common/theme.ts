/**
 * The theme engine shared by the forum and the admin studio.
 *
 * Mirrors src/ThemeRenderer.php: the server renders the first paint, this
 * re-applies the theme at runtime for the live preview and personal
 * preferences. Both read the same resources/schema.json.
 */
import schemaJson from '../../../resources/schema.json';
import presetsJson from '../../../resources/presets.json';

export type OptionType = 'color' | 'range' | 'select' | 'font' | 'bool' | 'url' | 'text' | 'textarea';
export type ThemeValue = string | number | boolean;
export type ThemeConfig = Record<string, ThemeValue>;

export interface ThemeOption {
  key: string;
  group: string;
  type: OptionType;
  default: ThemeValue;
  label: string;
  help?: string;
  cssVar?: string;
  attr?: boolean;
  unit?: string;
  format?: 'url';
  min?: number;
  max?: number;
  step?: number;
  auto?: number;
  choices?: Record<string, string>;
  allowInherit?: boolean;
  maxLength?: number;
  code?: boolean;
}

export interface ThemeGroup {
  id: string;
  icon: string;
  label: string;
}

export interface ThemeFont {
  label: string;
  stack: string;
  google?: string;
}

export interface ThemePreset {
  label: string;
  description: string;
  values: Partial<ThemeConfig>;
}

export const groups = schemaJson.groups as ThemeGroup[];
export const options = schemaJson.options as unknown as ThemeOption[];
export const fonts = schemaJson.fonts as Record<string, ThemeFont>;
export const presets = presetsJson as Record<string, ThemePreset>;

export const SETTING_KEY = 'fy-theme.config';

const optionMap: Record<string, ThemeOption> = {};
options.forEach((option) => (optionMap[option.key] = option));

export function option(key: string): ThemeOption | undefined {
  return optionMap[key];
}

export function defaults(): ThemeConfig {
  const config: ThemeConfig = {};
  options.forEach((o) => (config[o.key] = o.default));
  return config;
}

const COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const UNSAFE_URL = /["'()\\<>\s]/;

export function isSafeUrl(value: string): boolean {
  if (value.length > 2000 || UNSAFE_URL.test(value)) return false;
  return (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\/[^/]/i.test(value);
}

export function sanitize(o: ThemeOption, value: unknown): ThemeValue {
  switch (o.type) {
    case 'color':
      return typeof value === 'string' && (value === '' || COLOR.test(value)) ? value.toLowerCase() : o.default;
    case 'range': {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isFinite(n)) return o.default;
      if (o.auto !== undefined && n === o.auto) return n;
      return Math.max(o.min!, Math.min(o.max!, n));
    }
    case 'select':
      return o.choices && String(value) in o.choices ? String(value) : o.default;
    case 'font':
      return String(value) in fonts || (o.allowInherit && value === 'inherit') ? String(value) : o.default;
    case 'bool':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1' || value === 1) return true;
      if (value === 'false' || value === '0' || value === 0) return false;
      return o.default;
    case 'url':
      return typeof value === 'string' && (value === '' || isSafeUrl(value)) ? value : o.default;
    case 'text':
    case 'textarea':
      return typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, o.maxLength ?? 1000) : o.default;
  }
  return o.default;
}

export function normalize(input: unknown): ThemeConfig {
  let stored: Record<string, unknown> = {};

  if (typeof input === 'string') {
    try {
      stored = JSON.parse(input) || {};
    } catch (e) {
      stored = {};
    }
  } else if (input && typeof input === 'object') {
    stored = input as Record<string, unknown>;
  }

  const config: ThemeConfig = {};
  options.forEach((o) => {
    config[o.key] = o.key in stored ? sanitize(o, stored[o.key]) : o.default;
  });
  return config;
}

/** Only the values that differ from the defaults — what gets stored. */
export function diff(config: ThemeConfig): Partial<ThemeConfig> {
  const out: Partial<ThemeConfig> = {};
  options.forEach((o) => {
    if (config[o.key] !== o.default) out[o.key] = config[o.key];
  });
  return out;
}

export function applyPreset(id: string, current?: ThemeConfig): ThemeConfig {
  const preset = presets[id];
  const base = defaults();

  // Keep content-ish options (texts, links, toggles of features) when switching looks.
  if (current) {
    options.forEach((o) => {
      if (o.group === 'components' || o.group === 'personalization' || o.group === 'advanced') base[o.key] = current[o.key];
    });
  }

  return normalize({ ...base, ...(preset?.values || {}) });
}

export function attributeName(key: string): string {
  return 'data-fy-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

export function variables(config: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {};

  options.forEach((o) => {
    if (!o.cssVar) return;

    const value = config[o.key] ?? o.default;
    if (value === '' || value === null || (o.auto !== undefined && value === o.auto)) return;

    if (o.type === 'font') {
      if (value === 'inherit') return;
      vars[o.cssVar] = fonts[value as string].stack;
    } else if (o.format === 'url') {
      vars[o.cssVar] = `url("${value}")`;
    } else {
      vars[o.cssVar] = `${value}${o.unit || ''}`;
    }
  });

  return vars;
}

export function attributes(config: ThemeConfig): Record<string, string> {
  const attrs: Record<string, string> = {};

  options.forEach((o) => {
    if (!o.attr) return;
    const value = config[o.key] ?? o.default;
    attrs[attributeName(o.key)] = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
  });

  return attrs;
}

export function googleFontsUrl(config: ThemeConfig): string | null {
  const families = new Set<string>();

  options.forEach((o) => {
    if (o.type !== 'font') return;
    const font = fonts[config[o.key] as string];
    if (font?.google) families.add(font.google);
  });

  if (!families.size) return null;

  return 'https://fonts.googleapis.com/css2?family=' + Array.from(families).join('&family=') + '&display=swap';
}

export function buildCss(config: ThemeConfig): string {
  const vars = variables(config);
  const declarations = Object.keys(vars)
    .map((name) => `${name}:${vars[name]};`)
    .join('');

  let css = `:root{${declarations}}`;
  if (config.customCss) css += '\n' + config.customCss;

  return css;
}

function ensureFonts(doc: Document, config: ThemeConfig) {
  const url = googleFontsUrl(config);
  let link = doc.getElementById('fy-theme-fonts') as HTMLLinkElement | null;

  if (!url) {
    link?.remove();
    return;
  }

  if (!link) {
    link = doc.createElement('link');
    link.id = 'fy-theme-fonts';
    link.rel = 'stylesheet';
    doc.head.appendChild(link);
  }

  if (link.href !== url) link.href = url;
}

function applyAttributes(doc: Document, config: ThemeConfig) {
  const attrs = attributes(config);
  Object.keys(attrs).forEach((name) => doc.documentElement.setAttribute(name, attrs[name]));
}

/**
 * Replace the server-rendered theme stylesheet wholesale (admin live preview).
 */
export function applyThemeDocument(doc: Document, config: ThemeConfig) {
  let style = doc.getElementById('fy-theme-vars') as HTMLStyleElement | null;

  if (!style) {
    style = doc.createElement('style');
    style.id = 'fy-theme-vars';
    doc.head.appendChild(style);
  }

  style.textContent = buildCss(config);
  applyAttributes(doc, config);
  ensureFonts(doc, config);
}

/**
 * Layer values on top of the server-rendered stylesheet with inline styles
 * (personal preferences). Variables not set by the config are cleared so the
 * forum's own values show through again.
 */
export function applyThemeInline(doc: Document, config: ThemeConfig) {
  const root = doc.documentElement;
  const vars = variables(config);

  options.forEach((o) => {
    if (!o.cssVar) return;
    if (o.cssVar in vars) root.style.setProperty(o.cssVar, vars[o.cssVar]);
    else root.style.removeProperty(o.cssVar);
  });

  applyAttributes(doc, config);
  ensureFonts(doc, config);
}
