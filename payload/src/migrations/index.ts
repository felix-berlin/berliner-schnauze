import * as migration_20261016_141727_initial from './20261016_141727_initial';
import * as migration_20261016_171825_media_description_rich_text from './20261016_171825_media_description_rich_text';

export const migrations = [
  {
    up: migration_20261016_141727_initial.up,
    down: migration_20261016_141727_initial.down,
    name: '20261016_141727_initial',
  },
  {
    up: migration_20261016_171825_media_description_rich_text.up,
    down: migration_20261016_171825_media_description_rich_text.down,
    name: '20261016_171825_media_description_rich_text'
  },
];
