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
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

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

// プロフィール編集ページ
router.get('/edit', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

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

// ハンドルによる他のユーザーのプロフィール表示
router.get('/:handle', async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

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

// Discord設定ページ
router.get('/discord', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        const userId = req.session.user.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        const discordMappings = userData.discordMappings || [];
        
        res.render('discord-settings', { 
            user: userData,
            discordMappings,
            title: 'Discord設定',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Discord設定ページエラー:', error);
        res.status(500).render('error', { message: 'ページの読み込みに失敗しました' });
    }
});

// Discord設定追加
router.post('/discord/add', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('データベースに接続できません。'));
        }

        const userId = req.session.user.uid;
        const { nickname, discordId, description } = req.body;
        
        // バリデーション
        if (!nickname || !discordId) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('ニックネームとDiscord IDは必須です。'));
        }
        
        if (nickname.trim().length > 30) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('ニックネームは30文字以内で入力してください。'));
        }
        
        if (!/^[0-9]{17,19}$/.test(discordId.trim())) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('Discord IDは17-19桁の数字で入力してください。'));
        }
        
        if (description && description.trim().length > 100) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('説明は100文字以内で入力してください。'));
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        const discordMappings = userData.discordMappings || [];
        
        // 重複チェック（ニックネームとDiscord ID）
        const nicknameExists = discordMappings.some(mapping => mapping.nickname === nickname.trim());
        const discordIdExists = discordMappings.some(mapping => mapping.discordId === discordId.trim());
        
        if (nicknameExists) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('このニックネームは既に登録されています。'));
        }
        
        if (discordIdExists) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('このDiscord IDは既に登録されています。'));
        }
        
        // 最大登録数チェック（10個まで）
        if (discordMappings.length >= 10) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('最大10個まで登録できます。'));
        }
        
        const newMapping = {
            nickname: nickname.trim(),
            discordId: discordId.trim(),
            description: description ? description.trim() : '',
            createdAt: new Date()
        };
        
        discordMappings.push(newMapping);
        
        await db.collection('users').doc(userId).update({
            discordMappings: discordMappings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.redirect('/profile/discord?success=' + encodeURIComponent('Discord設定を追加しました。'));
    } catch (error) {
        console.error('Discord設定追加エラー:', error);
        res.redirect('/profile/discord?error=' + encodeURIComponent('設定の追加に失敗しました。'));
    }
});

// Discord設定更新
router.post('/discord/update', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('データベースに接続できません。'));
        }

        const userId = req.session.user.uid;
        const { editIndex, nickname, discordId, description } = req.body;
        
        // バリデーション
        if (!nickname || !discordId || editIndex === '') {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('必要な情報が不足しています。'));
        }
        
        const index = parseInt(editIndex);
        if (isNaN(index) || index < 0) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('無効なインデックスです。'));
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        const discordMappings = userData.discordMappings || [];
        
        if (index >= discordMappings.length) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('更新対象が見つかりません。'));
        }
        
        // 重複チェック（編集中のもの以外）
        const nicknameExists = discordMappings.some((mapping, i) => i !== index && mapping.nickname === nickname.trim());
        const discordIdExists = discordMappings.some((mapping, i) => i !== index && mapping.discordId === discordId.trim());
        
        if (nicknameExists) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('このニックネームは既に登録されています。'));
        }
        
        if (discordIdExists) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('このDiscord IDは既に登録されています。'));
        }
        
        // 更新
        discordMappings[index] = {
            ...discordMappings[index],
            nickname: nickname.trim(),
            discordId: discordId.trim(),
            description: description ? description.trim() : '',
            updatedAt: new Date()
        };
        
        await db.collection('users').doc(userId).update({
            discordMappings: discordMappings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.redirect('/profile/discord?success=' + encodeURIComponent('Discord設定を更新しました。'));
    } catch (error) {
        console.error('Discord設定更新エラー:', error);
        res.redirect('/profile/discord?error=' + encodeURIComponent('設定の更新に失敗しました。'));
    }
});

// Discord設定削除
router.post('/discord/delete', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('データベースに接続できません。'));
        }

        const userId = req.session.user.uid;
        const { index } = req.body;
        
        const deleteIndex = parseInt(index);
        if (isNaN(deleteIndex) || deleteIndex < 0) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('無効なインデックスです。'));
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.redirect('/login');
        }
        
        const userData = userDoc.data();
        const discordMappings = userData.discordMappings || [];
        
        if (deleteIndex >= discordMappings.length) {
            return res.redirect('/profile/discord?error=' + encodeURIComponent('削除対象が見つかりません。'));
        }
        
        // 削除
        discordMappings.splice(deleteIndex, 1);
        
        await db.collection('users').doc(userId).update({
            discordMappings: discordMappings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.redirect('/profile/discord?success=' + encodeURIComponent('Discord設定を削除しました。'));
    } catch (error) {
        console.error('Discord設定削除エラー:', error);
        res.redirect('/profile/discord?error=' + encodeURIComponent('設定の削除に失敗しました。'));
    }
});

// プロフィール更新
router.post('/update', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

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