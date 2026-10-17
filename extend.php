<?php

/*
 * This file is part of soup-97/fy-theme.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace Soup97\FyTheme;

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less')
        ->content(Content\InjectTheme::class),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Settings())
        ->default(ThemeSchema::SETTING_KEY, '{}')
        ->serializeToForum('fyTheme', ThemeSchema::SETTING_KEY, function () {
            return resolve(ThemeConfig::class)->forForum();
        }),

    (new Extend\User())
        ->registerPreference('fyAccent', ThemeConfig::transformPreference('fyAccent'))
        ->registerPreference('fyDensity', ThemeConfig::transformPreference('fyDensity'))
        ->registerPreference('fyFontScale', ThemeConfig::transformPreference('fyFontScale')),
];
