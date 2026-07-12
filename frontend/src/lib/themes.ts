// Single source of truth for the user-selectable SPA themes (#736).
//
// The `slug` is what gets stored per-user (server-side it is mapped to the
// legacy User.theme integer code in cps/ui_themes.py) and validated by the
// backend account endpoint. It is also applied verbatim as
// `<html data-theme="<slug>">`, and frontend/src/styles/tokens.css defines the
// palette for each slug. Keep this list in lockstep with cps/ui_themes.py
// (THEME_CODES) — tests/unit/test_theme_registry.py pins the two together so a
// slug can never drift out of sync and silently 400-reject a valid choice.
//
// 'system' is not a palette; it resolves at runtime to the OS light/dark
// preference (see resolveTheme) and re-resolves live when the OS flips.

export interface ThemeOption {
  /** stored + validated + data-theme value, e.g. "sepia". */
  slug: string;
  /** user-facing name (wrapped in t() at the call site for i18n). */
  label: string;
  /** short helper line shown under the option group. */
  hint?: string;
}

export const THEMES: ThemeOption[] = [
  { slug: 'system',        label: 'System',        hint: 'Match your device’s light or dark setting' },
  { slug: 'light',         label: 'Light' },
  { slug: 'dark',          label: 'Dark' },
  { slug: 'sepia',         label: 'Sepia' },
  { slug: 'high-contrast', label: 'High contrast' },
  { slug: 'midnight',      label: 'Midnight (AMOLED)' },
];

export const THEME_SLUGS: string[] = THEMES.map((t) => t.slug);

/** The palette applied when nothing is chosen (and the pre-boot fallback). */
export const DEFAULT_THEME = 'dark';

/** The concrete palette slugs that actually exist as data-theme blocks in
 *  tokens.css (everything except the synthetic 'system'). */
export const CONCRETE_THEMES: string[] = THEME_SLUGS.filter((s) => s !== 'system');

/** True when the OS currently prefers a light appearance. Safe when matchMedia
 *  is unavailable (older/SSR) — defaults to dark. */
export function osPrefersLight(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-color-scheme: light)').matches;
}

/** Resolve a stored theme slug to the concrete palette to apply. 'system' →
 *  the live OS preference; an unknown/empty slug → the dark default. */
export function resolveTheme(slug: string | undefined | null): string {
  const s = slug || DEFAULT_THEME;
  if (s === 'system') return osPrefersLight() ? 'light' : 'dark';
  return CONCRETE_THEMES.includes(s) ? s : DEFAULT_THEME;
}
