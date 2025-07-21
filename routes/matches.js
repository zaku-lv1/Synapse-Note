/**
 * matches.js - 試合結果管理のルーティング
 * 
 * - チームメンバー管理
 * - 試合結果管理
 * - Discord ID連携
 */

const express = require('express');
const { getDb } = require('../services/database');
const router = express.Router();

// 認証ミドルウェア（ログインユーザーのみアクセス可能）
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login?error=login_required');
    }
    next();
}

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

// ===== チームメンバー管理 =====

// チームメンバー一覧表示
router.get('/members', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        const membersSnapshot = await db.collection('team_members')
            .orderBy('name', 'asc')
            .get();
        
        const members = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render('matches/members', { 
            user: req.session.user, 
            members,
            message: req.query.message,
            error: req.query.error
        });
    } catch (error) {
        console.error("Team members list error:", error);
        res.status(500).render('error', { 
            message: 'チームメンバー一覧の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// チームメンバー追加
router.post('/members', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/matches/members?error=データベースに接続できません。');
        }

        const { name, discordId, position, isActive } = req.body;
        
        // バリデーション
        if (!name || !discordId) {
            return res.redirect('/matches/members?error=名前とDiscord IDは必須です。');
        }

        // Discord ID の重複チェック
        const existingMemberSnapshot = await db.collection('team_members')
            .where('discordId', '==', discordId)
            .get();
        
        if (!existingMemberSnapshot.empty) {
            return res.redirect('/matches/members?error=このDiscord IDは既に登録されています。');
        }

        // メンバー追加
        await db.collection('team_members').add({
            name: name.trim(),
            discordId: discordId.trim(),
            position: position?.trim() || '',
            isActive: isActive === 'on',
            createdAt: new Date(),
            createdBy: req.session.user.uid
        });

        res.redirect('/matches/members?message=チームメンバーを追加しました。');
    } catch (error) {
        console.error("Add team member error:", error);
        res.redirect('/matches/members?error=チームメンバーの追加中にエラーが発生しました。');
    }
});

// チームメンバー更新
router.post('/members/:memberId/update', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/matches/members?error=データベースに接続できません。');
        }

        const memberId = req.params.memberId;
        const { name, discordId, position, isActive } = req.body;
        
        // バリデーション
        if (!name || !discordId) {
            return res.redirect('/matches/members?error=名前とDiscord IDは必須です。');
        }

        // Discord ID の重複チェック（自分以外）
        const existingMemberSnapshot = await db.collection('team_members')
            .where('discordId', '==', discordId)
            .get();
        
        const duplicateMember = existingMemberSnapshot.docs.find(doc => doc.id !== memberId);
        if (duplicateMember) {
            return res.redirect('/matches/members?error=このDiscord IDは既に他のメンバーが使用しています。');
        }

        // メンバー更新
        await db.collection('team_members').doc(memberId).update({
            name: name.trim(),
            discordId: discordId.trim(),
            position: position?.trim() || '',
            isActive: isActive === 'on',
            updatedAt: new Date(),
            updatedBy: req.session.user.uid
        });

        res.redirect('/matches/members?message=チームメンバーを更新しました。');
    } catch (error) {
        console.error("Update team member error:", error);
        res.redirect('/matches/members?error=チームメンバーの更新中にエラーが発生しました。');
    }
});

// チームメンバー削除
router.post('/members/:memberId/delete', requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/matches/members?error=データベースに接続できません。');
        }

        const memberId = req.params.memberId;
        
        // メンバーが試合結果で使用されているかチェック
        const matchResultsSnapshot = await db.collection('match_results')
            .where('players', 'array-contains', memberId)
            .get();
        
        if (!matchResultsSnapshot.empty) {
            return res.redirect('/matches/members?error=このメンバーは試合結果で使用されているため削除できません。');
        }

        await db.collection('team_members').doc(memberId).delete();

        res.redirect('/matches/members?message=チームメンバーを削除しました。');
    } catch (error) {
        console.error("Delete team member error:", error);
        res.redirect('/matches/members?error=チームメンバーの削除中にエラーが発生しました。');
    }
});

// ===== 試合結果管理 =====

// 試合結果一覧表示
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        const matchResultsSnapshot = await db.collection('match_results')
            .orderBy('matchDate', 'desc')
            .limit(20)
            .get();
        
        const matchResults = [];
        
        for (const doc of matchResultsSnapshot.docs) {
            const matchData = doc.data();
            
            // プレイヤー情報を取得
            const playerNames = [];
            if (matchData.players && matchData.players.length > 0) {
                for (const playerId of matchData.players) {
                    try {
                        const memberDoc = await db.collection('team_members').doc(playerId).get();
                        if (memberDoc.exists) {
                            playerNames.push(memberDoc.data().name);
                        } else {
                            playerNames.push('不明なプレイヤー');
                        }
                    } catch (err) {
                        playerNames.push('エラー');
                    }
                }
            }
            
            matchResults.push({
                id: doc.id,
                ...matchData,
                playerNames
            });
        }

        res.render('matches/index', { 
            user: req.session.user, 
            matchResults,
            message: req.query.message,
            error: req.query.error
        });
    } catch (error) {
        console.error("Match results list error:", error);
        res.status(500).render('error', { 
            message: '試合結果一覧の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// 試合結果追加画面
router.get('/create', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).render('error', {
                message: 'データベースに接続できません。',
                user: req.session.user
            });
        }

        // アクティブなチームメンバー一覧を取得
        const membersSnapshot = await db.collection('team_members')
            .where('isActive', '==', true)
            .orderBy('name', 'asc')
            .get();
        
        const members = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render('matches/create', { 
            user: req.session.user, 
            members,
            error: req.query.error
        });
    } catch (error) {
        console.error("Match create page error:", error);
        res.status(500).render('error', { 
            message: '試合結果作成画面の読み込み中にエラーが発生しました。',
            user: req.session.user 
        });
    }
});

// 試合結果追加
router.post('/create', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.redirect('/matches/create?error=データベースに接続できません。');
        }

        const { matchDate, opponent, players, result, score, notes } = req.body;
        
        // バリデーション
        if (!matchDate || !opponent || !players || !result) {
            return res.redirect('/matches/create?error=必須項目を全て入力してください。');
        }

        // プレイヤーIDの配列に変換
        const playerIds = Array.isArray(players) ? players : [players];
        
        // 試合結果追加
        await db.collection('match_results').add({
            matchDate: new Date(matchDate),
            opponent: opponent.trim(),
            players: playerIds,
            result: result, // 'win', 'lose', 'draw'
            score: score?.trim() || '',
            notes: notes?.trim() || '',
            createdAt: new Date(),
            createdBy: req.session.user.uid
        });

        res.redirect('/matches?message=試合結果を追加しました。');
    } catch (error) {
        console.error("Add match result error:", error);
        res.redirect('/matches/create?error=試合結果の追加中にエラーが発生しました。');
    }
});

// ===== API エンドポイント =====

// アクティブなチームメンバー一覧API（JSON）
router.get('/api/members', requireAuth, async (req, res) => {
    try {
        const db = getDb();
        if (!db) {
            return res.status(500).json({ error: 'データベースに接続できません。' });
        }

        const membersSnapshot = await db.collection('team_members')
            .where('isActive', '==', true)
            .orderBy('name', 'asc')
            .get();
        
        const members = membersSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            discordId: doc.data().discordId,
            position: doc.data().position
        }));

        res.json(members);
    } catch (error) {
        console.error("API members error:", error);
        res.status(500).json({ error: 'チームメンバー情報の取得中にエラーが発生しました。' });
    }
});

module.exports = router;