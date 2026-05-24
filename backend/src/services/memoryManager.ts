import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { logger } from '../utils/logger';

// Store the db locally inside backend
const dbPath = path.resolve(__dirname, '../../memory.db');

export class MemoryManager {
  private static db: any;

  static async init() {
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_input TEXT NOT EXISTS,
        context TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('MemoryManager initialized (Mem0 style)');
  }

  static async saveContext(input: string, context: string) {
    if (!this.db) await this.init();
    await this.db.run('INSERT INTO memories (user_input, context) VALUES (?, ?)', [input, context]);
  }

  static async fetchRecentContexts(limit = 5) {
    if (!this.db) await this.init();
    return await this.db.all('SELECT * FROM memories ORDER BY timestamp DESC LIMIT ?', [limit]);
  }
}
