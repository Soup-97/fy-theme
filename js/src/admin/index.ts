import app from 'flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('soup-97-fy-theme', () => {
  // Registration happens through the Admin extender in ./extend.
});
