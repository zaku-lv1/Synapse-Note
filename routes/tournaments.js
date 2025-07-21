/**
 * tournaments.js - Tournament and Match management routes
 * 
 * Handles:
 * - Tournament creation, viewing, and management
 * - Match scheduling and execution
 * - Tournament participant management
 * - Test data generation for tournaments
 */

const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');

// --- Middleware ---
function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send('管理者権限が必要です。');
    }
    next();
}

// --- Helper Functions ---
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// --- Tournament Routes ---

// Tournament list page
router.get('/', async (req, res) => {
    try {
        const tournamentsCollection = await databaseService.getCollection('tournaments');
        const tournamentsSnapshot = await tournamentsCollection.orderBy('createdAt', 'desc').get();
        
        const tournaments = tournamentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render('tournaments/list', {
            title: '大会一覧',
            user: req.session.user,
            tournaments
        });
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).send('サーバーエラーが発生しました。');
    }
});

// Tournament detail page
router.get('/:tournamentId', async (req, res) => {
    try {
        const tournamentDoc = await databaseService.getDocument('tournaments', req.params.tournamentId);
        const tournament = await tournamentDoc.get();

        if (!tournament.exists) {
            return res.status(404).send('大会が見つかりません。');
        }

        // Get participants
        const participantsCollection = await databaseService.getCollection('tournament_participants');
        const participantsSnapshot = await participantsCollection.where('tournamentId', '==', req.params.tournamentId).get();
        
        // Get matches
        const matchesCollection = await databaseService.getCollection('matches');
        const matchesSnapshot = await matchesCollection.where('tournamentId', '==', req.params.tournamentId).orderBy('round', 'asc').get();

        const participants = participantsSnapshot.docs.map(doc => doc.data());
        const matches = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.render('tournaments/detail', {
            title: tournament.data().name,
            user: req.session.user,
            tournament: { id: tournament.id, ...tournament.data() },
            participants,
            matches
        });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).send('サーバーエラーが発生しました。');
    }
});

// Create tournament page (admin only)
router.get('/create', requireLogin, requireAdmin, (req, res) => {
    res.render('tournaments/create', {
        title: '大会作成',
        user: req.session.user
    });
});

// Create tournament (POST)
router.post('/create', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { name, description, startDate, endDate, maxParticipants, entryFee } = req.body;
        
        const tournament = {
            name,
            description,
            organizerId: req.session.user.id,
            status: 'upcoming',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            maxParticipants: parseInt(maxParticipants) || 16,
            entryFee: parseInt(entryFee) || 0,
            prizePool: { first: '優勝', second: '準優勝', third: '3位' },
            rules: { format: 'single_elimination', timeLimit: 300 },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const tournamentsCollection = await databaseService.getCollection('tournaments');
        const result = await tournamentsCollection.add(tournament);

        res.redirect(`/tournaments/${result.id}`);
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).send('大会作成中にエラーが発生しました。');
    }
});

// Join tournament
router.post('/:tournamentId/join', requireLogin, async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;
        const userId = req.session.user.id;

        // Check if tournament exists and is joinable
        const tournamentDoc = await databaseService.getDocument('tournaments', tournamentId);
        const tournament = await tournamentDoc.get();

        if (!tournament.exists) {
            return res.status(404).json({ error: '大会が見つかりません。' });
        }

        const tournamentData = tournament.data();
        if (tournamentData.status !== 'upcoming') {
            return res.status(400).json({ error: '参加受付が終了しています。' });
        }

        // Check if already joined
        const participantsCollection = await databaseService.getCollection('tournament_participants');
        const existingParticipant = await participantsCollection
            .where('tournamentId', '==', tournamentId)
            .where('userId', '==', userId)
            .get();

        if (!existingParticipant.empty) {
            return res.status(400).json({ error: '既に参加登録済みです。' });
        }

        // Add participant
        const participant = {
            tournamentId,
            userId,
            registeredAt: new Date(),
            status: 'registered'
        };

        await participantsCollection.add(participant);

        res.json({ success: true, message: '大会に参加登録しました。' });
    } catch (error) {
        console.error('Error joining tournament:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// Start tournament (admin only)
router.post('/:tournamentId/start', requireLogin, requireAdmin, async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;
        
        // Update tournament status
        const tournamentDoc = await databaseService.getDocument('tournaments', tournamentId);
        await tournamentDoc.update({
            status: 'active',
            updatedAt: new Date()
        });

        // Generate first round matches
        await generateTournamentMatches(tournamentId);

        res.json({ success: true, message: '大会を開始しました。' });
    } catch (error) {
        console.error('Error starting tournament:', error);
        res.status(500).json({ error: '大会開始中にエラーが発生しました。' });
    }
});

// --- Match Routes ---

// Match detail page
router.get('/matches/:matchId', async (req, res) => {
    try {
        const matchDoc = await databaseService.getDocument('matches', req.params.matchId);
        const match = await matchDoc.get();

        if (!match.exists) {
            return res.status(404).send('試合が見つかりません。');
        }

        const matchData = match.data();

        // Get participant details
        const [participant1Doc, participant2Doc] = await Promise.all([
            (await databaseService.getDocument('users', matchData.participant1Id)).get(),
            (await databaseService.getDocument('users', matchData.participant2Id)).get()
        ]);

        const participant1 = participant1Doc.exists ? participant1Doc.data() : null;
        const participant2 = participant2Doc.exists ? participant2Doc.data() : null;

        // Get quiz if assigned
        let quiz = null;
        if (matchData.quizId) {
            const quizDoc = await databaseService.getDocument('quizzes', matchData.quizId);
            const quizData = await quizDoc.get();
            if (quizData.exists) {
                quiz = { id: quizData.id, ...quizData.data() };
            }
        }

        res.render('tournaments/match', {
            title: `試合詳細 - ラウンド${matchData.round}`,
            user: req.session.user,
            match: { id: match.id, ...matchData },
            participant1,
            participant2,
            quiz
        });
    } catch (error) {
        console.error('Error fetching match:', error);
        res.status(500).send('サーバーエラーが発生しました。');
    }
});

// Start match
router.post('/matches/:matchId/start', requireLogin, async (req, res) => {
    try {
        const matchId = req.params.matchId;
        const userId = req.session.user.id;

        const matchDoc = await databaseService.getDocument('matches', matchId);
        const match = await matchDoc.get();

        if (!match.exists) {
            return res.status(404).json({ error: '試合が見つかりません。' });
        }

        const matchData = match.data();

        // Check if user is a participant
        if (matchData.participant1Id !== userId && matchData.participant2Id !== userId) {
            return res.status(403).json({ error: '参加者のみ試合を開始できます。' });
        }

        if (matchData.status !== 'scheduled') {
            return res.status(400).json({ error: '試合は既に開始されているか終了しています。' });
        }

        // Update match status
        await matchDoc.update({
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date()
        });

        res.json({ success: true, message: '試合を開始しました。' });
    } catch (error) {
        console.error('Error starting match:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// --- Test Data Generation ---

// Generate test tournaments and matches
router.post('/test/generate', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { tournamentCount = 2, participantsPerTournament = 8 } = req.body;
        
        console.log('Generating test tournament data...');
        
        // Create test users if they don't exist
        const testUsers = await createTestUsers(participantsPerTournament * tournamentCount);
        
        // Create test quizzes
        const testQuizzes = await createTestQuizzes(10);
        
        // Create test tournaments
        const tournaments = [];
        for (let i = 0; i < tournamentCount; i++) {
            const tournament = await createTestTournament(i + 1, testUsers.slice(i * participantsPerTournament, (i + 1) * participantsPerTournament), testQuizzes);
            tournaments.push(tournament);
        }

        res.json({ 
            success: true, 
            message: `${tournamentCount}個の大会、${testUsers.length}人の参加者、${testQuizzes.length}個のクイズを生成しました。`,
            tournaments: tournaments.map(t => ({ id: t.id, name: t.name }))
        });
    } catch (error) {
        console.error('Error generating test data:', error);
        res.status(500).json({ error: 'テストデータ生成中にエラーが発生しました。' });
    }
});

// --- Helper Functions ---

async function createTestUsers(count) {
    const usersCollection = await databaseService.getCollection('users');
    const users = [];

    for (let i = 1; i <= count; i++) {
        const userId = `testuser${i}_${Date.now()}`;
        const user = {
            username: `テストユーザー${i}`,
            handle: `@testuser${i}_${Date.now()}`,
            password: 'hashed_password', // In real app, this would be properly hashed
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const userDoc = await databaseService.getDocument('users', userId);
        await userDoc.set(user);
        users.push({ id: userId, ...user });
    }

    return users;
}

async function createTestQuizzes(count) {
    const quizzesCollection = await databaseService.getCollection('quizzes');
    const quizzes = [];

    for (let i = 1; i <= count; i++) {
        const quizId = `testquiz${i}_${Date.now()}`;
        const quiz = {
            title: `テストクイズ${i}`,
            description: `大会用テストクイズ${i}`,
            ownerId: 'system',
            creatorId: 'system',
            visibility: 'public',
            questions: [
                {
                    question: `問題${i}-1: 2 + 2 = ?`,
                    options: ['3', '4', '5', '6'],
                    correctAnswer: 1,
                    points: 10
                },
                {
                    question: `問題${i}-2: 日本の首都は？`,
                    options: ['大阪', '名古屋', '東京', '神戸'],
                    correctAnswer: 2,
                    points: 10
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const quizDoc = await databaseService.getDocument('quizzes', quizId);
        await quizDoc.set(quiz);
        quizzes.push({ id: quizId, ...quiz });
    }

    return quizzes;
}

async function createTestTournament(index, participants, quizzes) {
    const tournamentsCollection = await databaseService.getCollection('tournaments');
    
    const tournamentId = `testtournament${index}_${Date.now()}`;
    const tournament = {
        name: `テスト大会${index}`,
        description: `テスト用の大会${index}です。システムの動作確認に使用されます。`,
        organizerId: 'system',
        status: 'upcoming',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        maxParticipants: participants.length,
        entryFee: 0,
        prizePool: { 
            first: '金メダル', 
            second: '銀メダル', 
            third: '銅メダル' 
        },
        rules: { 
            format: 'single_elimination', 
            timeLimit: 300,
            questionsPerMatch: 5
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const tournamentDoc = await databaseService.getDocument('tournaments', tournamentId);
    await tournamentDoc.set(tournament);

    // Add participants
    const participantsCollection = await databaseService.getCollection('tournament_participants');
    for (const participant of participants) {
        const participantData = {
            tournamentId,
            userId: participant.id,
            registeredAt: new Date(),
            status: 'registered'
        };
        await participantsCollection.add(participantData);
    }

    // Generate matches for the tournament
    if (participants.length >= 2) {
        await generateTournamentMatches(tournamentId, participants, quizzes);
    }

    return { id: tournamentId, ...tournament };
}

async function generateTournamentMatches(tournamentId, participants = null, quizzes = null) {
    // Get participants if not provided
    if (!participants) {
        const participantsCollection = await databaseService.getCollection('tournament_participants');
        const participantsSnapshot = await participantsCollection
            .where('tournamentId', '==', tournamentId)
            .where('status', '==', 'registered')
            .get();
        
        participants = participantsSnapshot.docs.map(doc => ({ userId: doc.data().userId }));
    }

    // Get available quizzes if not provided
    if (!quizzes) {
        const quizzesCollection = await databaseService.getCollection('quizzes');
        const quizzesSnapshot = await quizzesCollection.where('visibility', '==', 'public').get();
        quizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (participants.length < 2) {
        throw new Error('参加者が不足しています。');
    }

    // Generate first round matches
    const matchesCollection = await databaseService.getCollection('matches');
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledParticipants.length; i += 2) {
        if (i + 1 < shuffledParticipants.length) {
            const match = {
                tournamentId,
                round: 1,
                matchNumber: Math.floor(i / 2) + 1,
                participant1Id: shuffledParticipants[i].userId || shuffledParticipants[i].id,
                participant2Id: shuffledParticipants[i + 1].userId || shuffledParticipants[i + 1].id,
                winnerId: null,
                quizId: quizzes[Math.floor(Math.random() * quizzes.length)]?.id || null,
                status: 'scheduled',
                scheduledAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in next week
                scores: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await matchesCollection.add(match);
        }
    }
}

module.exports = router;