import * as migration_20261016_141727_initial from './20261016_141727_initial';
import * as migration_20261016_171825_media_description_rich_text from './20261016_171825_media_description_rich_text';
import * as migration_20261016_232524_seo_plugin_meta from './20261016_232524_seo_plugin_meta';
import * as migration_20261017_095811_suggestions from './20261017_095811_suggestions';
import * as migration_20261017_100125_redirects from './20261017_100125_redirects';
import * as migration_20261017_100905_drop_berliner_word_id from './20261017_100905_drop_berliner_word_id';
import * as migration_20261017_101928_company_platforms_wallets from './20261017_101928_company_platforms_wallets';
import * as migration_20261017_103801_seo_drop_og_twitter from './20261017_103801_seo_drop_og_twitter';
import * as migration_20261017_104452_schedule_publish_posts from './20261017_104452_schedule_publish_posts';
import * as migration_20261017_104729_pages_versions from './20261017_104729_pages_versions';
import * as migration_20261017_105011_content_globals from './20261017_105011_content_globals';
import * as migration_20261020_191940_drop_wp_id from './20261020_191940_drop_wp_id';
import * as migration_20261031_154929_word_comments from './20261031_154929_word_comments';
import * as migration_20261031_170133_comment_pseudonyms from './20261031_170133_comment_pseudonyms';
import * as migration_20261101_234120_mcp_api_keys from './20261101_234120_mcp_api_keys';

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
    name: '20261017_103801_seo_drop_og_twitter',
  },
  {
    up: migration_20261017_104452_schedule_publish_posts.up,
    down: migration_20261017_104452_schedule_publish_posts.down,
    name: '20261017_104452_schedule_publish_posts',
  },
  {
    up: migration_20261017_104729_pages_versions.up,
    down: migration_20261017_104729_pages_versions.down,
    name: '20261017_104729_pages_versions',
  },
  {
    up: migration_20261017_105011_content_globals.up,
    down: migration_20261017_105011_content_globals.down,
    name: '20261017_105011_content_globals',
  },
  {
    up: migration_20261020_191940_drop_wp_id.up,
    down: migration_20261020_191940_drop_wp_id.down,
    name: '20261020_191940_drop_wp_id',
  },
  {
    up: migration_20261031_154929_word_comments.up,
    down: migration_20261031_154929_word_comments.down,
    name: '20261031_154929_word_comments',
  },
  {
    up: migration_20261031_170133_comment_pseudonyms.up,
    down: migration_20261031_170133_comment_pseudonyms.down,
    name: '20261031_170133_comment_pseudonyms',
  },
  {
    up: migration_20261101_234120_mcp_api_keys.up,
    down: migration_20261101_234120_mcp_api_keys.down,
    name: '20261101_234120_mcp_api_keys'
  },
];
