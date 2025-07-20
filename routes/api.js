/**
 * api.js - API routes for IdentityV Match
 * 
 * Public APIs (no authentication):
 * - GET /api/public/stats - System statistics
 * - GET /api/public/users/count - User count
 * - GET /api/public/quizzes/count - Quiz count
 * 
 * User APIs (authentication required):
 * - GET /api/user/profile - Current user profile
 * - GET /api/user/quizzes - Current user's quizzes
 * - GET /api/user/history - Current user's quiz history
 * - GET /api/user/stats - Current user's statistics
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const GoogleAppsScriptService = require('../services/googleAppsScriptService');

// Firestore データベースインスタンス (lazy initialization)
function getDb() {
    try {
        return admin.firestore();
    } catch (error) {
        console.error('Firebase not initialized:', error.message);
        return null;
    }
}

// Google Apps Script service instance
const gasService = new GoogleAppsScriptService();

// --- ミドルウェア ---

// API レスポンス用のエラーハンドラー
function handleApiError(res, error, message = 'Internal server error') {
    console.error('API Error:', error);
    res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    });
}

// データベース接続チェック
function requireDatabase(req, res, next) {
    const db = getDb();
    if (!db) {
        return res.status(503).json({
            success: false,
            error: 'Database not available',
            timestamp: new Date().toISOString()
        });
    }
    req.db = db;
    next();
}

// 認証が必要なエンドポイント用ミドルウェア
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            timestamp: new Date().toISOString()
        });
    }
    next();
}

// --- 公開API (認証不要) ---

// システム全体の統計情報を取得
router.get('/public/stats', async (req, res) => {
    try {
        // First try to get stats from Google Apps Script
        let useGoogleAppsScript = process.env.USE_GOOGLE_APPS_SCRIPT !== 'false';
        
        if (useGoogleAppsScript) {
            try {
                console.log('Attempting to get stats from Google Apps Script...');
                const gasStats = await gasService.getSystemStats();
                console.log('Successfully retrieved stats from Google Apps Script');
                return res.json(gasStats);
            } catch (gasError) {
                console.warn('Failed to get stats from Google Apps Script, falling back to local database:', gasError.message);
                // Continue to local database fallback
            }
        }

        // Fallback to local database
        const db = getDb();
        if (!db) {
            const errorMessage = useGoogleAppsScript 
                ? 'Database not available and Google Apps Script failed'
                : 'Database not available and Google Apps Script is disabled';
            return res.status(503).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
        
        // 並列でデータを取得
        const [usersSnapshot, quizzesSnapshot, attemptsSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('quizzes').get(),
            db.collection('quiz_attempts').get()
        ]);

        // 管理者数も計算
        const adminCount = usersSnapshot.docs.filter(doc => {
            const userData = doc.data();
            return userData.isAdmin === true;
        }).length;

        // クイズの種類別カウント
        const quizzesByVisibility = {
            public: 0,
            private: 0
        };

        quizzesSnapshot.docs.forEach(doc => {
            const quizData = doc.data();
            if (quizData.visibility === 'public') {
                quizzesByVisibility.public++;
            } else {
                quizzesByVisibility.private++;
            }
        });

        const stats = {
            success: true,
            data: {
                totalUsers: usersSnapshot.size,
                totalQuizzes: quizzesSnapshot.size,
                totalAttempts: attemptsSnapshot.size,
                adminCount: adminCount,
                quizzesByVisibility: quizzesByVisibility,
                generatedAt: new Date().toISOString()
            },
            source: 'local-database',
            timestamp: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve system statistics');
    }
});

// 登録ユーザー数のみ取得
router.get('/public/users/count', async (req, res) => {
    try {
        // First try to get user count from Google Apps Script
        let useGoogleAppsScript = process.env.USE_GOOGLE_APPS_SCRIPT !== 'false';
        
        if (useGoogleAppsScript) {
            try {
                console.log('Attempting to get user count from Google Apps Script...');
                const gasUserCount = await gasService.getUserCount();
                console.log('Successfully retrieved user count from Google Apps Script');
                return res.json(gasUserCount);
            } catch (gasError) {
                console.warn('Failed to get user count from Google Apps Script, falling back to local database:', gasError.message);
                // Continue to local database fallback
            }
        }

        // Fallback to local database
        const db = getDb();
        if (!db) {
            const errorMessage = useGoogleAppsScript 
                ? 'Database not available and Google Apps Script failed'
                : 'Database not available and Google Apps Script is disabled';
            return res.status(503).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
        
        const usersSnapshot = await db.collection('users').get();
        
        res.json({
            success: true,
            data: {
                count: usersSnapshot.size,
                generatedAt: new Date().toISOString()
            },
            source: 'local-database',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve user count');
    }
});

// クイズ総数のみ取得
router.get('/public/quizzes/count', async (req, res) => {
    try {
        // First try to get quiz count from Google Apps Script
        let useGoogleAppsScript = process.env.USE_GOOGLE_APPS_SCRIPT !== 'false';
        
        if (useGoogleAppsScript) {
            try {
                console.log('Attempting to get quiz count from Google Apps Script...');
                const gasQuizCount = await gasService.getQuizCount();
                console.log('Successfully retrieved quiz count from Google Apps Script');
                return res.json(gasQuizCount);
            } catch (gasError) {
                console.warn('Failed to get quiz count from Google Apps Script, falling back to local database:', gasError.message);
                // Continue to local database fallback
            }
        }

        // Fallback to local database
        const db = getDb();
        if (!db) {
            const errorMessage = useGoogleAppsScript 
                ? 'Database not available and Google Apps Script failed'
                : 'Database not available and Google Apps Script is disabled';
            return res.status(503).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
        
        const quizzesSnapshot = await db.collection('quizzes').get();
        
        res.json({
            success: true,
            data: {
                count: quizzesSnapshot.size,
                generatedAt: new Date().toISOString()
            },
            source: 'local-database',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve quiz count');
    }
});

// --- Google Apps Script専用API ---

// Google Apps Scriptとの接続テスト
router.get('/gas/ping', async (req, res) => {
    try {
        console.log('Testing Google Apps Script connection...');
        const isConnected = await gasService.testConnection();
        
        res.json({
            success: true,
            data: {
                connected: isConnected,
                scriptUrl: gasService.scriptUrl,
                testedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to test Google Apps Script connection');
    }
});

// Google Apps Scriptに任意のアクションを送信
router.post('/gas/action', async (req, res) => {
    try {
        const { action, data } = req.body;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                error: 'Action parameter is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Sending action "${action}" to Google Apps Script...`);
        const result = await gasService.performAction(action, data);
        
        res.json(result);
    } catch (error) {
        handleApiError(res, error, 'Failed to perform Google Apps Script action');
    }
});

// Google Apps Scriptにユーザーデータを送信
router.post('/gas/submit-user-data', requireAuth, async (req, res) => {
    try {
        const userData = {
            userId: req.session.user.uid,
            username: req.session.user.username,
            submittedAt: new Date().toISOString(),
            data: req.body.data || {}
        };

        console.log('Submitting user data to Google Apps Script...');
        const result = await gasService.submitUserData(userData);
        
        res.json(result);
    } catch (error) {
        handleApiError(res, error, 'Failed to submit user data to Google Apps Script');
    }
});

// Google Apps Scriptにクイズデータを送信
router.post('/gas/submit-quiz-data', requireAuth, async (req, res) => {
    try {
        const quizData = {
            userId: req.session.user.uid,
            username: req.session.user.username,
            submittedAt: new Date().toISOString(),
            data: req.body.data || {}
        };

        console.log('Submitting quiz data to Google Apps Script...');
        const result = await gasService.submitQuizData(quizData);
        
        res.json(result);
    } catch (error) {
        handleApiError(res, error, 'Failed to submit quiz data to Google Apps Script');
    }
});

// --- 認証が必要なAPI ---

// 現在のユーザーのプロフィール情報を取得
router.get('/user/profile', requireDatabase, requireAuth, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.session.user.uid;
        
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date().toISOString()
            });
        }

        const userData = userDoc.data();
        
        // パスワードなどの敏感な情報は除外
        const safeUserData = {
            uid: userId,
            username: userData.username,
            handle: userData.handle,
            isAdmin: userData.isAdmin || false,
            createdAt: userData.createdAt,
            lastActivityAt: userData.lastActivityAt
        };

        res.json({
            success: true,
            data: safeUserData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve user profile');
    }
});

// 現在のユーザーが作成したクイズの一覧を取得
router.get('/user/quizzes', requireDatabase, requireAuth, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.session.user.uid;
        
        const quizzesSnapshot = await db.collection('quizzes')
            .where('creatorId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const quizzes = quizzesSnapshot.docs.map(doc => {
            const quizData = doc.data();
            return {
                id: doc.id,
                title: quizData.title,
                description: quizData.description,
                visibility: quizData.visibility,
                questionCount: quizData.questions ? quizData.questions.length : 0,
                createdAt: quizData.createdAt,
                updatedAt: quizData.updatedAt
            };
        });

        res.json({
            success: true,
            data: {
                quizzes: quizzes,
                totalCount: quizzes.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve user quizzes');
    }
});

// 現在のユーザーのクイズ実行履歴を取得
router.get('/user/history', requireDatabase, requireAuth, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.session.user.uid;
        
        const attemptsSnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', userId)
            .orderBy('attemptedAt', 'desc')
            .limit(50) // 最新50件に制限
            .get();
        
        const history = attemptsSnapshot.docs.map(doc => {
            const attemptData = doc.data();
            return {
                id: doc.id,
                quizId: attemptData.quizId,
                quizTitle: attemptData.quizTitle || 'Unknown Quiz',
                score: attemptData.score,
                totalQuestions: attemptData.totalQuestions,
                correctAnswers: attemptData.correctAnswers,
                attemptedAt: attemptData.attemptedAt,
                completedAt: attemptData.completedAt
            };
        });

        res.json({
            success: true,
            data: {
                history: history,
                totalCount: history.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve user history');
    }
});

// 現在のユーザーの統計情報を取得
router.get('/user/stats', requireDatabase, requireAuth, async (req, res) => {
    try {
        const db = req.db;
        const userId = req.session.user.uid;
        
        // 並列でデータを取得
        const [quizzesSnapshot, attemptsSnapshot] = await Promise.all([
            db.collection('quizzes').where('creatorId', '==', userId).get(),
            db.collection('quiz_attempts').where('userId', '==', userId).get()
        ]);

        // 統計を計算
        const attempts = attemptsSnapshot.docs.map(doc => doc.data());
        const totalAttempts = attempts.length;
        const completedAttempts = attempts.filter(attempt => attempt.completedAt).length;
        const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
        const averageScore = completedAttempts > 0 ? totalScore / completedAttempts : 0;

        // クイズ作成統計
        const createdQuizzes = quizzesSnapshot.size;
        const publicQuizzes = quizzesSnapshot.docs.filter(doc => {
            const quizData = doc.data();
            return quizData.visibility === 'public';
        }).length;

        const stats = {
            success: true,
            data: {
                quizzesCreated: createdQuizzes,
                publicQuizzes: publicQuizzes,
                privateQuizzes: createdQuizzes - publicQuizzes,
                totalAttempts: totalAttempts,
                completedAttempts: completedAttempts,
                averageScore: Math.round(averageScore * 100) / 100, // 小数点第2位まで
                generatedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve user statistics');
    }
});

// --- API ドキュメント (開発用) ---
router.get('/docs', (req, res) => {
    const apiDocs = {
        title: 'IdentityV Match API Documentation',
        version: '1.0.0',
        endpoints: {
            public: {
                'GET /api/public/stats': 'システム全体の統計情報を取得',
                'GET /api/public/users/count': '登録ユーザー数を取得',
                'GET /api/public/quizzes/count': 'クイズ総数を取得'
            },
            authenticated: {
                'GET /api/user/profile': '現在のユーザーのプロフィール情報を取得',
                'GET /api/user/quizzes': '現在のユーザーが作成したクイズ一覧を取得',
                'GET /api/user/history': '現在のユーザーのクイズ実行履歴を取得',
                'GET /api/user/stats': '現在のユーザーの統計情報を取得'
            }
        },
        response_format: {
            success: true,
            data: {},
            timestamp: 'ISO 8601 timestamp'
        },
        error_format: {
            success: false,
            error: 'Error message',
            timestamp: 'ISO 8601 timestamp'
        }
    };

    res.json(apiDocs);
});

// OpenAPI/Swagger仕様をJSONで提供
router.get('/openapi.json', (req, res) => {
    const fs = require('fs');
    const yaml = require('js-yaml');
    const path = require('path');
    
    try {
        const yamlPath = path.join(__dirname, '..', 'openapi.yaml');
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const openApiSpec = yaml.load(yamlContent);
        res.json(openApiSpec);
    } catch (error) {
        console.error('Error loading OpenAPI spec:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load OpenAPI specification',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;