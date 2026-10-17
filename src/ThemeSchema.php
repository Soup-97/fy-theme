<?php

namespace Soup97\FyTheme;

/**
 * Reads resources/schema.json — the single source of truth shared with the
 * JavaScript frontend — and turns untrusted stored values into a clean config.
 */
class ThemeSchema
{
    public const SETTING_KEY = 'fy-theme.config';

    private static ?array $schema = null;

    public static function raw(): array
    {
        if (self::$schema === null) {
            self::$schema = json_decode(file_get_contents(__DIR__.'/../resources/schema.json'), true);
        }

        return self::$schema;
    }

    /**
     * @return array<string, array>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::raw()['options'] as $option) {
            $options[$option['key']] = $option;
        }

        return $options;
    }

    public static function fonts(): array
    {
        return self::raw()['fonts'];
    }

    public static function defaults(): array
    {
        return array_map(fn (array $option) => $option['default'], self::options());
    }

    /**
     * Decode a stored JSON string (or array) and normalize every value.
     * Unknown keys are dropped, invalid values fall back to the default.
     */
    public static function normalize(mixed $stored): array
    {
        if (is_string($stored)) {
            $stored = json_decode($stored, true);
        }

        if (! is_array($stored)) {
            $stored = [];
        }

        $config = [];

        foreach (self::options() as $key => $option) {
            $config[$key] = array_key_exists($key, $stored)
                ? self::sanitize($option, $stored[$key])
                : $option['default'];
        }

        return $config;
    }

    public static function sanitize(array $option, mixed $value): mixed
    {
        $default = $option['default'];

        switch ($option['type']) {
            case 'color':
                return is_string($value) && ($value === '' || self::isColor($value)) ? strtolower($value) : $default;

            case 'range':
                if (! is_numeric($value)) {
                    return $default;
                }
                $value = $value + 0;
                if (isset($option['auto']) && $value == $option['auto']) {
                    return $value;
                }

                return max($option['min'], min($option['max'], $value));

            case 'select':
                $value = (string) $value;

                return array_key_exists($value, $option['choices']) ? $value : $default;

            case 'font':
                $value = (string) $value;
                $allowed = array_key_exists($value, self::fonts()) || (! empty($option['allowInherit']) && $value === 'inherit');

                return $allowed ? $value : $default;

            case 'bool':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;

            case 'url':
                return is_string($value) && ($value === '' || self::isSafeUrl($value)) ? $value : $default;

            case 'text':
            case 'textarea':
                if (! is_scalar($value)) {
                    return $default;
                }

                return mb_substr((string) $value, 0, $option['maxLength'] ?? 1000);
        }

        return $default;
    }

    public static function isColor(string $value): bool
    {
        return (bool) preg_match('/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $value);
    }

    /**
     * URLs end up inside CSS url("…") and HTML attributes, so only allow
     * http(s) or root-relative URLs without characters that could break out.
     */
    public static function isSafeUrl(string $value): bool
    {
        if (strlen($value) > 2000 || preg_match('/["\'()\\\\<>\s]/', $value)) {
            return false;
        }

        return str_starts_with($value, '/') && ! str_starts_with($value, '//')
            || (bool) preg_match('#^https?://[^/]#i', $value);
    }
}
