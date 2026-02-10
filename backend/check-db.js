import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "spotting.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users Table
  db.all("SELECT * FROM users", (error, rows) => {
    error ? console.error(error.message) : console.table(rows);
  });

  // Aircraft Table
  db.all("SELECT * FROM aircraft", (error, rows) => {
    error ? console.error(error.message) : console.table(rows);
  });

  // Logs Table
  db.all("SELECT * FROM logs", (error, rows) => {
    error ? console.error(error.message) : console.table(rows);
  });
});
