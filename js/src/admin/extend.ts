import Extend from 'flarum/common/extenders';
import type { CustomExtensionPage } from 'flarum/admin/utils/AdminRegistry';
import ThemeStudioPage from './components/ThemeStudioPage';

export default [new Extend.Admin().page(ThemeStudioPage as unknown as CustomExtensionPage)];
