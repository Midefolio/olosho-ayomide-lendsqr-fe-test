// dexieDB.ts
import Dexie, { type Table } from 'dexie';

class secureDeal extends Dexie {
  cached_data!: Table<any[], string>;

  constructor() {
    super('landsqr_mock_db');
    this.version(1).stores({
        cached_data: '' // No index needed for key-value
    });
  }
}

export const db = new secureDeal();
