import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import type Mithril from 'mithril';
import { ThemeConfig } from '../../common/theme';

interface AnnouncementAttrs {
  config: ThemeConfig;
}

const STORAGE_KEY = 'fy-theme.announcement.dismissed';

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return String(h);
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export default class Announcement extends Component<AnnouncementAttrs> {
  view(): Mithril.Children {
    const { config } = this.attrs;
    const text = String(config.announcementText || '').trim();

    if (!text || readDismissed() === hash(text)) return null;

    const link = String(config.announcementLink || '');

    return (
      <div className={`FyAnnouncement FyAnnouncement--${config.announcementStyle}`} role="status">
        <span className="FyAnnouncement-text">
          {link ? (
            <a href={link} target={/^https?:/.test(link) ? '_blank' : undefined} rel="noopener noreferrer">
              {text}
            </a>
          ) : (
            text
          )}
        </span>
        {config.announcementDismissible ? (
          <Button
            className="Button Button--icon Button--link FyAnnouncement-close"
            icon="fas fa-times"
            aria-label={app.translator.trans('fy-theme.forum.announcement.dismiss')}
            onclick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, hash(text));
              } catch (e) {
                // Storage unavailable: it just won't stay dismissed.
              }
              m.redraw();
            }}
          />
        ) : null}
      </div>
    );
  }
}
