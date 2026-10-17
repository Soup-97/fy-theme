<?php

namespace Soup97\FyTheme\Content;

use Flarum\Frontend\Document;
use Flarum\Http\RequestUtil;
use Psr\Http\Message\ServerRequestInterface;
use Soup97\FyTheme\ThemeConfig;
use Soup97\FyTheme\ThemeRenderer;

/**
 * Renders the theme's variables and attributes into the initial HTML so the
 * page paints with the right look immediately, without a flash.
 */
class InjectTheme
{
    public function __construct(protected ThemeConfig $theme)
    {
    }

    public function __invoke(Document $document, ServerRequestInterface $request): void
    {
        $config = $this->theme->forUser(RequestUtil::getActor($request));

        foreach (ThemeRenderer::attributes($config) as $name => $value) {
            $document->extraAttributes[$name] = $value;
        }

        if ($fonts = ThemeRenderer::googleFontsUrl($config)) {
            $document->head[] = '<link rel="preconnect" href="https://fonts.googleapis.com">';
            $document->head[] = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
            $document->head[] = '<link rel="stylesheet" id="fy-theme-fonts" href="'.e($fonts).'">';
        }

        $document->head[] = '<style id="fy-theme-vars">'.ThemeRenderer::css($config).'</style>';
    }
}
