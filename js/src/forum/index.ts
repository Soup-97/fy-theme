import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import FieldSet from 'flarum/common/components/FieldSet';
import type ItemList from 'flarum/common/utils/ItemList';
import type Mithril from 'mithril';
import Announcement from './components/Announcement';
import ThemeFooter from './components/ThemeFooter';
import ScrollWidgets from './components/ScrollWidgets';
import PersonalThemeSettings from './components/PersonalThemeSettings';
import { forumConfig, personalizationEnabled } from './config';

app.initializers.add('soup-97-fy-theme', () => {
  extend('flarum/forum/components/Notices', 'items', function (items: ItemList<Mithril.Children>) {
    items.add('fyAnnouncement', m(Announcement, { config: forumConfig() }), 200);
  });

  // Core mounts an empty Footer component into #footer; it's ours to fill.
  override('flarum/forum/components/Footer', 'view', function () {
    const config = forumConfig();

    return [m(ThemeFooter, { config }), m(ScrollWidgets, { config })];
  });

  extend('flarum/forum/components/SettingsPage', 'settingsItems', function (items: ItemList<Mithril.Children>) {
    if (!personalizationEnabled()) return;

    items.add(
      'fyTheme',
      m(
        FieldSet,
        { className: 'Settings-fyTheme FieldSet--min', label: app.translator.trans('fy-theme.forum.settings.heading', {}, true) },
        m(PersonalThemeSettings)
      ),
      5
    );
  });
});
