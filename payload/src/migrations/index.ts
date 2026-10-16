import * as migration_20261016_134609_initial from './20261016_134609_initial';

export const migrations = [
  {
    up: migration_20261016_134609_initial.up,
    down: migration_20261016_134609_initial.down,
    name: '20261016_134609_initial'
  },
];
