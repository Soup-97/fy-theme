import app from 'flarum/forum/app';
import { normalize, option, sanitize, ThemeConfig } from '../common/theme';

/** Preference key => [theme option, admin toggle that allows it]. Mirrors ThemeConfig::USER_PREFERENCES. */
export const USER_PREFERENCES: Record<string, [string, string]> = {
  fyAccent: ['accent', 'userAccent'],
  fyDensity: ['density', 'userDensity'],
  fyFontScale: ['fontScale', 'userFontScale'],
};

export function forumConfig(): ThemeConfig {
  return normalize(app.forum.attribute('fyTheme'));
}

/** The forum config with the current user's personal choices layered on. */
export function userConfig(): ThemeConfig {
  const config = forumConfig();
  const prefs = (app.session.user?.preferences() || {}) as Record<string, unknown>;

  Object.keys(USER_PREFERENCES).forEach((pref) => {
    const [key, allow] = USER_PREFERENCES[pref];
    const value = prefs[pref];

    if (config[allow] && value !== null && value !== undefined && value !== '') {
      config[key] = sanitize(option(key)!, value);
    }
  });

  return config;
}

export function personalizationEnabled(config: ThemeConfig = forumConfig()): boolean {
  return Object.keys(USER_PREFERENCES).some((pref) => !!config[USER_PREFERENCES[pref][1]]);
}
