<?php

namespace Soup97\FyTheme;

/**
 * Turns a normalized config into what the browser needs on first paint:
 * CSS custom properties, data-attributes on <html> and font links.
 *
 * Mirrors js/src/common/applyTheme.ts, which does the same at runtime for
 * the admin live preview and per-user preferences.
 */
class ThemeRenderer
{
    /**
     * @return array<string, string> CSS custom property => value
     */
    public static function variables(array $config): array
    {
        $vars = [];
        $fonts = ThemeSchema::fonts();

        foreach (ThemeSchema::options() as $key => $option) {
            if (empty($option['cssVar'])) {
                continue;
            }

            $value = $config[$key] ?? $option['default'];

            if ($value === '' || $value === null || (isset($option['auto']) && $value == $option['auto'])) {
                continue;
            }

            if ($option['type'] === 'font') {
                if ($value === 'inherit') {
                    continue;
                }
                $value = $fonts[$value]['stack'];
            } elseif (($option['format'] ?? null) === 'url') {
                $value = 'url("'.$value.'")';
            } else {
                $value .= $option['unit'] ?? '';
            }

            $vars[$option['cssVar']] = (string) $value;
        }

        return $vars;
    }

    /**
     * @return array<string, string> attribute name => value
     */
    public static function attributes(array $config): array
    {
        $attrs = [];

        foreach (ThemeSchema::options() as $key => $option) {
            if (empty($option['attr'])) {
                continue;
            }

            $value = $config[$key] ?? $option['default'];
            $attrs[self::attributeName($key)] = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
        }

        return $attrs;
    }

    public static function attributeName(string $key): string
    {
        return 'data-fy-'.strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $key));
    }

    public static function googleFontsUrl(array $config): ?string
    {
        $fonts = ThemeSchema::fonts();
        $families = [];

        foreach (ThemeSchema::options() as $key => $option) {
            if ($option['type'] === 'font' && isset($fonts[$config[$key]]['google'])) {
                $families[$fonts[$config[$key]]['google']] = true;
            }
        }

        if (! $families) {
            return null;
        }

        return 'https://fonts.googleapis.com/css2?family='.implode('&family=', array_keys($families)).'&display=swap';
    }

    public static function css(array $config): string
    {
        $declarations = '';

        foreach (self::variables($config) as $name => $value) {
            $declarations .= $name.':'.$value.';';
        }

        $css = ':root{'.$declarations.'}';

        if (($config['customCss'] ?? '') !== '') {
            $css .= "\n".$config['customCss'];
        }

        // Never allow the stored CSS to close the <style> element.
        return str_ireplace('</style', '<\/style', $css);
    }
}
