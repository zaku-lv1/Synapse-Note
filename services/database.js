/**
 * Database utilities for Firebase cloud deployment
 * Provides guaranteed database access since Firebase is always initialized
 */

const admin = require('firebase-admin');

/**
 * Get Firestore database instance
 * Since we now require Firebase in cloud deployment, this will always return a valid database
 */
function getDb() {
    return admin.firestore();
}

/**
 * Middleware to ensure database is available for request
 * This is now a no-op since we guarantee Firebase initialization
 */
function requireDb(req, res, next) {
    try {
        req.db = getDb();
        next();
    } catch (error) {
        console.error('Database access error:', error);
        res.status(500).render('error', {
            title: 'データベースエラー - Database Error',
            message: 'データベースに接続できません。しばらく後にお試しください。',
            user: req.session?.user || null
        });
    }
}

module.exports = {
    getDb,
    requireDb
};