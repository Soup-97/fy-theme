<?php

namespace Soup97\FyTheme\Tests\unit;

use PHPUnit\Framework\TestCase;
use Soup97\FyTheme\ThemeRenderer;
use Soup97\FyTheme\ThemeSchema;

class ThemeSchemaTest extends TestCase
{
    public function test_empty_config_yields_defaults(): void
    {
        $this->assertSame(ThemeSchema::defaults(), ThemeSchema::normalize('{}'));
        $this->assertSame(ThemeSchema::defaults(), ThemeSchema::normalize('not json'));
        $this->assertSame(ThemeSchema::defaults(), ThemeSchema::normalize(null));
    }

    public function test_presets_only_use_known_keys_and_valid_values(): void
    {
        $presets = json_decode(file_get_contents(__DIR__.'/../../resources/presets.json'), true);
        $options = ThemeSchema::options();

        foreach ($presets as $id => $preset) {
            foreach ($preset['values'] as $key => $value) {
                $this->assertArrayHasKey($key, $options, "Preset $id uses unknown option $key");
                $this->assertSame($value, ThemeSchema::sanitize($options[$key], $value), "Preset $id has invalid $key");
            }
        }
    }

    public function test_invalid_values_fall_back_to_defaults(): void
    {
        $config = ThemeSchema::normalize([
            'accent' => 'red; } body { display:none',
            'radius' => 9999,
            'headerStyle' => 'evil',
            'fontBody' => 'Comic Sans',
            'glass' => 'nope',
            'heroImage' => 'https://x.test/a.png") ; } * { color: red',
            'unknown' => 'dropped',
        ]);

        $this->assertSame('', $config['accent']);
        $this->assertSame(28, $config['radius']);
        $this->assertSame('glass', $config['headerStyle']);
        $this->assertSame('system', $config['fontBody']);
        $this->assertTrue($config['glass']);
        $this->assertSame('', $config['heroImage']);
        $this->assertArrayNotHasKey('unknown', $config);
    }

    public function test_safe_urls(): void
    {
        $this->assertTrue(ThemeSchema::isSafeUrl('https://cdn.example.com/hero.jpg'));
        $this->assertTrue(ThemeSchema::isSafeUrl('/assets/hero.jpg'));
        $this->assertFalse(ThemeSchema::isSafeUrl('//evil.test/x.png'));
        $this->assertFalse(ThemeSchema::isSafeUrl('javascript:alert(1)'));
        $this->assertFalse(ThemeSchema::isSafeUrl('https://x.test/a b.png'));
    }

    public function test_renderer_outputs_variables_and_attributes(): void
    {
        $config = ThemeSchema::normalize(['accent' => '#FF0000', 'fontBody' => 'inter', 'containerWidth' => 0, 'heroImage' => '/hero.jpg']);

        $vars = ThemeRenderer::variables($config);
        $this->assertSame('#ff0000', $vars['--fy-accent']);
        $this->assertStringContainsString('Inter', $vars['--fy-font-body']);
        $this->assertSame('url("/hero.jpg")', $vars['--fy-hero-image']);
        $this->assertArrayNotHasKey('--fy-container', $vars, 'auto values are not emitted');
        $this->assertArrayNotHasKey('--fy-font-heading', $vars, 'inherit fonts are not emitted');

        $attrs = ThemeRenderer::attributes($config);
        $this->assertSame('glass', $attrs['data-fy-header-style']);
        $this->assertSame('true', $attrs['data-fy-sticky-sidebar']);

        $this->assertStringContainsString('family=Inter', ThemeRenderer::googleFontsUrl($config));
    }

    public function test_custom_css_cannot_close_the_style_tag(): void
    {
        $css = ThemeRenderer::css(ThemeSchema::normalize(['customCss' => 'a{}</STYLE><script>alert(1)</script>']));

        $this->assertStringNotContainsStringIgnoringCase('</style', $css);
    }
}
