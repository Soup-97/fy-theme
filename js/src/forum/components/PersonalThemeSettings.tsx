import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Select from 'flarum/common/components/Select';
import Button from 'flarum/common/components/Button';
import type Mithril from 'mithril';
import { applyThemeInline, option } from '../../common/theme';
import { forumConfig, userConfig } from '../config';

const SWATCHES = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b'];

/**
 * Lets members personalize the theme, within what the admin allows.
 */
export default class PersonalThemeSettings extends Component {
  saving = false;

  pref(key: string): any {
    return (app.session.user!.preferences() as Record<string, unknown>)?.[key] ?? null;
  }

  save(prefs: Record<string, unknown>) {
    this.saving = true;

    app.session
      .user!.savePreferences(prefs)
      .then(() => applyThemeInline(document, userConfig()))
      .finally(() => {
        this.saving = false;
        m.redraw();
      });
  }

  view(): Mithril.Children {
    const config = forumConfig();
    const t = (key: string) => app.translator.trans(`fy-theme.forum.settings.${key}`);

    return (
      <div className="FyUserSettings">
        {config.userAccent ? (
          <div className="Form-group">
            <label>{t('accent_label')}</label>
            <div className="FyUserSettings-swatches">
              <button
                type="button"
                className={'FyUserSettings-swatch FyUserSettings-swatch--reset' + (!this.pref('fyAccent') ? ' active' : '')}
                title={app.translator.trans('fy-theme.forum.settings.forum_default', {}, true)}
                disabled={this.saving}
                onclick={() => this.save({ fyAccent: null })}
              />
              {SWATCHES.map((color) => (
                <button
                  type="button"
                  className={'FyUserSettings-swatch' + (this.pref('fyAccent') === color ? ' active' : '')}
                  style={{ background: color }}
                  title={color}
                  disabled={this.saving}
                  onclick={() => this.save({ fyAccent: color })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {config.userDensity ? (
          <div className="Form-group">
            <label>{t('density_label')}</label>
            <Select
              value={this.pref('fyDensity') || ''}
              options={{ '': app.translator.trans('fy-theme.forum.settings.forum_default', {}, true), ...option('density')!.choices }}
              disabled={this.saving}
              onchange={(value: string) => this.save({ fyDensity: value || null })}
            />
          </div>
        ) : null}

        {config.userFontScale ? (
          <div className="Form-group">
            <label>
              {t('font_scale_label')} <strong>{this.pref('fyFontScale') ?? config.fontScale}%</strong>
            </label>
            <input
              type="range"
              className="FormControl"
              min={option('fontScale')!.min}
              max={option('fontScale')!.max}
              step={5}
              value={this.pref('fyFontScale') ?? config.fontScale}
              disabled={this.saving}
              onchange={(e: Event) => this.save({ fyFontScale: parseInt((e.target as HTMLInputElement).value, 10) })}
            />
            {this.pref('fyFontScale') !== null ? (
              <Button className="Button Button--link" onclick={() => this.save({ fyFontScale: null })}>
                {t('reset')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
}
