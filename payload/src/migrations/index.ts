import * as migration_20261016_141727_initial from './20261016_141727_initial';
import * as migration_20261016_171825_media_description_rich_text from './20261016_171825_media_description_rich_text';
import * as migration_20261016_232524_seo_plugin_meta from './20261016_232524_seo_plugin_meta';
import * as migration_20261017_095811_suggestions from './20261017_095811_suggestions';
import * as migration_20261017_100125_redirects from './20261017_100125_redirects';
import * as migration_20261017_100905_drop_berliner_word_id from './20261017_100905_drop_berliner_word_id';
import * as migration_20261017_101928_company_platforms_wallets from './20261017_101928_company_platforms_wallets';
import * as migration_20261017_103801_seo_drop_og_twitter from './20261017_103801_seo_drop_og_twitter';

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
    name: '20261017_100125_redirects',
  },
  {
    up: migration_20261017_100905_drop_berliner_word_id.up,
    down: migration_20261017_100905_drop_berliner_word_id.down,
    name: '20261017_100905_drop_berliner_word_id',
  },
  {
    up: migration_20261017_101928_company_platforms_wallets.up,
    down: migration_20261017_101928_company_platforms_wallets.down,
    name: '20261017_101928_company_platforms_wallets',
  },
  {
    up: migration_20261017_103801_seo_drop_og_twitter.up,
    down: migration_20261017_103801_seo_drop_og_twitter.down,
    name: '20261017_103801_seo_drop_og_twitter'
  },
];
