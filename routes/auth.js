const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
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

const saltRounds = 10;

// --- ページ表示 ---
router.get('/register', async (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    
    try {
        const db = getDb();
        if (!db) {
            return res.render('register', { 
                error: 'データベースに接続できません。', 
                user: req.session.user,
                registrationMessage: ''
            });
        }

        // システム設定を確認
        const settingsDoc = await db.collection('system_settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { allowRegistration: true };
        
        if (!settings.allowRegistration) {
            return res.render('register', { 
                error: '現在、新規ユーザーの登録を受け付けておりません。', 
                user: req.session.user,
                registrationMessage: settings.registrationMessage || ''
            });
        }
        
        res.render('register', { 
            error: null, 
            user: req.session.user,
            registrationMessage: settings.registrationMessage || ''
        });
    } catch (error) {
        console.error("Register page error:", error);
        res.render('register', { 
            error: 'システムエラーが発生しました。', 
            user: req.session.user,
            registrationMessage: ''
        });
    }
});

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { error: null, user: req.session.user });
});

// --- 機能ルート ---
router.post('/register', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.render('register', { 
                error: 'データベースに接続できません。', 
                user: req.session.user,
                registrationMessage: ''
            });
        }

        // システム設定を確認
        const settingsDoc = await db.collection('system_settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { allowRegistration: true };
        
        if (!settings.allowRegistration) {
            return res.render('register', { 
                error: '現在、新規ユーザーの登録を受け付けておりません。', 
                user: req.session.user,
                registrationMessage: settings.registrationMessage || ''
            });
        }
        
        const { username, handle, password } = req.body;
        const fullHandle = '@' + handle.trim();
        const handleSnapshot = await db.collection('users').where('handle', '==', fullHandle).get();
        if (!handleSnapshot.empty) {
            return res.render('register', { 
                error: 'このハンドル名は既に使用されています。', 
                user: req.session.user,
                registrationMessage: settings.registrationMessage || ''
            });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // ★ 修正点: ユーザーIDを Firestore ドキュメント自体から取得するように変更
        const userRef = db.collection('users').doc();
        
        const newUser = {
            username,
            handle: fullHandle,
            password: hashedPassword,
            isAdmin: false, // デフォルトは一般ユーザー
            createdAt: new Date(),
            lastActivityAt: new Date()
        };
        // 注意: newUser オブジェクトにはIDを含めず、setする
        await userRef.set(newUser);
        
        // セッションには userRef.id を使う
        req.session.user = { 
            uid: userRef.id, 
            username: newUser.username, 
            handle: newUser.handle,
            isAdmin: newUser.isAdmin
        };
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Register Error:", error);
        res.render('register', { 
            error: '登録中にエラーが発生しました。', 
            user: req.session.user,
            registrationMessage: ''
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.render('login', { 
                error: 'データベースに接続できません。', 
                user: req.session.user 
            });
        }

        const { handle, password } = req.body;
        const handleWithAt = handle.startsWith('@') ? handle : '@' + handle;
        const snapshot = await db.collection('users').where('handle', '==', handleWithAt).limit(1).get();
        if (snapshot.empty) {
            return res.render('login', { error: 'ハンドル名またはパスワードが正しくありません。', user: req.session.user });
        }
        
        // ★ 修正点: ドキュメントのIDとデータを別々に取得
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        const validPassword = await bcrypt.compare(password, userData.password);
        if (!validPassword) {
            return res.render('login', { error: 'ハンドル名またはパスワードが正しくありません。', user: req.session.user });
        }
        
        // ログイン成功時にlastActivityAtを更新
        await userDoc.ref.update({
            lastActivityAt: new Date()
        });
        
        // セッションには userDoc.id を使う
        req.session.user = { 
            uid: userDoc.id, 
            username: userData.username, 
            handle: userData.handle,
            isAdmin: userData.isAdmin || false // 管理者フラグも追加
        };
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Login Error:", error);
        res.render('login', { error: 'ログイン中にエラーが発生しました。', user: req.session.user });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.redirect('/dashboard');
        }
        // より確実にクッキーをクリア
        res.clearCookie('connect.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        // キャッシュを無効にするヘッダーを追加
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.redirect('/');
    });
});

// --- 初回管理者登録 (セキュリティ重要) ---
router.get('/setup-admin', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        // 既に管理者が存在するかチェック
        const adminSnapshot = await db.collection('users').where('isAdmin', '==', true).limit(1).get();
        
        if (!adminSnapshot.empty) {
            return res.status(403).render('error', {
                message: '管理者は既に設定されています。',
                user: req.session.user
            });
        }
        
        res.render('setup-admin', { error: null, user: req.session.user });
    } catch (error) {
        console.error("Setup admin page error:", error);
        res.status(500).render('error', {
            message: 'エラーが発生しました。',
            user: req.session.user
        });
    }
});

router.post('/setup-admin', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        // 既に管理者が存在するかチェック
        const adminSnapshot = await db.collection('users').where('isAdmin', '==', true).limit(1).get();
        
        if (!adminSnapshot.empty) {
            return res.status(403).render('error', {
                message: '管理者は既に設定されています。',
                user: req.session.user
            });
        }
        
        const { username, handle, password, adminKey } = req.body;
        
        // 管理者キーの確認 (環境変数に設定)
        if (adminKey !== process.env.ADMIN_SETUP_KEY) {
            return res.render('setup-admin', {
                error: '管理者キーが正しくありません。',
                user: req.session.user
            });
        }
        
        const fullHandle = '@' + handle.trim();
        const handleSnapshot = await db.collection('users').where('handle', '==', fullHandle).get();
        if (!handleSnapshot.empty) {
            return res.render('setup-admin', {
                error: 'このハンドル名は既に使用されています。',
                user: req.session.user
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userRef = db.collection('users').doc();
        
        const newAdmin = {
            username,
            handle: fullHandle,
            password: hashedPassword,
            isAdmin: true,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            setupDate: new Date()
        };
        
        await userRef.set(newAdmin);
        
        // セッションに管理者としてログイン
        req.session.user = {
            uid: userRef.id,
            username: newAdmin.username,
            handle: newAdmin.handle,
            isAdmin: true
        };
        
        res.redirect('/admin');
    } catch (error) {
        console.error("Setup admin error:", error);
        res.render('setup-admin', {
            error: '管理者登録中にエラーが発生しました。',
            user: req.session.user
        });
    }
});

// Demo route for admin setup
router.get('/admin-demo', (req, res) => {
    res.render('admin-demo', { user: req.session.user });
});

// Demo route for testing admin interface mobile responsiveness
router.get('/admin-demo-full', (req, res) => {
    // Mock data for testing
    const mockUser = { username: 'テストユーザー', isAdmin: true };
    const mockStats = { totalUsers: 150, totalQuizzes: 89, totalAttempts: 2341, adminCount: 3 };
    const mockSettings = { allowRegistration: true, maintenanceMode: false };
    res.render('admin/dashboard', { user: mockUser, stats: mockStats, settings: mockSettings });
});

// Demo route for testing admin users page
router.get('/admin-demo-users', (req, res) => {
    const mockUser = { username: 'テストユーザー', uid: 'test-uid', isAdmin: true };
    const mockUsers = [
        { id: 'user1', username: '田中太郎', handle: '@tanaka', createdAt: { seconds: 1705123456 }, isAdmin: false },
        { id: 'user2', username: '佐藤花子', handle: '@hanako_sato', createdAt: { seconds: 1705109876 }, isAdmin: false },
        { id: 'user3', username: '山田次郎', handle: '@yamada_jiro', createdAt: { seconds: 1705098765 }, isAdmin: true },
        { id: 'user4', username: '鈴木一郎スーパーロングユーザーネーム', handle: '@suzuki_ichiro_super_long_handle_name', createdAt: { seconds: 1704987654 }, isAdmin: false },
        { id: 'user5', username: '高橋美咲', handle: '@misaki_takahashi', createdAt: { seconds: 1704876543 }, isAdmin: false }
    ];
    res.render('admin/users', { user: mockUser, users: mockUsers });
});

// Demo route for testing admin quizzes page  
router.get('/admin-demo-quizzes', (req, res) => {
    const mockUser = { username: 'テストユーザー', uid: 'test-uid', isAdmin: true };
    const mockQuizzes = [
        { 
            id: 'quiz1', 
            title: '英語基礎文法テスト', 
            description: '基本的な英語の文法問題を集めたテストです。動詞の活用、時制、助動詞などを中心に出題されます。',
            creatorName: '田中太郎',
            questions: [{}, {}, {}],
            createdAt: { seconds: 1705123456 },
            visibility: 'public'
        },
        { 
            id: 'quiz2', 
            title: '数学の方程式とグラフの関係性について学ぶための総合問題集', 
            description: '中学校数学の方程式とグラフについて学習できる問題集です。',
            creatorName: '鈴木一郎スーパーロングユーザーネーム',
            questions: [{}, {}, {}, {}, {}],
            createdAt: { seconds: 1705109876 },
            visibility: 'private'
        },
        { 
            id: 'quiz3', 
            title: '世界史', 
            description: null,
            creatorName: '佐藤花子',
            questions: [{}],
            createdAt: { seconds: 1705098765 },
            visibility: 'public'
        }
    ];
    res.render('admin/quizzes', { user: mockUser, quizzes: mockQuizzes });
});

// Demo route for testing admin settings page
router.get('/admin-demo-settings', (req, res) => {
    const mockUser = { username: 'テストユーザー', uid: 'test-uid', isAdmin: true };
    const mockSettings = { 
        allowRegistration: true, 
        maintenanceMode: false, 
        registrationMessage: 'システムへようこそ！新規ユーザーの登録を受け付けております。',
        autoCleanupEnabled: true 
    };
    res.render('admin/settings', { user: mockUser, settings: mockSettings, message: null });
});

module.exports = router;