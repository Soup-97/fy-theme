<?php

namespace Soup97\FyTheme;

use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

class ThemeConfig
{
    public const USER_PREFERENCES = [
        'fyAccent' => ['option' => 'accent', 'allow' => 'userAccent'],
        'fyDensity' => ['option' => 'density', 'allow' => 'userDensity'],
        'fyFontScale' => ['option' => 'fontScale', 'allow' => 'userFontScale'],
    ];

    private ?array $config = null;

    public function __construct(protected SettingsRepositoryInterface $settings)
    {
    }

    public function get(): array
    {
        return $this->config ??= ThemeSchema::normalize($this->settings->get(ThemeSchema::SETTING_KEY));
    }

    /**
     * Config with the actor's personal overrides applied, where allowed.
     */
    public function forUser(?User $actor): array
    {
        $config = $this->get();

        if (! $actor || $actor->isGuest()) {
            return $config;
        }

        $options = ThemeSchema::options();

        foreach (self::USER_PREFERENCES as $preference => $map) {
            $value = $actor->getPreference($preference);

            if ($value !== null && $value !== '' && $config[$map['allow']]) {
                $config[$map['option']] = ThemeSchema::sanitize($options[$map['option']], $value);
            }
        }

        return $config;
    }

    /**
     * Config exposed to the forum frontend. Custom CSS is already inlined
     * server-side, so it's left out to keep the payload small.
     */
    public function forForum(): array
    {
        return array_diff_key($this->get(), ['customCss' => true]);
    }

    public static function transformPreference(string $preference): callable
    {
        return function ($value) use ($preference) {
            if ($value === null || $value === '') {
                return null;
            }

            $option = ThemeSchema::options()[self::USER_PREFERENCES[$preference]['option']];
            $clean = ThemeSchema::sanitize($option, $value);

            return $clean === '' ? null : $clean;
        };
    }
}
