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
  }
  // 上記のいずれも設定されていない場合は、デフォルトの認証情報を使用（Google Cloud環境など）
  
  // プロジェクトIDが明示的に設定されている場合は追加
  if (process.env.FIREBASE_PROJECT_ID) {
    adminConfig.projectId = process.env.FIREBASE_PROJECT_ID;
  }
  
  // Firebase Admin SDKを初期化
  if (admin.apps.length === 0) {
    admin.initializeApp(adminConfig);
  }
  
  db = admin.firestore();
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.error("Please ensure GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS is properly set.");
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

// セッションの設定 (FirestoreStoreを使用)
if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET environment variable is required");
    process.exit(1);
}

app.use(session({
    store: new FirestoreStore({
        dataset: db,
        kind: 'express-sessions', // Firestoreに保存されるコレクション名
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 本番環境ではtrue
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1日
        sameSite: 'lax' // クロスドメイン問題を回避するための推奨設定
    }
}));


// ----------------------------------------------------------------
// 3. ルーターの読み込みとマウント (★ここが重要★)
// ----------------------------------------------------------------

// 機能ごとに分割したルーターファイルを読み込みます
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

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
app.use('/admin', adminRoutes);   // 管理者関連 (/admin/users, /admin/quizzes など)
app.use('/quiz', quizRoutes); // クイズ関連 (/quiz/create-quiz など)
app.use('/', authRoutes);      // 認証関連 (/login, /register, /logout)
app.use('/', indexRoutes);     // その他 (/dashboard, /my-history など)
app.use('/profile', profileRoutes); // プロフィール関連 (/profile/edit, /profile/view など)

// ★★★ ここまでが修正点 ★★★

// ----------------------------------------------------------------
// 3.5. Health check endpoint
// ----------------------------------------------------------------
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        environment: process.env.NODE_ENV || 'development',
        firebase: !!db,
        session: !!process.env.SESSION_SECRET,
        ai: !!process.env.GEMINI_API_KEY
    };
    
    res.json(healthStatus);
});

// ----------------------------------------------------------------
// 3.6. 404 Not Found ハンドラー (最後に配置)
// ----------------------------------------------------------------
// 全てのルートに一致しなかった場合の404エラーハンドラ
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'ページが見つかりません - 404 Not Found'
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