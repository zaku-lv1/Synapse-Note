// ----------------------------------------------------------------
// 1. モジュールのインポート
// ----------------------------------------------------------------
const express = require('express');
const session = require('express-session');
const path = require('path');
const admin = require('firebase-admin');
const FirestoreSessionStore = require('./services/firestoreSessionStore');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// ----------------------------------------------------------------
// 2. 初期化と設定
// ----------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK の初期化（クラウド環境専用）
let db;
try {
  // 必須環境変数をチェック
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required for Firebase initialization");
  }
  
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID environment variable is required for Firebase initialization");
  }
  
  // サーバーレス環境向け：JSON文字列から認証情報を取得
  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  const adminConfig = {
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  };
  
  // Firebase Admin SDKを初期化
  if (admin.apps.length === 0) {
    admin.initializeApp(adminConfig);
  }
  
  db = admin.firestore();
  console.log("Firebase Admin SDK initialized successfully for cloud deployment.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error("Application cannot continue without Firebase. Please ensure:");
  console.error("1. GOOGLE_APPLICATION_CREDENTIALS_JSON is set with valid service account JSON");
  console.error("2. FIREBASE_PROJECT_ID is set correctly");
  process.exit(1);
}

// Expressの基本設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cloudflare環境におけるプロキシ設定
// これにより、secure: true のクッキーが正しく機能します。
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// セッションの設定（Firebase Firestore使用）
if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET environment variable is required");
    process.exit(1);
}

// Firebase Firestoreを使用したセッションストアの設定
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new FirestoreSessionStore({
        database: db,
        collection: 'express-sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1日
        sameSite: 'lax' // クロスドメイン問題を回避するための推奨設定
    }
};

console.log("Using Firestore session store for cloud deployment");
app.use(session(sessionConfig));


// ----------------------------------------------------------------
// 3. ルーターの読み込みとマウント (★ここが重要★)
// ----------------------------------------------------------------

// 機能ごとに分割したルーターファイルを読み込みます
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const matchRoutes = require('./routes/matches');

// ★★★ ここからが修正点 ★★★

// 1. トップページへのアクセスを処理するルートハンドラを最優先で定義します
// これが、今回のERR_FAILEDエラーを解決する中心的な修正です。
app.get('/', (req, res) => {
    try {
        if (req.session && req.session.user) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        // 何があってもエラーは握りつぶしてログイン画面に飛ばす
        res.redirect('/login');
    }
});

// 2. 各ルーターを適切なパスにマウント（割り当て）します
//    より具体的なパス（/quiz）を先に記述するのがベストプラクティスです。
app.use('/api', apiRoutes);      // API関連 (/api/public/stats, /api/user/profile など)
app.use('/admin', adminRoutes);   // 管理者関連 (/admin/users, /admin/quizzes など)
app.use('/matches', matchRoutes); // 試合結果管理 (/matches, /matches/create など)
app.use('/quiz', quizRoutes); // クイズ関連 (/quiz/create-quiz など)
app.use('/', authRoutes);      // 認証関連 (/login, /register, /logout)
app.use('/', indexRoutes);     // その他 (/dashboard, /my-history など)
app.use('/profile', profileRoutes); // プロフィール関連 (/profile/edit, /profile/view など)

// ★★★ ここまでが修正点 ★★★

// ----------------------------------------------------------------
// 3.5. Health check endpoint
// ----------------------------------------------------------------
app.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        environment: process.env.NODE_ENV || 'development',
        firebase: true,
        session: true,
        ai: !!process.env.GEMINI_API_KEY,
        googleAppsScript: {
            configured: !!process.env.GOOGLE_APPS_SCRIPT_URL,
            enabled: process.env.USE_GOOGLE_APPS_SCRIPT !== 'false',
            url: process.env.GOOGLE_APPS_SCRIPT_URL || 'default'
        },
        credentials: {
            firebaseJson: true,
            projectId: true
        }
    };
    
    // Test database connection
    try {
        // Simple test query with timeout
        await Promise.race([
            db.collection('_health_check').limit(1).get(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 3000)
            )
        ]);
        healthStatus.databaseConnection = 'connected';
    } catch (error) {
        healthStatus.databaseConnection = 'failed';
        healthStatus.databaseError = error.message;
        healthStatus.status = 'degraded';
    }

    // Test Google Apps Script connection if configured
    if (healthStatus.googleAppsScript.configured && healthStatus.googleAppsScript.enabled) {
        try {
            const GoogleAppsScriptService = require('./services/googleAppsScriptService');
            const gasService = new GoogleAppsScriptService();
            
            const gasConnected = await Promise.race([
                gasService.testConnection(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Google Apps Script connection timeout')), 5000)
                )
            ]);
            
            healthStatus.googleAppsScript.connection = gasConnected ? 'connected' : 'failed';
        } catch (error) {
            healthStatus.googleAppsScript.connection = 'failed';
            healthStatus.googleAppsScript.error = error.message;
            // Don't degrade overall status for GAS connection issues since it's optional
        }
    } else {
        healthStatus.googleAppsScript.connection = 'not_tested';
    }
    
    res.json(healthStatus);
});

// ----------------------------------------------------------------
// 3.6. Quiz ID Catch-all Handler (before 404 handler)
// ----------------------------------------------------------------
// Handle direct quiz ID access (e.g., /kix1::c4hj6-1752593023673-052bf7d40ab6)
// and redirect to proper quiz route format (/quiz/:quizId)
app.get('/:possibleQuizId', async (req, res, next) => {
    const possibleQuizId = req.params.possibleQuizId;
    
    // Check if this looks like a quiz ID pattern
    // Quiz IDs often contain colons, dashes, alphanumeric characters
    // Pattern: must contain :: OR be a very long string with dashes (but not common page names)
    // We'll be more strict to avoid false positives
    const knownPages = ['dashboard', 'login', 'register', 'logout', 'my-quizzes', 'create-quiz', 'public-quizzes', 'my-history', 'profile', 'admin', 'health', 'nonexistent-page'];
    const quizIdPattern = /^[a-zA-Z0-9]+::|^[a-zA-Z0-9]+-[0-9]{10,}-[a-zA-Z0-9]+$/;
    
    if (knownPages.includes(possibleQuizId.toLowerCase()) || !quizIdPattern.test(possibleQuizId)) {
        // It's a known page or doesn't match quiz ID pattern, continue to 404 handler
        return next();
    }
    
    // Check if database is available for quiz ID check
    if (!db) {
        console.error('Database not available for quiz ID check:', possibleQuizId);
        return res.status(500).render('error', {
            title: 'データベースエラー - Database Error',
            message: 'データベースに接続できません。',
            user: req.session?.user || null
        });
    }
    
    try {
        // Add timeout for database query to prevent hanging in serverless environment
        const quizDoc = await Promise.race([
            db.collection('quizzes').doc(possibleQuizId).get(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
        ]);
        
        if (quizDoc.exists) {
            // Quiz exists, redirect to proper quiz route
            console.log(`Redirecting quiz access from /${possibleQuizId} to /quiz/${possibleQuizId}`);
            return res.redirect(`/quiz/${encodeURIComponent(possibleQuizId)}`);
        } else {
            // Quiz doesn't exist, but it looks like a quiz ID format
            // Render a specific error page for missing quizzes
            console.log(`Quiz not found: ${possibleQuizId}`);
            return res.status(404).render('404', {
                title: 'クイズが見つかりません - Quiz Not Found',
                message: 'お探しのクイズは削除されたか、URLが間違っている可能性があります。',
                quizId: possibleQuizId,
                user: req.session?.user || null
            });
        }
    } catch (error) {
        console.error(`Error checking quiz ID ${possibleQuizId}:`, error);
        // Database error: redirect to quiz route instead of showing error page
        // This way the quiz route can handle the proper error display
        console.log(`Database error for quiz-like ID: ${possibleQuizId}, redirecting to quiz route`);
        return res.redirect(`/quiz/${encodeURIComponent(possibleQuizId)}`);
    }
});

// ----------------------------------------------------------------
// 3.7. 404 Not Found ハンドラー (最後に配置)
// ----------------------------------------------------------------
// 全てのルートに一致しなかった場合の404エラーハンドラ
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'ページが見つかりません - 404 Not Found',
        user: req.session?.user || null
    });
});

// ----------------------------------------------------------------
// 4. サーバーの起動
// ----------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Synapse Note server is running on port ${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Local access: http://localhost:${PORT}`);
    }
});