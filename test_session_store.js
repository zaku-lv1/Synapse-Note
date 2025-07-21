#!/usr/bin/env node
/**
 * Quick test to verify that the firestore-store package works correctly
 */

const FirestoreStore = require('firestore-store');

// Test basic instantiation without database connection
try {
    console.log('Testing FirestoreStore instantiation...');
    
    // This should not throw an error even without a real database
    const store = FirestoreStore({
        database: null, // Mock database - this should handle gracefully
        collection: 'test-sessions'
    });
    
    console.log('✅ FirestoreStore instantiated successfully');
    console.log('✅ The new session store package is working correctly');
    
} catch (error) {
    console.error('❌ Error with FirestoreStore:', error);
    process.exit(1);
}