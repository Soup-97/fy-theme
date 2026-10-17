import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import type Mithril from 'mithril';
import { isSafeUrl, ThemeConfig } from '../../common/theme';

interface ThemeFooterAttrs {
  config: ThemeConfig;
}

export function parseLinks(raw: string): { label: string; url: string }[] {
  return raw
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter(([label, url]) => label && url && isSafeUrl(url))
    .map(([label, url]) => ({ label, url }));
}

export default class ThemeFooter extends Component<ThemeFooterAttrs> {
  view(): Mithril.Children {
    const { config } = this.attrs;

    if (!config.footerEnabled) return null;

    const text = String(config.footerText || '').replace('{year}', String(new Date().getFullYear()));
    const links = parseLinks(String(config.footerLinks || ''));

    return (
      <div className="FyFooter">
        <div className="container">
          <div className="FyFooter-text">{text || app.forum.attribute('title')}</div>
          {links.length ? (
            <ul className="FyFooter-links">
              {links.map((link) => (
                <li>
                  <a href={link.url} target={/^https?:/.test(link.url) ? '_blank' : undefined} rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }
}
