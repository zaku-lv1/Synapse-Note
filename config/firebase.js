/**
 * Firebase configuration with mock data fallback
 * 
 * This module provides a unified interface for database operations
 * with automatic fallback to mock data when Firebase is not available.
 */

const admin = require('firebase-admin');

// Mock data for development/testing when Firebase is not available
const mockData = {
    tournaments: [
        {
            id: 'tournament-1',
            name: 'Spring Championship 2024',
            status: 'active',
            participantCount: 32,
            createdAt: new Date('2024-03-01'),
            matches: [
                { id: 'match-1', player1: 'Player A', player2: 'Player B', result: '2-1' },
                { id: 'match-2', player1: 'Player C', player2: 'Player D', result: '1-2' }
            ]
        },
        {
            id: 'tournament-2', 
            name: 'Summer League 2024',
            status: 'completed',
            participantCount: 24,
            createdAt: new Date('2024-06-01'),
            matches: [
                { id: 'match-3', player1: 'Player E', player2: 'Player F', result: '3-0' },
                { id: 'match-4', player1: 'Player G', player2: 'Player H', result: '0-3' }
            ]
        }
    ],
    matches: [
        { id: 'match-1', tournamentId: 'tournament-1', player1: 'Player A', player2: 'Player B', result: '2-1', status: 'completed' },
        { id: 'match-2', tournamentId: 'tournament-1', player1: 'Player C', player2: 'Player D', result: '1-2', status: 'completed' },
        { id: 'match-3', tournamentId: 'tournament-2', player1: 'Player E', player2: 'Player F', result: '3-0', status: 'completed' },
        { id: 'match-4', tournamentId: 'tournament-2', player1: 'Player G', player2: 'Player H', result: '0-3', status: 'completed' }
    ],
    users: [
        {
            id: 'dev-admin',
            username: 'Development Admin',
            handle: 'dev-admin',
            isAdmin: true,
            createdAt: new Date('2024-01-01'),
            lastActivityAt: new Date()
        },
        {
            id: 'test-user-1',
            username: 'Test User 1',
            handle: 'testuser1',
            isAdmin: false,
            createdAt: new Date('2024-02-01'),
            lastActivityAt: new Date()
        }
    ],
    quizzes: [
        {
            id: 'quiz-1',
            title: 'Sample Quiz 1',
            description: 'A sample quiz for testing',
            visibility: 'public',
            ownerId: 'dev-admin',
            createdAt: new Date('2024-01-15'),
            questions: [
                { question: 'What is 2+2?', answer: '4' },
                { question: 'What is the capital of Japan?', answer: 'Tokyo' }
            ]
        },
        {
            id: 'quiz-2',
            title: 'Sample Quiz 2',
            description: 'Another sample quiz',
            visibility: 'private',
            ownerId: 'test-user-1',
            createdAt: new Date('2024-02-15'),
            questions: [
                { question: 'What is 3+3?', answer: '6' }
            ]
        }
    ],
    quiz_attempts: [
        {
            id: 'attempt-1',
            userId: 'test-user-1',
            quizId: 'quiz-1',
            quizTitle: 'Sample Quiz 1',
            score: 85,
            totalQuestions: 2,
            correctAnswers: 1,
            attemptedAt: new Date('2024-03-01'),
            completedAt: new Date('2024-03-01')
        }
    ],
    system_settings: [
        {
            id: 'general',
            allowRegistration: true,
            maintenanceMode: false,
            registrationMessage: '',
            autoCleanupEnabled: false,
            updatedAt: new Date(),
            updatedBy: 'dev-admin'
        }
    ]
};

// Mock Firestore-like interface
class MockCollection {
    constructor(collectionName, data) {
        this.collectionName = collectionName;
        this.data = data || [];
    }

    // Get all documents in collection
    async get() {
        console.log(`Mock: Getting all documents from ${this.collectionName}`);
        const docs = this.data.map(item => ({
            id: item.id,
            exists: true,
            data: () => ({ ...item })
        }));
        
        return {
            docs: docs,
            size: docs.length,
            empty: docs.length === 0
        };
    }

    // Get document by ID
    doc(id) {
        return new MockDocument(this.collectionName, id, this.data);
    }

    // Where query (simplified)
    where(field, operator, value) {
        const filteredData = this.data.filter(item => {
            if (operator === '==') {
                return item[field] === value;
            } else if (operator === '!=') {
                return item[field] !== value;
            } else if (operator === '>') {
                return item[field] > value;
            } else if (operator === '<=') {
                return item[field] <= value;
            }
            return true;
        });

        return new MockCollection(this.collectionName, filteredData);
    }

    // Order by (simplified)
    orderBy(field, direction = 'asc') {
        const sortedData = [...this.data].sort((a, b) => {
            if (direction === 'desc') {
                return a[field] > b[field] ? -1 : 1;
            } else {
                return a[field] < b[field] ? -1 : 1;
            }
        });

        return new MockCollection(this.collectionName, sortedData);
    }

    // Limit results
    limit(count) {
        const limitedData = this.data.slice(0, count);
        return new MockCollection(this.collectionName, limitedData);
    }
}

class MockDocument {
    constructor(collectionName, id, collectionData) {
        this.collectionName = collectionName;
        this.id = id;
        this.collectionData = collectionData;
    }

    async get() {
        console.log(`Mock: Getting document ${this.id} from ${this.collectionName}`);
        const item = this.collectionData.find(item => item.id === this.id);
        
        if (item) {
            return {
                id: this.id,
                exists: true,
                data: () => ({ ...item })
            };
        } else {
            return {
                id: this.id,
                exists: false,
                data: () => null
            };
        }
    }

    async set(data, options = {}) {
        console.log(`Mock: Setting document ${this.id} in ${this.collectionName}`, data);
        const existingIndex = this.collectionData.findIndex(item => item.id === this.id);
        
        if (existingIndex >= 0) {
            if (options.merge) {
                this.collectionData[existingIndex] = { ...this.collectionData[existingIndex], ...data };
            } else {
                this.collectionData[existingIndex] = { id: this.id, ...data };
            }
        } else {
            this.collectionData.push({ id: this.id, ...data });
        }
        
        return Promise.resolve();
    }

    async update(data) {
        console.log(`Mock: Updating document ${this.id} in ${this.collectionName}`, data);
        const existingIndex = this.collectionData.findIndex(item => item.id === this.id);
        
        if (existingIndex >= 0) {
            this.collectionData[existingIndex] = { ...this.collectionData[existingIndex], ...data };
        }
        
        return Promise.resolve();
    }

    async delete() {
        console.log(`Mock: Deleting document ${this.id} from ${this.collectionName}`);
        const existingIndex = this.collectionData.findIndex(item => item.id === this.id);
        
        if (existingIndex >= 0) {
            this.collectionData.splice(existingIndex, 1);
        }
        
        return Promise.resolve();
    }
}

class MockFirestore {
    constructor() {
        this.mockData = mockData;
        console.log('Initialized MockFirestore with collections:', Object.keys(mockData));
    }

    collection(collectionName) {
        console.log(`Mock: Accessing collection ${collectionName}`);
        
        // Ensure the collection exists in mockData
        if (!this.mockData[collectionName]) {
            console.warn(`Collection ${collectionName} not found in mock data, creating empty collection`);
            this.mockData[collectionName] = [];
        }
        
        // Ensure the data is iterable (array)
        if (!Array.isArray(this.mockData[collectionName])) {
            console.error(`Collection ${collectionName} is not iterable:`, this.mockData[collectionName]);
            throw new TypeError(`mockData[${collectionName}] is not iterable`);
        }
        
        return new MockCollection(collectionName, this.mockData[collectionName]);
    }

    // Mock batch operations
    batch() {
        return {
            delete: (docRef) => {
                console.log('Mock batch: delete operation queued');
            },
            commit: async () => {
                console.log('Mock batch: commit operations');
                return Promise.resolve();
            }
        };
    }
}

// Firebase configuration export
module.exports = {
    // Get database instance (real Firebase or mock)
    get: function(collectionName) {
        try {
            // Try to get real Firebase instance
            const db = admin.firestore();
            return db.collection(collectionName);
        } catch (error) {
            console.log('Firebase not available, using mock data for collection:', collectionName);
            
            // Use mock data
            const mockDb = new MockFirestore();
            return mockDb.collection(collectionName);
        }
    },

    // Get the database instance directly
    getDb: function() {
        try {
            return admin.firestore();
        } catch (error) {
            console.log('Firebase not available, returning mock database');
            return new MockFirestore();
        }
    },

    // Check if real Firebase is available
    isFirebaseAvailable: function() {
        try {
            admin.firestore();
            return true;
        } catch (error) {
            return false;
        }
    }
};