/**
 * Custom Firestore Session Store for Express Session
 * A simple, reliable implementation for cloud deployment
 */
const { Store } = require('express-session');

class FirestoreSessionStore extends Store {
    constructor(options = {}) {
        super(options);
        this.db = options.database;
        this.collection = options.collection || 'sessions';
        this.ttl = options.ttl || 86400; // 24 hours in seconds
        
        if (!this.db) {
            throw new Error('Firestore database is required for session store');
        }
    }

    /**
     * Get session data from Firestore
     */
    async get(sessionId, callback) {
        try {
            const doc = await this.db.collection(this.collection).doc(sessionId).get();
            
            if (!doc.exists) {
                return callback(null, null);
            }
            
            const data = doc.data();
            
            // Check if session has expired
            if (data.expires && new Date(data.expires.toDate()) < new Date()) {
                await this.destroy(sessionId, callback);
                return callback(null, null);
            }
            
            callback(null, data.session);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * Save session data to Firestore
     */
    async set(sessionId, session, callback) {
        try {
            const expires = session.cookie && session.cookie.expires ? 
                new Date(session.cookie.expires) : 
                new Date(Date.now() + this.ttl * 1000);

            await this.db.collection(this.collection).doc(sessionId).set({
                session,
                expires,
                updatedAt: new Date()
            });
            
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * Delete session from Firestore
     */
    async destroy(sessionId, callback) {
        try {
            await this.db.collection(this.collection).doc(sessionId).delete();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * Touch session to update expiration
     */
    async touch(sessionId, session, callback) {
        try {
            const expires = session.cookie && session.cookie.expires ? 
                new Date(session.cookie.expires) : 
                new Date(Date.now() + this.ttl * 1000);

            await this.db.collection(this.collection).doc(sessionId).update({
                expires,
                updatedAt: new Date()
            });
            
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * Clear all sessions (optional implementation)
     */
    async clear(callback) {
        try {
            const batch = this.db.batch();
            const snapshot = await this.db.collection(this.collection).get();
            
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    /**
     * Get the count of sessions (optional implementation)
     */
    async length(callback) {
        try {
            const snapshot = await this.db.collection(this.collection).get();
            callback(null, snapshot.size);
        } catch (error) {
            callback(error);
        }
    }
}

module.exports = FirestoreSessionStore;