/**
 * Database Service - Unified interface for Firebase Firestore and SQLite
 * Provides fallback to SQLite when Firebase is not available
 */

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor() {
        this.firebaseDb = null;
        this.sqliteDb = null;
        this.usingFirebase = false;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Try to initialize Firebase first
        try {
            this.firebaseDb = admin.firestore();
            // Test Firebase connection
            await this.firebaseDb.collection('_health_check').limit(1).get();
            this.usingFirebase = true;
            console.log('DatabaseService: Using Firebase Firestore');
        } catch (error) {
            console.log('DatabaseService: Firebase not available, falling back to SQLite');
            await this.initializeSQLite();
        }

        this.initialized = true;
    }

    async initializeSQLite() {
        const dbPath = path.join(__dirname, '../data/synapse.db');
        
        // Ensure data directory exists
        const fs = require('fs');
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.sqliteDb = new sqlite3.Database(dbPath);
        
        // Create tables if they don't exist
        await this.createSQLiteTables();
        console.log('DatabaseService: SQLite initialized');
    }

    async createSQLiteTables() {
        return new Promise((resolve, reject) => {
            this.sqliteDb.serialize(() => {
                // Users table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        username TEXT,
                        handle TEXT UNIQUE,
                        password TEXT,
                        isAdmin BOOLEAN DEFAULT 0,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        lastActivityAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Quizzes table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS quizzes (
                        id TEXT PRIMARY KEY,
                        title TEXT,
                        description TEXT,
                        ownerId TEXT,
                        creatorId TEXT,
                        visibility TEXT DEFAULT 'private',
                        questions TEXT, -- JSON string
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ownerId) REFERENCES users(id),
                        FOREIGN KEY (creatorId) REFERENCES users(id)
                    )
                `);

                // Quiz attempts table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS quiz_attempts (
                        id TEXT PRIMARY KEY,
                        userId TEXT,
                        quizId TEXT,
                        answers TEXT, -- JSON string
                        score INTEGER,
                        totalQuestions INTEGER,
                        completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (userId) REFERENCES users(id),
                        FOREIGN KEY (quizId) REFERENCES quizzes(id)
                    )
                `);

                // Tournaments table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS tournaments (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        organizerId TEXT,
                        status TEXT DEFAULT 'upcoming', -- upcoming, active, completed, cancelled
                        startDate DATETIME,
                        endDate DATETIME,
                        maxParticipants INTEGER,
                        entryFee INTEGER DEFAULT 0,
                        prizePool TEXT, -- JSON string for prize distribution
                        rules TEXT, -- JSON string for tournament rules
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (organizerId) REFERENCES users(id)
                    )
                `);

                // Tournament participants table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS tournament_participants (
                        id TEXT PRIMARY KEY,
                        tournamentId TEXT,
                        userId TEXT,
                        registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        status TEXT DEFAULT 'registered', -- registered, active, eliminated, winner
                        FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
                        FOREIGN KEY (userId) REFERENCES users(id),
                        UNIQUE(tournamentId, userId)
                    )
                `);

                // Matches table (for tournament matches)
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS matches (
                        id TEXT PRIMARY KEY,
                        tournamentId TEXT,
                        round INTEGER,
                        matchNumber INTEGER,
                        participant1Id TEXT,
                        participant2Id TEXT,
                        winnerId TEXT,
                        quizId TEXT,
                        status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
                        scheduledAt DATETIME,
                        startedAt DATETIME,
                        completedAt DATETIME,
                        scores TEXT, -- JSON string for detailed scores
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (tournamentId) REFERENCES tournaments(id),
                        FOREIGN KEY (participant1Id) REFERENCES users(id),
                        FOREIGN KEY (participant2Id) REFERENCES users(id),
                        FOREIGN KEY (winnerId) REFERENCES users(id),
                        FOREIGN KEY (quizId) REFERENCES quizzes(id)
                    )
                `);

                // System settings table
                this.sqliteDb.run(`
                    CREATE TABLE IF NOT EXISTS system_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT, -- JSON string
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    // Unified interface methods
    async getCollection(collectionName) {
        await this.initialize();
        
        if (this.usingFirebase) {
            return this.firebaseDb.collection(collectionName);
        } else {
            // Return a mock collection interface for SQLite
            return new SQLiteCollection(this.sqliteDb, collectionName);
        }
    }

    async getDocument(collectionName, docId) {
        await this.initialize();
        
        if (this.usingFirebase) {
            return this.firebaseDb.collection(collectionName).doc(docId);
        } else {
            return new SQLiteDocument(this.sqliteDb, collectionName, docId);
        }
    }

    isUsingFirebase() {
        return this.usingFirebase;
    }
}

// SQLite wrapper classes to mimic Firestore interface
class SQLiteCollection {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }

    doc(id) {
        return new SQLiteDocument(this.db, this.tableName, id);
    }

    async add(data) {
        const id = this.generateId();
        const doc = this.doc(id);
        await doc.set(data);
        return { id };
    }

    async get() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM ${this.tableName}`, (err, rows) => {
                if (err) reject(err);
                else {
                    const docs = rows.map(row => new SQLiteDocumentSnapshot(row, this.tableName));
                    resolve({ docs, empty: rows.length === 0 });
                }
            });
        });
    }

    where(field, operator, value) {
        return new SQLiteQuery(this.db, this.tableName, { field, operator, value });
    }

    orderBy(field, direction = 'asc') {
        return new SQLiteQuery(this.db, this.tableName, null, { field, direction });
    }

    limit(count) {
        return new SQLiteQuery(this.db, this.tableName, null, null, count);
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

class SQLiteDocument {
    constructor(db, tableName, docId) {
        this.db = db;
        this.tableName = tableName;
        this.id = docId;
    }

    async get() {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [this.id], (err, row) => {
                if (err) reject(err);
                else {
                    const exists = !!row;
                    resolve({
                        exists,
                        data: () => exists ? this.parseRowData(row) : null,
                        id: this.id
                    });
                }
            });
        });
    }

    async set(data) {
        const columns = Object.keys(data).concat(['id']);
        const values = Object.values(data).concat([this.id]);
        const placeholders = columns.map(() => '?').join(', ');
        
        return new Promise((resolve, reject) => {
            const serializedData = this.serializeData(data);
            const allValues = Object.values(serializedData).concat([this.id]);
            
            this.db.run(
                `INSERT OR REPLACE INTO ${this.tableName} (${Object.keys(serializedData).concat(['id']).join(', ')}) VALUES (${placeholders})`,
                allValues,
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async update(data) {
        const serializedData = this.serializeData(data);
        const setClause = Object.keys(serializedData).map(key => `${key} = ?`).join(', ');
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE ${this.tableName} SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
                [...Object.values(serializedData), this.id],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async delete() {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [this.id], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    serializeData(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
                result[key] = JSON.stringify(value);
            } else if (value instanceof Date) {
                result[key] = value.toISOString();
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    parseRowData(row) {
        const result = { ...row };
        // Try to parse JSON fields
        const jsonFields = ['questions', 'answers', 'prizePool', 'rules', 'scores'];
        jsonFields.forEach(field => {
            if (result[field] && typeof result[field] === 'string') {
                try {
                    result[field] = JSON.parse(result[field]);
                } catch (e) {
                    // Keep as string if not valid JSON
                }
            }
        });
        
        // Parse dates
        const dateFields = ['createdAt', 'updatedAt', 'startDate', 'endDate', 'scheduledAt', 'startedAt', 'completedAt', 'registeredAt'];
        dateFields.forEach(field => {
            if (result[field] && typeof result[field] === 'string') {
                result[field] = new Date(result[field]);
            }
        });
        
        return result;
    }
}

class SQLiteDocumentSnapshot {
    constructor(data, tableName) {
        this._data = data;
        this.tableName = tableName;
        this.id = data.id;
        this.exists = true;
    }

    data() {
        const doc = new SQLiteDocument(null, this.tableName, this.id);
        return doc.parseRowData(this._data);
    }
}

class SQLiteQuery {
    constructor(db, tableName, whereClause, orderClause, limitCount) {
        this.db = db;
        this.tableName = tableName;
        this.whereClause = whereClause;
        this.orderClause = orderClause;
        this.limitCount = limitCount;
    }

    where(field, operator, value) {
        return new SQLiteQuery(this.db, this.tableName, { field, operator, value }, this.orderClause, this.limitCount);
    }

    orderBy(field, direction = 'asc') {
        return new SQLiteQuery(this.db, this.tableName, this.whereClause, { field, direction }, this.limitCount);
    }

    limit(count) {
        return new SQLiteQuery(this.db, this.tableName, this.whereClause, this.orderClause, count);
    }

    async get() {
        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];

        if (this.whereClause) {
            const { field, operator, value } = this.whereClause;
            let sqlOperator = operator;
            if (operator === '==') sqlOperator = '=';
            query += ` WHERE ${field} ${sqlOperator} ?`;
            params.push(value);
        }

        if (this.orderClause) {
            query += ` ORDER BY ${this.orderClause.field} ${this.orderClause.direction.toUpperCase()}`;
        }

        if (this.limitCount) {
            query += ` LIMIT ${this.limitCount}`;
        }

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else {
                    const docs = rows.map(row => new SQLiteDocumentSnapshot(row, this.tableName));
                    resolve({ docs, empty: rows.length === 0 });
                }
            });
        });
    }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;