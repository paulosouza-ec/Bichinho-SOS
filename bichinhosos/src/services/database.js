import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('denuncias.db');

export const initDB = () => {
  db.transaction(tx => {
    // Tabela de usuários
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );`
    );
    
    // Tabela de denúncias
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