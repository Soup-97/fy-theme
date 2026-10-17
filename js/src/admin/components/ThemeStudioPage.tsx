import app from 'flarum/admin/app';
import ExtensionPage, { ExtensionPageAttrs } from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import Select from 'flarum/common/components/Select';
import Switch from 'flarum/common/components/Switch';
import Icon from 'flarum/common/components/Icon';
import ItemList from 'flarum/common/utils/ItemList';
import type Mithril from 'mithril';
import {
  applyPreset,
  applyThemeDocument,
  defaults,
  diff,
  fonts,
  groups,
  normalize,
  options,
  presets,
  sanitize,
  SETTING_KEY,
  ThemeConfig,
  ThemeOption,
  ThemeValue,
} from '../../common/theme';
import { contrastRatio } from '../../common/color';

type Device = 'desktop' | 'tablet' | 'phone';
type Scheme = 'auto' | 'light' | 'dark';

const DEVICE_WIDTHS: Record<Device, string> = { desktop: '100%', tablet: '820px', phone: '390px' };
const HISTORY_LIMIT = 100;

const t = (key: string, params: Record<string, any> = {}) => app.translator.trans(`fy-theme.admin.${key}`, params);
const tt = (key: string, params: Record<string, any> = {}) => app.translator.trans(`fy-theme.admin.${key}`, params, true);

/**
 * The Theme Studio: every option, presets, import/export, undo/redo and a
 * live preview of the real forum in an iframe.
 */
export default class ThemeStudioPage extends ExtensionPage<ExtensionPageAttrs> {
  draft: ThemeConfig = defaults();
  history: ThemeConfig[] = [];
  future: ThemeConfig[] = [];

  activeGroup = groups[0].id;
  query = '';
  device: Device = 'desktop';
  scheme: Scheme = 'auto';
  previewPath = '/';
  frame: HTMLIFrameElement | null = null;

  /** The draft as it was before an in-progress slider/picker drag started. */
  liveOrigin: ThemeConfig | null = null;

  private keyHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!(e.ctrlKey || e.metaKey) || target.closest('input, textarea, select')) return;

    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      m.redraw();
    } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      this.redo();
      m.redraw();
    }
  };

  oninit(vnode: Mithril.Vnode<ExtensionPageAttrs, this>) {
    super.oninit(vnode);

    this.draft = normalize(this.setting(SETTING_KEY, '{}')());
  }

  oncreate(vnode: Mithril.VnodeDOM<ExtensionPageAttrs, this>) {
    super.oncreate(vnode);
    document.addEventListener('keydown', this.keyHandler);
  }

  onremove(vnode: Mithril.VnodeDOM<ExtensionPageAttrs, this>) {
    super.onremove(vnode);
    document.removeEventListener('keydown', this.keyHandler);
  }

  className() {
    return super.className() + ' FyStudio-page';
  }

  sections(vnode: Mithril.VnodeDOM<ExtensionPageAttrs, this>) {
    const items = new ItemList<Mithril.Children>();
    items.add('content', this.content());
    return items;
  }

  // -------------------------------------------------------------------------
  // State

  commit(next: ThemeConfig) {
    this.history.push(this.liveOrigin ?? this.draft);
    this.liveOrigin = null;
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.future = [];
    this.setDraft(next);
  }

  setDraft(next: ThemeConfig) {
    this.draft = next;
    this.setting(SETTING_KEY)(JSON.stringify(diff(next)));
    this.refreshPreview();
  }

  set(key: string, value: ThemeValue) {
    const option = options.find((o) => o.key === key)!;
    this.commit({ ...this.draft, [key]: sanitize(option, value) });
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.push(this.draft);
    this.setDraft(previous);
  }

  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.draft);
    this.setDraft(next);
  }

  // -------------------------------------------------------------------------
  // Preview

  refreshPreview() {
    const doc = this.frame?.contentDocument;
    if (!doc || !doc.documentElement) return;

    applyThemeDocument(doc, this.draft);

    if (this.scheme !== 'auto') {
      doc.documentElement.setAttribute('data-theme', this.scheme);
    }
  }

  previewUrl(): string {
    const base = String(app.forum.attribute('baseUrl')).replace(/\/$/, '');
    return base + (this.previewPath.startsWith('/') ? this.previewPath : '/' + this.previewPath);
  }

  // -------------------------------------------------------------------------
  // Import / export

  exportConfig() {
    const blob = new Blob([JSON.stringify({ fyTheme: 1, config: diff(this.draft) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fy-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      file.text().then((text) => {
        try {
          const data = JSON.parse(text);
          this.commit(normalize(data.config ?? data));
          app.alerts.show({ type: 'success' }, tt('studio.import_success'));
        } catch (e) {
          app.alerts.show({ type: 'error' }, tt('studio.import_error'));
        }
        m.redraw();
      });
    };
    input.click();
  }

  copyJson() {
    navigator.clipboard?.writeText(JSON.stringify({ fyTheme: 1, config: diff(this.draft) }, null, 2)).then(() => {
      app.alerts.show({ type: 'success' }, tt('studio.copied'));
    });
  }

  // -------------------------------------------------------------------------
  // Views

  content(): JSX.Element {
    return (
      <div className="FyStudio">
        {this.toolbar()}
        {this.presetGallery()}
        <div className="FyStudio-workspace">
          <div className="FyStudio-panel">
            {this.groupTabs()}
            <div className="FyStudio-options">{this.optionList()}</div>
          </div>
          {this.preview()}
        </div>
      </div>
    );
  }

  toolbar(): Mithril.Children {
    const changed = Object.keys(diff(this.draft)).length;

    return (
      <div className="FyStudio-toolbar">
        <div className="FyStudio-toolbar-group">
          <Button className="Button Button--icon" icon="fas fa-undo" disabled={!this.history.length} onclick={() => this.undo()} aria-label={tt('studio.undo')} />
          <Button className="Button Button--icon" icon="fas fa-redo" disabled={!this.future.length} onclick={() => this.redo()} aria-label={tt('studio.redo')} />
          <span className="FyStudio-changed helpText">{t('studio.customized', { count: changed })}</span>
        </div>
        <div className="FyStudio-toolbar-group">
          <Button className="Button" icon="fas fa-file-import" onclick={() => this.importConfig()}>
            {t('studio.import')}
          </Button>
          <Button className="Button" icon="fas fa-file-export" onclick={() => this.exportConfig()}>
            {t('studio.export')}
          </Button>
          <Button className="Button" icon="fas fa-copy" onclick={() => this.copyJson()}>
            {t('studio.copy_json')}
          </Button>
          <Button
            className="Button Button--danger"
            icon="fas fa-eraser"
            disabled={!changed}
            onclick={() => confirm(tt('studio.reset_confirm')) && this.commit(defaults())}
          >
            {t('studio.reset')}
          </Button>
          <form className="FyStudio-save" onsubmit={this.saveSettings.bind(this)}>
            {this.submitButton()}
          </form>
        </div>
      </div>
    );
  }

  presetGallery(): Mithril.Children {
    return (
      <div className="FyStudio-presets">
        {Object.keys(presets).map((id) => {
          const preset = presets[id];
          const sample = normalize({ ...defaults(), ...preset.values });
          const a = (sample.accent as string) || '#536f90';
          const b = sample.accent2 as string;

          return (
            <button
              type="button"
              className="FyStudio-preset"
              title={preset.description}
              onclick={() => this.commit(applyPreset(id, this.draft))}
            >
              <span className="FyStudio-preset-swatch" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} />
              <span className="FyStudio-preset-label">{preset.label}</span>
              <span className="FyStudio-preset-description">{preset.description}</span>
            </button>
          );
        })}
      </div>
    );
  }

  groupTabs(): Mithril.Children {
    return (
      <div className="FyStudio-tabs">
        <div className="FyStudio-search">
          <Icon name="fas fa-search" />
          <input
            className="FormControl"
            type="search"
            placeholder={tt('studio.search_placeholder')}
            value={this.query}
            oninput={(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
          />
        </div>
        {!this.query ? (
          <nav className="FyStudio-tabList" role="tablist">
            {groups.map((group) => (
              <button
                type="button"
                role="tab"
                aria-selected={this.activeGroup === group.id}
                className={'FyStudio-tab' + (this.activeGroup === group.id ? ' active' : '')}
                onclick={() => (this.activeGroup = group.id)}
              >
                <Icon name={group.icon} />
                <span>{this.groupLabel(group.id, group.label)}</span>
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    );
  }

  groupLabel(id: string, fallback: string): string {
    const key = `fy-theme.admin.groups.${id}`;
    return key in app.translator.translations ? tt(`groups.${id}`) : fallback;
  }

  optionLabel(option: ThemeOption, field: 'label' | 'help'): string | undefined {
    const key = `fy-theme.admin.options.${option.key}.${field}`;
    return key in app.translator.translations ? tt(`options.${option.key}.${field}`) : option[field];
  }

  visibleOptions(): ThemeOption[] {
    const query = this.query.trim().toLowerCase();

    if (query) {
      return options.filter((o) => [o.key, this.optionLabel(o, 'label'), this.optionLabel(o, 'help')].join(' ').toLowerCase().includes(query));
    }

    return options.filter((o) => o.group === this.activeGroup);
  }

  optionList(): Mithril.Children {
    const visible = this.visibleOptions();

    if (!visible.length) return <p className="helpText">{t('studio.no_results')}</p>;

    return visible.map((option) => this.optionControl(option));
  }

  optionControl(option: ThemeOption): Mithril.Children {
    const value = this.draft[option.key];
    const isDefault = value === option.default;
    const label = this.optionLabel(option, 'label');
    const help = this.optionLabel(option, 'help');
    const id = `fy-option-${option.key}`;

    if (option.type === 'bool') {
      return (
        <div className="Form-group FyStudio-option" key={option.key}>
          <Switch state={!!value} onchange={(state: boolean) => this.set(option.key, state)}>
            {label}
          </Switch>
          {help ? <div className="helpText">{help}</div> : null}
        </div>
      );
    }

    return (
      <div className={'Form-group FyStudio-option FyStudio-option--' + option.type} key={option.key}>
        <div className="FyStudio-option-head">
          <label for={id}>{label}</label>
          {!isDefault ? (
            <button type="button" className="FyStudio-option-reset" title={tt('studio.reset_option')} onclick={() => this.set(option.key, option.default)}>
              <Icon name="fas fa-undo-alt" />
            </button>
          ) : null}
        </div>
        {help ? <div className="helpText">{help}</div> : null}
        {this.input(option, id)}
      </div>
    );
  }

  input(option: ThemeOption, id: string): Mithril.Children {
    const value = this.draft[option.key];

    switch (option.type) {
      case 'color': {
        const ratio = option.key === 'accent' && value ? Math.max(contrastRatio(String(value), '#ffffff'), contrastRatio(String(value), '#000000')) : null;

        return (
          <div className="FyStudio-color">
            <input
              type="color"
              value={value || '#536f90'}
              aria-label={this.optionLabel(option, 'label')}
              oninput={(e: InputEvent) => this.liveSet(option.key, (e.target as HTMLInputElement).value)}
              onchange={(e: Event) => this.set(option.key, (e.target as HTMLInputElement).value)}
            />
            <input
              id={id}
              className="FormControl"
              type="text"
              placeholder={tt('studio.inherit')}
              value={value}
              onchange={(e: Event) => this.set(option.key, (e.target as HTMLInputElement).value.trim())}
            />
            {value !== '' ? <Button className="Button Button--icon Button--link" icon="fas fa-times" onclick={() => this.set(option.key, '')} aria-label={tt('studio.clear')} /> : null}
            {ratio !== null ? (
              <span className={'FyStudio-contrast' + (ratio < 3 ? ' is-low' : '')} title={tt('studio.contrast_help')}>
                {ratio.toFixed(1)}:1
              </span>
            ) : null}
          </div>
        );
      }

      case 'range': {
        const isAuto = option.auto !== undefined && value === option.auto;

        return (
          <div className="FyStudio-range">
            <input
              id={id}
              type="range"
              min={option.min}
              max={option.max}
              step={option.step}
              value={value}
              oninput={(e: InputEvent) => this.liveSet(option.key, parseFloat((e.target as HTMLInputElement).value))}
              onchange={(e: Event) => this.set(option.key, parseFloat((e.target as HTMLInputElement).value))}
            />
            <output>{isAuto ? t('studio.auto') : `${value}${option.unit || ''}`}</output>
          </div>
        );
      }

      case 'select': {
        const choices = option.choices!;

        // Few choices read better as a segmented control.
        if (Object.keys(choices).length <= 4) {
          return (
            <div className="FyStudio-segmented" role="radiogroup">
              {Object.keys(choices).map((choice) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === choice}
                  className={value === choice ? 'active' : ''}
                  onclick={() => this.set(option.key, choice)}
                >
                  {choices[choice]}
                </button>
              ))}
            </div>
          );
        }

        return <Select id={id} value={value} options={choices} onchange={(v: string) => this.set(option.key, v)} />;
      }

      case 'font': {
        const choices: Record<string, string> = {};
        if (option.allowInherit) choices.inherit = tt('studio.same_as_body');
        Object.keys(fonts).forEach((key) => (choices[key] = fonts[key].label));

        return <Select id={id} value={value} options={choices} onchange={(v: string) => this.set(option.key, v)} />;
      }

      case 'textarea':
        return (
          <textarea
            id={id}
            className={'FormControl' + (option.code ? ' FyStudio-code' : '')}
            rows={option.code ? 12 : 4}
            spellcheck={!option.code}
            value={value}
            onchange={(e: Event) => this.set(option.key, (e.target as HTMLTextAreaElement).value)}
          />
        );

      case 'url':
      case 'text':
      default:
        return (
          <input
            id={id}
            className="FormControl"
            type={option.type === 'url' ? 'url' : 'text'}
            maxlength={option.maxLength}
            placeholder={option.type === 'url' ? 'https://' : ''}
            value={value}
            onchange={(e: Event) => {
              const raw = (e.target as HTMLInputElement).value.trim();
              this.set(option.key, raw);
              if (raw !== '' && this.draft[option.key] !== raw) app.alerts.show({ type: 'error' }, tt('studio.invalid_value'));
            }}
          />
        );
    }
  }

  /** Update the preview while dragging without flooding the undo history. */
  liveSet(key: string, value: ThemeValue) {
    const option = options.find((o) => o.key === key)!;
    this.liveOrigin ??= this.draft;
    this.draft = { ...this.draft, [key]: sanitize(option, value) };
    this.refreshPreview();
  }

  preview(): Mithril.Children {
    const devices: Record<Device, string> = { desktop: 'fas fa-desktop', tablet: 'fas fa-tablet-alt', phone: 'fas fa-mobile-alt' };
    const schemes: Record<Scheme, string> = { auto: 'fas fa-adjust', light: 'fas fa-sun', dark: 'fas fa-moon' };

    return (
      <div className="FyStudio-preview">
        <div className="FyStudio-previewBar">
          <div className="FyStudio-segmented FyStudio-segmented--icons">
            {(Object.keys(devices) as Device[]).map((device) => (
              <button type="button" className={this.device === device ? 'active' : ''} aria-label={tt(`studio.device_${device}`)} onclick={() => (this.device = device)}>
                <Icon name={devices[device]} />
              </button>
            ))}
          </div>
          <input
            className="FormControl FyStudio-previewPath"
            value={this.previewPath}
            aria-label={tt('studio.preview_path')}
            onchange={(e: Event) => (this.previewPath = (e.target as HTMLInputElement).value || '/')}
          />
          <div className="FyStudio-segmented FyStudio-segmented--icons">
            {(Object.keys(schemes) as Scheme[]).map((scheme) => (
              <button
                type="button"
                className={this.scheme === scheme ? 'active' : ''}
                aria-label={tt(`studio.scheme_${scheme}`)}
                onclick={() => {
                  this.scheme = scheme;
                  if (scheme === 'auto') this.frame?.contentWindow?.location.reload();
                  else this.refreshPreview();
                }}
              >
                <Icon name={schemes[scheme]} />
              </button>
            ))}
          </div>
          <Button className="Button Button--icon" icon="fas fa-sync" aria-label={tt('studio.reload')} onclick={() => this.frame?.contentWindow?.location.reload()} />
        </div>
        <div className="FyStudio-frameWrap">
          <iframe
            className="FyStudio-frame"
            id="FyPreviewFrame"
            title={tt('studio.preview')}
            src={this.previewUrl()}
            style={{ width: DEVICE_WIDTHS[this.device] }}
            oncreate={(vnode: Mithril.VnodeDOM) => {
              this.frame = vnode.dom as HTMLIFrameElement;
              this.frame.addEventListener('load', () => this.refreshPreview());
            }}
          />
        </div>
      </div>
    );
  }
}
