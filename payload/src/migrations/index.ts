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
import * as migration_20261101_210000_clear_legacy_word_meta from './20261101_210000_clear_legacy_word_meta';
import * as migration_20261101_234120_mcp_api_keys from './20261101_234120_mcp_api_keys';
import * as migration_20261103_130124_suggestions_similar_words from './20261103_130124_suggestions_similar_words';
import * as migration_20261103_163400_word_feedback from './20261103_163400_word_feedback';
import * as migration_20261105_112655_word_stats from './20261105_112655_word_stats';
import * as migration_20261106_142557_retention_task from './20261106_142557_retention_task';
import * as migration_20261106_150000_hash_visitor_ids from './20261106_150000_hash_visitor_ids';
import * as migration_20261106_165028_feedback_visitor_nullable from './20261106_165028_feedback_visitor_nullable';
import * as migration_20261110_212112_bon_games from './20261110_212112_bon_games';
import * as migration_20261110_215311_bon_players from './20261110_215311_bon_players';
import * as migration_20261111_165631_bon_name_reports from './20261111_165631_bon_name_reports';

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
    up: migration_20261101_210000_clear_legacy_word_meta.up,
    down: migration_20261101_210000_clear_legacy_word_meta.down,
    name: '20261101_210000_clear_legacy_word_meta',
  },
  {
    up: migration_20261101_234120_mcp_api_keys.up,
    down: migration_20261101_234120_mcp_api_keys.down,
    name: '20261101_234120_mcp_api_keys',
  },
  {
    up: migration_20261103_130124_suggestions_similar_words.up,
    down: migration_20261103_130124_suggestions_similar_words.down,
    name: '20261103_130124_suggestions_similar_words',
  },
  {
    up: migration_20261103_163400_word_feedback.up,
    down: migration_20261103_163400_word_feedback.down,
    name: '20261103_163400_word_feedback',
  },
  {
    up: migration_20261105_112655_word_stats.up,
    down: migration_20261105_112655_word_stats.down,
    name: '20261105_112655_word_stats',
  },
  {
    up: migration_20261106_142557_retention_task.up,
    down: migration_20261106_142557_retention_task.down,
    name: '20261106_142557_retention_task',
  },
  {
    up: migration_20261106_150000_hash_visitor_ids.up,
    down: migration_20261106_150000_hash_visitor_ids.down,
    name: '20261106_150000_hash_visitor_ids',
  },
  {
    up: migration_20261106_165028_feedback_visitor_nullable.up,
    down: migration_20261106_165028_feedback_visitor_nullable.down,
    name: '20261106_165028_feedback_visitor_nullable',
  },
  {
    up: migration_20261110_212112_bon_games.up,
    down: migration_20261110_212112_bon_games.down,
    name: '20261110_212112_bon_games',
  },
  {
    up: migration_20261110_215311_bon_players.up,
    down: migration_20261110_215311_bon_players.down,
    name: '20261110_215311_bon_players',
  },
  {
    up: migration_20261111_165631_bon_name_reports.up,
    down: migration_20261111_165631_bon_name_reports.down,
    name: '20261111_165631_bon_name_reports'
  },
];
