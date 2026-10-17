# FY Theme for Flarum 2.0

A deeply customizable theme for [Flarum 2.0](https://flarum.org). Over 50 options, 8 presets, a **Theme Studio** with a live preview of your real forum, and per-member personalization. No Less recompiles: every change goes live on the next page load.

## Features

**Theme Studio (admin)**
- Live preview of the actual forum in an iframe, with desktop / tablet / phone sizes and light / dark / auto scheme toggles, on any page path
- One-click presets: Aurora, Midnight, Forest, Sunset, Ocean, Neon, Minimal, Flarum classic
- Search across all options, per-option reset, undo / redo (Ctrl+Z / Ctrl+Y)
- Import / export the theme as JSON, copy to clipboard
- WCAG contrast badge for the accent color

**Look & feel**
- Accent + secondary accent gradients with adjustable angle; separate background and surface colors for light and dark mode
- 16 fonts (Google Fonts loaded automatically), separate heading font, font scale, line height, heading weight
- Container width, sidebar width and side, sticky sidebar, density (compact / comfortable / spacious), corner radius
- Header styles: default, solid, frosted glass (adjustable blur), accent gradient, accent underline
- Welcome hero: gradient, background image with overlay, minimal, hidden; alignment and minimum height
- Discussion list: classic, cards, divided, compact; hover effects (lift, glow, accent bar); avatar shapes
- Posts: classic, cards, chat bubbles; "OP" badge on the discussion author's posts; max reading width
- Shadows, glass dropdowns and modals, animations (respecting `prefers-reduced-motion`), page backgrounds (gradient, mesh glow, dots, grid, image), themed scrollbars

**Components**
- Dismissible announcement bar (4 styles, optional link)
- Reading progress bar on discussions, back-to-top button
- Footer with text (`{year}` placeholder) and links

**Personalization**
- Members can pick their own accent color, density and text size in their settings (each can be switched off by the admin)

**Advanced**
- Theme-scoped custom CSS; every option is exposed as a CSS variable (`--fy-accent`, `--fy-radius`, `--fy-gradient`, …) and a `data-fy-*` attribute on `<html>` for your own styles

## Installation

```sh
composer require soup-97/fy-theme
php flarum extension:enable soup-97-fy-theme
```

Then open **Admin → FY Theme**.

## How it works

`resources/schema.json` is the single source of truth: it defines every option (type, default, range, choices, and whether it maps to a CSS variable or a `data-fy-*` attribute). Both the PHP backend and the JS frontend read it.

- **Server** (`src/`): `ThemeSchema` validates the stored config (`fy-theme.config` setting, JSON), `ThemeRenderer` turns it into CSS variables, `<html>` attributes and a Google Fonts link, and `Content\InjectTheme` writes them into the page head, so the first paint is already themed with no flash.
- **Client** (`js/src/common/theme.ts`): the same mapping, used by the Theme Studio preview and by member preferences.
- **Styles** (`less/`): static Less that reacts only to the variables and attributes, so no recompile is needed.

Adding an option is usually one entry in `schema.json` plus the CSS that uses it.

## Development

```sh
cd js
npm install
npm run dev     # or: npm run build
```

PHP unit tests: `composer install && composer test`.

## License

MIT
