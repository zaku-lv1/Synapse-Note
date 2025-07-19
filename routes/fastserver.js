/**
 * fastserver.js - FastServer-List API endpoints for Synapse Note
 * 
 * High-performance listing functionality with:
 * - Server-side pagination
 * - Fast search and filtering
 * - Query optimization
 * - Caching support
 * 
 * Endpoints:
 * - GET /api/fastserver/quizzes - Optimized quiz listing with pagination and search
 * - GET /api/fastserver/users - Fast user listing with search
 * - GET /api/fastserver/history - Optimized quiz attempt history
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Firestore データベースインスタンス (lazy initialization)
function getDb() {
    try {
        return admin.firestore();
    } catch (error) {
        console.error('Firebase not initialized:', error.message);
        return null;
    }
}

// Cache for frequently accessed data (simple in-memory cache)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// API レスポンス用のエラーハンドラー
function handleApiError(res, error, message = 'Internal server error') {
    console.error('FastServer API Error:', error);
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
            error: 'Database service unavailable',
            timestamp: new Date().toISOString()
        });
    }
    req.db = db;
    next();
}

// 認証ミドルウェア（オプショナル）
function optionalAuth(req, res, next) {
    // セッションがあれば設定、なくてもOK
    req.user = req.session?.user || null;
    next();
}

// 認証必須ミドルウェア
function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            timestamp: new Date().toISOString()
        });
    }
    req.user = req.session.user;
    next();
}

/**
 * FastServer Quiz Listing API
 * 高性能なクイズ一覧取得エンドポイント
 * 
 * Query Parameters:
 * - page: ページ番号 (default: 1)
 * - limit: 1ページあたりのアイテム数 (default: 20, max: 100)
 * - search: 検索キーワード
 * - visibility: public, private, unlisted
 * - subject: 科目フィルター
 * - sortBy: createdAt, title, updatedAt (default: createdAt)
 * - sortOrder: asc, desc (default: desc)
 * - includeOwner: true/false - 作成者情報を含めるか (default: false for performance)
 */
router.get('/quizzes', requireDatabase, optionalAuth, async (req, res) => {
    try {
        // パラメータの解析と検証
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const search = req.query.search?.trim() || '';
        const visibility = req.query.visibility || 'public';
        const subject = req.query.subject?.trim() || '';
        const sortBy = ['createdAt', 'title', 'updatedAt'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const includeOwner = req.query.includeOwner === 'true';
        
        // キャッシュキーの生成
        const cacheKey = `quizzes:${page}:${limit}:${search}:${visibility}:${subject}:${sortBy}:${sortOrder}:${includeOwner}`;
        
        // キャッシュチェック (検索なしの場合のみ)
        if (!search && !req.user) {
            const cachedResult = getCachedData(cacheKey);
            if (cachedResult) {
                return res.json(cachedResult);
            }
        }

        const db = req.db;
        let query = db.collection('quizzes');
        
        // 権限フィルター
        if (req.user) {
            // ログイン済みユーザーは自分のプライベートクイズも見れる
            if (visibility === 'private') {
                query = query.where('ownerId', '==', req.user.uid);
            } else if (visibility === 'all') {
                // 自分のものは全て、他の人のは公開・非公開のみ
                query = query.where('visibility', 'in', ['public', 'unlisted']);
            } else {
                query = query.where('visibility', '==', visibility);
            }
        } else {
            // 未ログインユーザーは公開・非公開のみ
            query = query.where('visibility', 'in', ['public', 'unlisted']);
        }
        
        // 科目フィルター
        if (subject) {
            query = query.where('subject', '==', subject);
        }
        
        // ソート順の設定
        query = query.orderBy(sortBy, sortOrder);
        
        // 検索対応（Firestoreの制限により、タイトルの部分一致のみ対応）
        if (search) {
            // Firestoreでは完全な全文検索は困難なので、クライアントサイドフィルタリングを組み合わせる
            // まず大きめのデータセットを取得
            query = query.limit(500);
        } else {
            // ページネーション計算
            const offset = (page - 1) * limit;
            query = query.offset(offset).limit(limit);
        }
        
        const snapshot = await query.get();
        let quizzes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || 'Untitled Quiz',
                description: data.description || '',
                subject: data.subject || 'Other',
                difficulty: data.difficulty || 'Medium',
                visibility: data.visibility || 'private',
                questionCount: data.questions ? data.questions.length : 0,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                ownerId: data.ownerId
            };
        });
        
        // 検索フィルタリング（クライアントサイド）
        if (search) {
            const searchLower = search.toLowerCase();
            quizzes = quizzes.filter(quiz => 
                quiz.title.toLowerCase().includes(searchLower) ||
                (quiz.description && quiz.description.toLowerCase().includes(searchLower)) ||
                (quiz.subject && quiz.subject.toLowerCase().includes(searchLower))
            );
            
            // 検索後のページネーション
            const totalSearchResults = quizzes.length;
            const offset = (page - 1) * limit;
            quizzes = quizzes.slice(offset, offset + limit);
        }
        
        // 作成者情報の取得（オプション）
        if (includeOwner && quizzes.length > 0) {
            const ownerIds = [...new Set(quizzes.map(q => q.ownerId).filter(Boolean))];
            
            if (ownerIds.length > 0) {
                const usersSnapshot = await db.collection('users')
                    .where(admin.firestore.FieldPath.documentId(), 'in', ownerIds)
                    .get();
                
                const userMap = new Map();
                usersSnapshot.docs.forEach(doc => {
                    const userData = doc.data();
                    userMap.set(doc.id, {
                        handle: userData.handle,
                        username: userData.username
                    });
                });
                
                quizzes = quizzes.map(quiz => ({
                    ...quiz,
                    owner: userMap.get(quiz.ownerId) || null
                }));
            }
        }
        
        const totalCount = search ? null : snapshot.size; // 検索時は正確なカウントが困難
        const hasMore = search ? quizzes.length === limit : (page * limit) < snapshot.size;
        
        const result = {
            success: true,
            data: {
                quizzes: quizzes,
                pagination: {
                    page: page,
                    limit: limit,
                    totalCount: totalCount,
                    hasMore: hasMore,
                    totalPages: totalCount ? Math.ceil(totalCount / limit) : null
                },
                filters: {
                    search: search,
                    visibility: visibility,
                    subject: subject,
                    sortBy: sortBy,
                    sortOrder: sortOrder
                }
            },
            timestamp: new Date().toISOString()
        };
        
        // キャッシュ保存（検索なしの場合のみ）
        if (!search && !req.user) {
            setCachedData(cacheKey, result);
        }
        
        res.json(result);
        
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve quizzes');
    }
});

/**
 * FastServer User Search API
 * 高性能なユーザー検索エンドポイント
 */
router.get('/users', requireDatabase, requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const search = req.query.search?.trim() || '';
        
        const db = req.db;
        let query = db.collection('users');
        
        // 基本的なソート
        query = query.orderBy('createdAt', 'desc');
        
        if (search) {
            query = query.limit(200); // 検索用に多めに取得
        } else {
            const offset = (page - 1) * limit;
            query = query.offset(offset).limit(limit);
        }
        
        const snapshot = await query.get();
        let users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                username: data.username,
                handle: data.handle,
                isAdmin: data.isAdmin || false,
                createdAt: data.createdAt,
                lastActivityAt: data.lastActivityAt
            };
        });
        
        // 検索フィルタリング
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user => 
                user.username?.toLowerCase().includes(searchLower) ||
                user.handle?.toLowerCase().includes(searchLower)
            );
            
            // 検索後のページネーション
            const offset = (page - 1) * limit;
            users = users.slice(offset, offset + limit);
        }
        
        res.json({
            success: true,
            data: {
                users: users,
                pagination: {
                    page: page,
                    limit: limit,
                    hasMore: users.length === limit
                },
                filters: {
                    search: search
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve users');
    }
});

/**
 * FastServer Quiz History API
 * 高性能なクイズ実行履歴取得エンドポイント
 */
router.get('/history', requireDatabase, requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const quizId = req.query.quizId?.trim() || '';
        
        const db = req.db;
        let query = db.collection('quiz_attempts')
            .where('userId', '==', req.user.uid)
            .orderBy('attemptedAt', 'desc');
        
        if (quizId) {
            query = query.where('quizId', '==', quizId);
        }
        
        const offset = (page - 1) * limit;
        query = query.offset(offset).limit(limit);
        
        const snapshot = await query.get();
        const history = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                quizId: data.quizId,
                quizTitle: data.quizTitle || 'Unknown Quiz',
                totalScore: data.totalScore || 0,
                maxScore: data.maxScore || 0,
                percentage: data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0,
                attemptedAt: data.attemptedAt
            };
        });
        
        res.json({
            success: true,
            data: {
                history: history,
                pagination: {
                    page: page,
                    limit: limit,
                    hasMore: history.length === limit
                },
                filters: {
                    quizId: quizId
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        handleApiError(res, error, 'Failed to retrieve quiz history');
    }
});

/**
 * Cache management endpoint (admin only)
 */
router.delete('/cache', requireDatabase, requireAuth, async (req, res) => {
    try {
        // 管理者チェック
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                timestamp: new Date().toISOString()
            });
        }
        
        cache.clear();
        
        res.json({
            success: true,
            data: {
                message: 'Cache cleared successfully'
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        handleApiError(res, error, 'Failed to clear cache');
    }
});

module.exports = router;