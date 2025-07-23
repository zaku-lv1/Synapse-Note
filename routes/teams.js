/**
 * Team Management Routes
 * Handles team creation, member management, and hunter/player assignments
 */

const express = require('express');
const router = express.Router();

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

// Team management dashboard
router.get('/', requireAuth, (req, res) => {
    res.render('teams/dashboard', { 
        title: 'チーム管理',
        user: req.session.user,
        teams: [] // Will be populated from database
    });
});

// Create new team
router.get('/create', requireAuth, (req, res) => {
    res.render('teams/create', {
        title: 'チーム作成',
        user: req.session.user
    });
});

// Handle team creation
router.post('/create', requireAuth, (req, res) => {
    const { teamName, description } = req.body;
    
    if (!teamName) {
        return res.render('teams/create', {
            title: 'チーム作成',
            user: req.session.user,
            error: 'チーム名は必須です'
        });
    }

    // TODO: Save team to database
    // For now, redirect with success message
    res.redirect('/teams?success=チームが作成されました');
});

// Random team creation
router.get('/random', requireAuth, (req, res) => {
    res.render('teams/random', {
        title: 'ランダムチーム作成',
        user: req.session.user
    });
});

// Handle random team creation
router.post('/random', requireAuth, (req, res) => {
    const { participants } = req.body;
    
    if (!participants || participants.length < 8) {
        return res.render('teams/random', {
            title: 'ランダムチーム作成',
            user: req.session.user,
            error: 'ランダムチーム作成には8人の参加者が必要です'
        });
    }

    // TODO: Implement random team generation logic
    res.redirect('/teams?success=ランダムチームが作成されました');
});

// Edit team
router.get('/:id/edit', requireAuth, (req, res) => {
    const teamId = req.params.id;
    
    // TODO: Fetch team from database
    res.render('teams/edit', {
        title: 'チーム編集',
        user: req.session.user,
        team: {
            id: teamId,
            name: 'サンプルチーム',
            members: [],
            hunters: []
        }
    });
});

// Handle team edit
router.post('/:id/edit', requireAuth, (req, res) => {
    const teamId = req.params.id;
    const { members, hunters } = req.body;
    
    // TODO: Update team in database
    res.redirect(`/teams/${teamId}?success=チームが更新されました`);
});

// View team details
router.get('/:id', requireAuth, (req, res) => {
    const teamId = req.params.id;
    
    // TODO: Fetch team from database
    res.render('teams/detail', {
        title: 'チーム詳細',
        user: req.session.user,
        team: {
            id: teamId,
            name: 'サンプルチーム',
            members: [],
            hunters: []
        }
    });
});

module.exports = router;