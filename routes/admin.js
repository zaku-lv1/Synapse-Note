/**
 * admin.js - 管理者関連のルーティング
 * 
 * - 管理者ダッシュボード
 * - ユーザー管理
 * - クイズ管理
 * - システム設定
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

// Firestore データベースインスタンス (lazy initialization)
function getDb() {
    try {
        return admin.firestore();
    } catch (error) {
        console.error('Firebase not initialized:', error.message);
        return null;
    }
}

const saltRounds = 10;

// 管理者認証ミドルウェア
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login?error=admin_login_required');
    }
    if (!req.session.user.isAdmin) {
        return res.status(403).render('error', { 
            message: 'アクセス権限がありません。管理者のみアクセス可能です。',
            user: req.session.user 
        });
    }
    next();
}

// 管理者ダッシュボード
router.get('/', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        // 統計情報を取得
        const usersSnapshot = await db.collection('users').get();
        const quizzesSnapshot = await db.collection('quizzes').get();
        const attemptsSnapshot = await db.collection('quiz_attempts').get();

        // システム設定を取得
        const settingsDoc = await db.collection('system_settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { allowRegistration: true };

        const stats = {
            totalUsers: usersSnapshot.size,
            totalQuizzes: quizzesSnapshot.size,
            totalAttempts: attemptsSnapshot.size,
            adminCount: usersSnapshot.docs.filter(doc => doc.data().isAdmin).length
        };

        res.render('admin/dashboard', { 
            user: req.session.user, 
            stats,
            settings
        });
    } catch (error) {
        console.error("Admin dashboard error:", error);
        res.status(500).render('error', { 
            message: 'ダッシュボードの読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// ユーザー管理ページ
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render('admin/users', { 
            user: req.session.user, 
            users 
        });
    } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).render('error', { 
            message: 'ユーザー一覧の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// クイズ管理ページ
router.get('/quizzes', requireAdmin, async (req, res) => {
    try {
        const quizzesSnapshot = await db.collection('quizzes').orderBy('createdAt', 'desc').get();
        const quizzes = [];

        for (const doc of quizzesSnapshot.docs) {
            const quizData = doc.data();
            
            // クイズ作成者情報を取得
            let creatorName = '不明';
            if (quizData.ownerId) {
                try {
                    const userDoc = await db.collection('users').doc(quizData.ownerId).get();
                    if (userDoc.exists) {
                        creatorName = userDoc.data().username;
                    }
                } catch (err) {
                    console.error("Error fetching creator:", err);
                }
            }

            quizzes.push({
                id: doc.id,
                ...quizData,
                creatorName
            });
        }

        res.render('admin/quizzes', { 
            user: req.session.user, 
            quizzes 
        });
    } catch (error) {
        console.error("Admin quizzes error:", error);
        res.status(500).render('error', { 
            message: 'クイズ一覧の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// システム設定ページ
router.get('/settings', requireAdmin, async (req, res) => {
    try {
        const settingsDoc = await db.collection('system_settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { 
            allowRegistration: true,
            maintenanceMode: false,
            registrationMessage: ''
        };

        res.render('admin/settings', { 
            user: req.session.user, 
            settings,
            message: null 
        });
    } catch (error) {
        console.error("Admin settings error:", error);
        res.status(500).render('error', { 
            message: 'システム設定の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// システム設定更新
router.post('/settings', requireAdmin, async (req, res) => {
    try {
        const { allowRegistration, maintenanceMode, registrationMessage } = req.body;
        
        const settings = {
            allowRegistration: allowRegistration === 'on',
            maintenanceMode: maintenanceMode === 'on',
            registrationMessage: registrationMessage || '',
            updatedAt: new Date(),
            updatedBy: req.session.user.uid
        };

        await db.collection('system_settings').doc('general').set(settings, { merge: true });

        res.render('admin/settings', { 
            user: req.session.user, 
            settings,
            message: 'システム設定を更新しました。'
        });
    } catch (error) {
        console.error("Admin settings update error:", error);
        res.status(500).render('error', { 
            message: 'システム設定の更新中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// ユーザーを管理者に昇格
router.post('/users/:userId/promote', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        await db.collection('users').doc(userId).update({
            isAdmin: true,
            promotedAt: new Date(),
            promotedBy: req.session.user.uid
        });

        res.redirect('/admin/users?message=ユーザーを管理者に昇格させました。');
    } catch (error) {
        console.error("User promotion error:", error);
        res.redirect('/admin/users?error=ユーザーの昇格中にエラーが発生しました。');
    }
});

// ユーザーの管理者権限を取り消し
router.post('/users/:userId/demote', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // 自分自身の権限は取り消せない
        if (userId === req.session.user.uid) {
            return res.redirect('/admin/users?error=自分自身の管理者権限は取り消せません。');
        }

        await db.collection('users').doc(userId).update({
            isAdmin: false,
            demotedAt: new Date(),
            demotedBy: req.session.user.uid
        });

        res.redirect('/admin/users?message=ユーザーの管理者権限を取り消しました。');
    } catch (error) {
        console.error("User demotion error:", error);
        res.redirect('/admin/users?error=権限の取り消し中にエラーが発生しました。');
    }
});

// クイズ削除
router.post('/quizzes/:quizId/delete', requireAdmin, async (req, res) => {
    try {
        const quizId = req.params.quizId;
        
        // クイズに関連するattempts も削除
        const attemptsSnapshot = await db.collection('quiz_attempts')
            .where('quizId', '==', quizId)
            .get();
        
        const batch = db.batch();
        attemptsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // クイズ自体を削除
        batch.delete(db.collection('quizzes').doc(quizId));
        
        await batch.commit();

        res.redirect('/admin/quizzes?message=クイズを削除しました。');
    } catch (error) {
        console.error("Quiz deletion error:", error);
        res.redirect('/admin/quizzes?error=クイズの削除中にエラーが発生しました。');
    }
});

module.exports = router;