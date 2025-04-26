
import * as SQLite from 'expo-sqlite';

// Solução compatível com Bridgeless
const openDatabase = () => {
  if (!SQLite.openDatabase) {
    console.warn('SQLite.openDatabase não disponível - usando mock para web');
    return {
      transaction: () => ({
        executeSql: () => ({ rowsAffected: 0, insertId: undefined, rows: { _array: [] } }),
      }),
    };
  }
  return SQLite.openDatabase('denuncias.db');
};

const db = openDatabase();

// Restante do seu código permanece igual...
export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );`
    );
    
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT,
        date TEXT NOT NULL,
        isAnonymous BOOLEAN DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users (id)
      );`
    );
  });
};

export const executeSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export default db;