// ----------------------------------------------------------------
// 1. モジュールのインポート
// ----------------------------------------------------------------
const express = require('express');
const session = require('express-session');
const path = require('path');
const admin = require('firebase-admin');
const { FirestoreStore } = require('@google-cloud/connect-firestore');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// ----------------------------------------------------------------
// 2. 初期化と設定
// ----------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDKの初期化
let db;
try {
  let adminConfig = {};
  
  // 環境変数からFirebase設定を読み込み
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Vercelなどのサーバーレス環境向け：JSON文字列から認証情報を取得
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    adminConfig.credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // ローカル開発環境向け：ファイルパスから認証情報を取得
    adminConfig.credential = admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    // No credentials provided - warn but don't exit
    console.warn("No Firebase credentials provided. Some features may not work.");
    console.warn("Please set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
  }
  
  // プロジェクトIDが明示的に設定されている場合は追加
  if (process.env.FIREBASE_PROJECT_ID) {
    adminConfig.projectId = process.env.FIREBASE_PROJECT_ID;
  }
  
  // Firebase Admin SDKを初期化（認証情報がある場合のみ）
  if (adminConfig.credential || process.env.NODE_ENV === 'production') {
    if (admin.apps.length === 0) {
      admin.initializeApp(adminConfig);
    }
    
    db = admin.firestore();
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.warn("Firebase Admin SDK not initialized - no credentials provided.");
    db = null;
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error("Application will continue without Firebase functionality.");
  console.error("Please ensure GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS is properly set.");
  db = null;
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

// セッションの設定 (FirestoreStoreを使用または fallback to memory store)
if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET environment variable is required");
    process.exit(1);
}

// Configure session store based on database availability
let sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1日
        sameSite: 'lax' // クロスドメイン問題を回避するための推奨設定
    }
};

// Use Firestore store if database is available, otherwise use memory store
if (db) {
    try {
        sessionConfig.store = new FirestoreStore({
            dataset: db,
            kind: 'express-sessions', // Firestoreに保存されるコレクション名
        });
        console.log("Using Firestore session store");
    } catch (error) {
        console.error("Failed to initialize Firestore session store:", error);
        console.log("Falling back to memory session store");
        // sessionConfig.store will be undefined, which means Express will use memory store
    }
} else {
    console.log("Database not available, using memory session store");
    // sessionConfig.store will be undefined, which means Express will use memory store
}

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
        firebase: !!db,
        session: !!process.env.SESSION_SECRET,
        ai: !!process.env.GEMINI_API_KEY,
        googleAppsScript: {
            configured: !!process.env.GOOGLE_APPS_SCRIPT_URL,
            enabled: process.env.USE_GOOGLE_APPS_SCRIPT !== 'false',
            url: process.env.GOOGLE_APPS_SCRIPT_URL || 'default'
        },
        credentials: {
            firebaseJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
            firebaseFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: !!process.env.FIREBASE_PROJECT_ID
        }
    };
    
    // Test database connection if available
    if (db) {
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
    } else {
        healthStatus.databaseConnection = 'not_configured';
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
    
    // Check if database is available before attempting to query
    if (!db) {
        console.error('Database not available for quiz ID check:', possibleQuizId);
        // If database is not available, still redirect to quiz route and let it handle the error
        return res.redirect(`/quiz/${encodeURIComponent(possibleQuizId)}`);
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