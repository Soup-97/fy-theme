import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import type Mithril from 'mithril';
import { ThemeConfig } from '../../common/theme';

interface ScrollWidgetsAttrs {
  config: ThemeConfig;
}

/**
 * Reading progress bar and back-to-top button. Both update via direct DOM
 * writes on scroll, so scrolling never triggers a Mithril redraw.
 */
export default class ScrollWidgets extends Component<ScrollWidgetsAttrs> {
  private frame = 0;
  private onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  oncreate(vnode: Mithril.VnodeDOM<ScrollWidgetsAttrs, this>) {
    super.oncreate(vnode);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });
    this.update();
  }

  onupdate(vnode: Mithril.VnodeDOM<ScrollWidgetsAttrs, this>) {
    super.onupdate(vnode);
    this.update();
  }

  onremove(vnode: Mithril.VnodeDOM<ScrollWidgetsAttrs, this>) {
    super.onremove(vnode);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  isDiscussion(): boolean {
    return !!app.current.data.routeName?.startsWith('discussion');
  }

  view(): Mithril.Children {
    const { config } = this.attrs;

    return (
      <div className="FyScrollWidgets">
        {config.progressBar && this.isDiscussion() ? (
          <div className="FyProgress" aria-hidden="true">
            <div className="FyProgress-bar" />
          </div>
        ) : null}
        {config.backToTop ? (
          <button
            type="button"
            className="FyBackToTop"
            aria-label={app.translator.trans('fy-theme.forum.back_to_top', {}, true)}
            onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Icon name="fas fa-arrow-up" />
          </button>
        ) : null}
      </div>
    );
  }

  update() {
    const element = this.element as HTMLElement | undefined;
    if (!element) return;

    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    element.style.setProperty('--fy-progress', String(progress));
    element.querySelector('.FyBackToTop')?.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  }
}
