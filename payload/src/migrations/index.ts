import * as migration_20261016_141727_initial from './20261016_141727_initial';
import * as migration_20261016_171825_media_description_rich_text from './20261016_171825_media_description_rich_text';
import * as migration_20261016_232524_seo_plugin_meta from './20261016_232524_seo_plugin_meta';
import * as migration_20261017_095811_suggestions from './20261017_095811_suggestions';
import * as migration_20261017_100125_redirects from './20261017_100125_redirects';

export const migrations = [
  {
    up: migration_20261016_141727_initial.up,
    down: migration_20261016_141727_initial.down,
    name: '20261016_141727_initial',
  },
  {
    up: migration_20261016_171825_media_description_rich_text.up,
    down: migration_20261016_171825_media_description_rich_text.down,
    name: '20261016_171825_media_description_rich_text',
  },
  {
    up: migration_20261016_232524_seo_plugin_meta.up,
    down: migration_20261016_232524_seo_plugin_meta.down,
    name: '20261016_232524_seo_plugin_meta',
  },
  {
    up: migration_20261017_095811_suggestions.up,
    down: migration_20261017_095811_suggestions.down,
    name: '20261017_095811_suggestions',
  },
  {
    up: migration_20261017_100125_redirects.up,
    down: migration_20261017_100125_redirects.down,
    name: '20261017_100125_redirects'
  },
];
