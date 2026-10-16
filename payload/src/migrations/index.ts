import * as migration_20261016_141727_initial from './20261016_141727_initial';

export const migrations = [
  {
    up: migration_20261016_141727_initial.up,
    down: migration_20261016_141727_initial.down,
    name: '20261016_141727_initial'
  },
];
