/**
 * Synapse Note - メインルートハンドラー
 * 
 * このファイルはアプリケーションの主要なルーティングを管理します：
 * - ホームページの表示制御（ログイン状態に応じたリダイレクト）
 * - ダッシュボードページの表示
 * - ユーザーの挑戦履歴の表示
 * 
 * 依存関係:
 * - Express.js ルーター
 * - Firebase Admin SDK（Firestore）
 * - セッション管理
 */

const express = require('express');
const { getDb } = require('../services/database');
const router = express.Router();

/**
 * 認証ミドルウェア
 * ログインが必要なページにアクセスする前にユーザーの認証状態をチェック
 * 
 * @param {Object} req - Express リクエストオブジェクト
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {Function} next - 次のミドルウェアを呼び出す関数
 */
function requireLogin(req, res, next) {
    // セッションにユーザー情報がない場合はログインページにリダイレクト
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    // ユーザーのアクティビティを更新（非同期で実行、エラーがあっても処理を続行）
    updateUserActivity(req.session.user.uid);
    
    // 認証済みの場合は次のミドルウェアに進む
    next();
}

/**
 * ユーザーのアクティビティ時刻を更新
 * @param {string} userId - ユーザーID
 */
async function updateUserActivity(userId) {
    try {
        const db = getDb();
        if (db && userId) {
            await db.collection('users').doc(userId).update({
                lastActivityAt: new Date()
            });
        }
    } catch (error) {
        // アクティビティ更新のエラーはログに記録するだけで、アプリケーションの動作は妨げない
        console.error('Error updating user activity:', error);
    }
}

/**
 * ホームページのルート
 * ログイン状態に応じて適切なページを表示
 * - ログイン済み: ダッシュボードにリダイレクト
 * - 未ログイン: ランディングページを表示
 */
router.get('/', (req, res) => {
    if (req.session.user) {
        // ログイン済みユーザーはダッシュボードへリダイレクト
        return res.redirect('/dashboard');
    }
    // 未ログインユーザーには紹介ページを表示
    res.render('index', { user: req.session.user });
});

/**
 * ダッシュボードページのルート
 * ログイン済みユーザーのメインハブページ
 */
router.get('/dashboard', requireLogin, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

/**
 * 挑戦履歴ページのルート
 * ユーザーが過去に挑戦したクイズの履歴を表示
 */
router.get('/my-history', requireLogin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        // Firestoreから該当ユーザーの挑戦履歴を取得
        // 新しい順（attemptedAt降順）でソート
        const attemptsSnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', req.session.user.uid)
            .orderBy('attemptedAt', 'desc')
            .get();
            
        const attempts = attemptsSnapshot.docs.map(doc => {
            const data = doc.data();
            // attemptedAt フィールドが存在し、かつ null でないことを確認
            const attemptedAtDate = data.attemptedAt && typeof data.attemptedAt.toDate === 'function' 
                ? data.attemptedAt.toDate() 
                : new Date(); // 存在しない場合は現在時刻を仮で入れる

            return {
                id: doc.id,
                ...data,
                attemptedAt: attemptedAtDate
            };
        });

        res.render('my-history', { user: req.session.user, attempts: attempts });
    } catch (error) {
        console.error("History Error:", error);
        res.status(500).render('error', {
            message: '履歴の取得中にエラーが発生しました。',
            user: req.session.user
        });
    }
});

router.get('/public-quizzes', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session?.user || null
            });
        }

        const quizzesSnapshot = await db.collection('quizzes')
            .where('visibility', 'in', ['public', 'unlisted'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        // Get owner information for each quiz
        const quizzes = await Promise.all(quizzesSnapshot.docs.map(async (doc) => {
            const quizData = doc.data();
            let ownerHandle = null;
            
            if (quizData.ownerId) {
                try {
                    const ownerDoc = await db.collection('users').doc(quizData.ownerId).get();
                    if (ownerDoc.exists) {
                        ownerHandle = ownerDoc.data().handle;
                    }
                } catch (error) {
                    console.error('Error fetching owner data:', error);
                }
            }
            
            return { 
                id: doc.id, 
                ...quizData,
                ownerHandle: ownerHandle
            };
        }));
        
        res.render('public-quizzes', { user: req.session?.user || null, quizzes: quizzes });
    } catch (error) {
        console.error("Public Quizzes Error:", error);
        res.status(500).render('error', {
            message: '公開クイズの取得中にエラーが発生しました。',
            user: req.session?.user || null
        });
    }
});

/**
 * APIドキュメントページの表示
 * 
 * 機能:
 * - インタラクティブなAPIドキュメントページを表示
 * - 各エンドポイントの試用機能を提供
 * - 認証不要でアクセス可能
 */
router.get('/api-docs', (req, res) => {
    res.render('api-docs', { 
        title: 'API Documentation - Synapse Note',
        user: req.session?.user || null 
    });
});

module.exports = router;