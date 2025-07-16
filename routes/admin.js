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
    // Development mode fallback when database is not available
    if (!getDb() && process.env.NODE_ENV === 'development') {
        // Create a temporary admin session for development/testing
        if (!req.session.user) {
            req.session.user = {
                uid: 'dev-admin',
                username: 'Development Admin',
                isAdmin: true,
                handle: 'dev-admin'
            };
        }
    }

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
        const settings = settingsDoc.exists ? settingsDoc.data() : { 
            allowRegistration: true, 
            autoCleanupEnabled: false 
        };

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
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

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
        const db = getDb();
        let settings = { 
            allowRegistration: true,
            maintenanceMode: false,
            registrationMessage: '',
            autoCleanupEnabled: false
        };
        let message = null;

        if (db) {
            try {
                const settingsDoc = await db.collection('system_settings').doc('general').get();
                if (settingsDoc.exists) {
                    settings = settingsDoc.data();
                }
            } catch (dbError) {
                console.error("Database error while fetching settings:", dbError);
                message = 'データベース接続に問題がありますが、設定の表示は可能です。設定の保存にはデータベース接続が必要です。';
            }
        } else {
            message = 'データベースに接続できません。設定の表示は可能ですが、保存にはデータベース接続が必要です。';
        }

        res.render('admin/settings', { 
            user: req.session.user, 
            settings,
            message
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
        const db = getDb();
        const { allowRegistration, maintenanceMode, registrationMessage, autoCleanupEnabled } = req.body;
        
        const settings = {
            allowRegistration: allowRegistration === 'on',
            maintenanceMode: maintenanceMode === 'on',
            registrationMessage: registrationMessage || '',
            autoCleanupEnabled: autoCleanupEnabled === 'on',
            updatedAt: new Date(),
            updatedBy: req.session.user.uid
        };

        let message = 'システム設定を更新しました。';

        if (db) {
            try {
                await db.collection('system_settings').doc('general').set(settings, { merge: true });
            } catch (dbError) {
                console.error("Database error while saving settings:", dbError);
                message = '設定は処理されましたが、データベースへの保存に失敗しました。データベース接続を確認してください。';
            }
        } else {
            message = '設定は処理されましたが、データベースに接続できないため永続化できません。データベース接続を確認してください。';
        }

        res.render('admin/settings', { 
            user: req.session.user, 
            settings,
            message
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
        const db = getDb();
        if (!db) {
            return res.redirect('/admin/users?error=データベースに接続できません。');
        }

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
        const db = getDb();
        if (!db) {
            return res.redirect('/admin/users?error=データベースに接続できません。');
        }

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
        const db = getDb();
        if (!db) {
            return res.redirect('/admin/quizzes?error=データベースに接続できません。');
        }

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

// ユーザー削除
router.post('/users/:userId/delete', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/admin/users?error=データベースに接続できません。');
        }

        const userId = req.params.userId;
        
        // 自分自身は削除できない
        if (userId === req.session.user.uid) {
            return res.redirect('/admin/users?error=自分自身のアカウントは削除できません。');
        }

        // ユーザーが存在するか確認
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.redirect('/admin/users?error=指定されたユーザーが見つかりません。');
        }

        const userData = userDoc.data();
        
        // ユーザーに関連するデータを削除
        const batch = db.batch();
        
        // ユーザーが作成したクイズを削除
        const userQuizzesSnapshot = await db.collection('quizzes')
            .where('ownerId', '==', userId)
            .get();
        
        // 各クイズに関連するattempts も削除
        for (const quizDoc of userQuizzesSnapshot.docs) {
            const quizId = quizDoc.id;
            const attemptsSnapshot = await db.collection('quiz_attempts')
                .where('quizId', '==', quizId)
                .get();
            
            attemptsSnapshot.docs.forEach(attemptDoc => {
                batch.delete(attemptDoc.ref);
            });
            
            batch.delete(quizDoc.ref);
        }
        
        // ユーザーのクイズ試行履歴を削除
        const userAttemptsSnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', userId)
            .get();
        
        userAttemptsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // ユーザー自体を削除
        batch.delete(db.collection('users').doc(userId));
        
        await batch.commit();

        res.redirect('/admin/users?message=ユーザー「' + userData.username + '」を削除しました。');
    } catch (error) {
        console.error("User deletion error:", error);
        res.redirect('/admin/users?error=ユーザーの削除中にエラーが発生しました。');
    }
});

// 非アクティブユーザーの自動削除機能
async function cleanupInactiveUsers(db) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // 30日間非アクティブなユーザーを取得
        const inactiveUsersSnapshot = await db.collection('users')
            .where('lastActivityAt', '<=', thirtyDaysAgo)
            .get();
        
        const deletedUsers = [];
        
        for (const userDoc of inactiveUsersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            // 管理者は削除対象外
            if (userData.isAdmin) {
                continue;
            }
            
            // ユーザーが作成したクイズを取得
            const userQuizzesSnapshot = await db.collection('quizzes')
                .where('ownerId', '==', userId)
                .get();
            
            let shouldDeleteUser = true;
            
            // ユーザーのクイズがある場合は、最近の試行履歴をチェック
            for (const quizDoc of userQuizzesSnapshot.docs) {
                const quizId = quizDoc.id;
                
                // 1週間以内にクイズが試行されているかチェック
                const recentAttemptsSnapshot = await db.collection('quiz_attempts')
                    .where('quizId', '==', quizId)
                    .where('createdAt', '>', oneWeekAgo)
                    .limit(1)
                    .get();
                
                if (!recentAttemptsSnapshot.empty) {
                    // 最近試行されているクイズがあるので、このユーザーは削除しない
                    shouldDeleteUser = false;
                    break;
                }
            }
            
            if (shouldDeleteUser) {
                // ユーザーとその関連データを削除
                const batch = db.batch();
                
                // ユーザーが作成したクイズと関連する試行履歴を削除
                for (const quizDoc of userQuizzesSnapshot.docs) {
                    const quizId = quizDoc.id;
                    const attemptsSnapshot = await db.collection('quiz_attempts')
                        .where('quizId', '==', quizId)
                        .get();
                    
                    attemptsSnapshot.docs.forEach(attemptDoc => {
                        batch.delete(attemptDoc.ref);
                    });
                    
                    batch.delete(quizDoc.ref);
                }
                
                // ユーザーの試行履歴を削除
                const userAttemptsSnapshot = await db.collection('quiz_attempts')
                    .where('userId', '==', userId)
                    .get();
                
                userAttemptsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // ユーザー自体を削除
                batch.delete(userDoc.ref);
                
                await batch.commit();
                
                deletedUsers.push({
                    username: userData.username,
                    handle: userData.handle,
                    quizCount: userQuizzesSnapshot.size
                });
            }
        }
        
        return deletedUsers;
    } catch (error) {
        console.error('Cleanup error:', error);
        throw error;
    }
}

// 手動クリーンアップ実行エンドポイント
router.post('/cleanup', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/admin/settings?error=データベースに接続できません。');
        }

        // システム設定を確認
        const settingsDoc = await db.collection('system_settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { autoCleanupEnabled: false };
        
        if (!settings.autoCleanupEnabled) {
            return res.redirect('/admin/settings?error=自動削除機能が無効になっています。');
        }

        const deletedUsers = await cleanupInactiveUsers(db);
        
        const message = deletedUsers.length > 0 
            ? `${deletedUsers.length}人の非アクティブユーザーを削除しました。`
            : '削除対象の非アクティブユーザーはいませんでした。';
            
        res.redirect(`/admin/settings?message=${encodeURIComponent(message)}`);
    } catch (error) {
        console.error("Manual cleanup error:", error);
        res.redirect('/admin/settings?error=クリーンアップ中にエラーが発生しました。');
    }
});

module.exports = router;