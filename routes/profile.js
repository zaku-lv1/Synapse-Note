const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// 認証チェックミドルウェア
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// 自分のプロフィール表示
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        
        // 統計情報の取得
        const quizzesSnapshot = await db.collection('quizzes')
            .where('ownerId', '==', userId)
            .get();
        
        const attemptsSnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', userId)
            .get();
        
        const stats = {
            createdQuizzes: quizzesSnapshot.size,
            takenQuizzes: attemptsSnapshot.size,
            averageScore: 0
        };
        
        // 平均スコア計算
        if (attemptsSnapshot.size > 0) {
            let totalScore = 0;
            let totalMaxScore = 0;
            
            attemptsSnapshot.forEach(doc => {
                const data = doc.data();
                totalScore += data.totalScore || 0;
                totalMaxScore += data.maxScore || 0;
            });
            
            if (totalMaxScore > 0) {
                stats.averageScore = Math.round((totalScore / totalMaxScore) * 100);
            }
        }
        
        res.render('profile', { 
            user: userData,
            stats,
            isOwnProfile: true,
            title: 'プロフィール'
        });
    } catch (error) {
        console.error('プロフィール取得エラー:', error);
        res.status(500).render('error', { message: 'プロフィールの取得に失敗しました' });
    }
});

// ハンドルによる他のユーザーのプロフィール表示
router.get('/:handle', async (req, res) => {
    try {
        let handle = req.params.handle;
        
        // @が付いていない場合は付ける
        if (!handle.startsWith('@')) {
            handle = '@' + handle;
        }
        
        const userSnapshot = await db.collection('users')
            .where('handle', '==', handle)
            .limit(1)
            .get();
        
        if (userSnapshot.empty) {
            return res.status(404).render('error', { 
                message: 'ユーザーが見つかりません',
                title: 'ユーザーが見つかりません'
            });
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // 自分のプロフィールかチェック
        const isOwnProfile = req.session.user && req.session.user.uid === userId;
        
        // 統計情報の取得（公開情報のみ）
        const quizzesSnapshot = await db.collection('quizzes')
            .where('ownerId', '==', userId)
            .where('visibility', '==', 'public')
            .get();
        
        const attemptsSnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', userId)
            .get();
        
        const stats = {
            createdQuizzes: quizzesSnapshot.size,
            takenQuizzes: attemptsSnapshot.size,
            averageScore: 0
        };
        
        // 平均スコア計算
        if (attemptsSnapshot.size > 0) {
            let totalScore = 0;
            let totalMaxScore = 0;
            
            attemptsSnapshot.forEach(doc => {
                const data = doc.data();
                totalScore += data.totalScore || 0;
                totalMaxScore += data.maxScore || 0;
            });
            
            if (totalMaxScore > 0) {
                stats.averageScore = Math.round((totalScore / totalMaxScore) * 100);
            }
        }
        
        res.render('profile', { 
            user: userData,
            stats,
            isOwnProfile,
            title: `${userData.username}のプロフィール`
        });
    } catch (error) {
        console.error('プロフィール取得エラー:', error);
        res.status(500).render('error', { message: 'プロフィールの取得に失敗しました' });
    }
});

// プロフィール編集ページ
router.get('/edit', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        res.render('profile-edit', { 
            user: userData,
            title: 'プロフィール編集'
        });
    } catch (error) {
        console.error('プロフィール編集ページエラー:', error);
        res.status(500).render('error', { message: 'ページの読み込みに失敗しました' });
    }
});

// プロフィール更新
router.post('/update', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.uid;
        const { displayName, bio } = req.body;
        
        // 現在のユーザーデータを取得
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        const currentUserData = userDoc.data();
        
        // バリデーション
        if (!displayName || displayName.trim().length === 0) {
            return res.status(400).render('profile-edit', {
                user: {
                    ...currentUserData,
                    username: displayName || '',
                    bio: bio || ''
                },
                error: '表示名は必須です',
                title: 'プロフィール編集'
            });
        }
        
        // 表示名の長さチェック
        if (displayName.trim().length > 50) {
            return res.status(400).render('profile-edit', {
                user: {
                    ...currentUserData,
                    username: displayName || '',
                    bio: bio || ''
                },
                error: '表示名は50文字以内で入力してください',
                title: 'プロフィール編集'
            });
        }
        
        // 自己紹介の長さチェック
        if (bio && bio.trim().length > 500) {
            return res.status(400).render('profile-edit', {
                user: {
                    ...currentUserData,
                    username: displayName || '',
                    bio: bio || ''
                },
                error: '自己紹介は500文字以内で入力してください',
                title: 'プロフィール編集'
            });
        }
        
        const updateData = {
            username: displayName.trim(),
            bio: bio ? bio.trim() : '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(userId).update(updateData);
        
        // セッションの更新
        req.session.user = { ...req.session.user, username: updateData.username };
        
        res.redirect('/profile?success=1');
    } catch (error) {
        console.error('プロフィール更新エラー:', error);
        
        // エラー時に現在のユーザーデータを取得
        try {
            const userDoc = await db.collection('users').doc(req.session.user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            res.status(500).render('profile-edit', {
                user: {
                    ...userData,
                    username: req.body.displayName || userData.username || '',
                    bio: req.body.bio || userData.bio || ''
                },
                error: 'プロフィールの更新に失敗しました',
                title: 'プロフィール編集'
            });
        } catch (fetchError) {
            console.error('ユーザーデータ取得エラー:', fetchError);
            res.status(500).render('error', { 
                message: 'プロフィールの更新に失敗しました',
                title: 'エラー'
            });
        }
    }
});

module.exports = router;