# Synapse Note 完全APIドキュメント

このドキュメントでは、Synapse Noteアプリケーションの全APIエンドポイントについて包括的に説明します。

## 概要

Synapse Note APIは以下のカテゴリに分類されます：

1. **公開API** (`/api/public/*`) - 認証不要でアクセス可能
2. **認証API** (`/api/user/*`) - ログインしたユーザーのみアクセス可能
3. **Google Apps Script API** (`/api/gas/*`) - 外部サービス連携用
4. **認証エンドポイント** - ユーザー登録・ログイン・ログアウト
5. **クイズ管理API** (`/quiz/*`) - クイズの作成・編集・実行
6. **プロフィール管理API** (`/profile/*`) - ユーザープロフィール操作
7. **管理者API** (`/admin/*`) - システム管理用（管理者のみ）
8. **Webページ** - メインアプリケーションのページ

## 基本URL

### 開発環境
```
http://localhost:3000
```

### 本番環境
```
https://your-domain.com
```

## 認証方式

Synapse Noteは**セッションベース認証**を使用します：

- ログイン後、サーバーがセッションCookieを発行
- 認証が必要なエンドポイントにはセッションCookieが自動送信される
- ログアウト時にセッションとCookieが削除される

### セッション設定
- **有効期限**: 24時間
- **Cookie名**: `connect.sid`
- **HttpOnly**: true（XSS攻撃対策）
- **Secure**: 本番環境でtrue（HTTPS必須）
- **SameSite**: lax（CSRF攻撃対策）

## レスポンス形式

### 成功時
```json
{
  "success": true,
  "data": { /* レスポンスデータ */ },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 公開API（認証不要）

### GET /api/public/stats
システム全体の統計情報を取得します。

**エンドポイント:** `GET /api/public/stats`

**認証:** 不要

**説明:** システム全体のユーザー数、クイズ数、実行回数などの統計情報を返します。Google Apps Scriptが設定されている場合は、まずGASから取得を試み、失敗した場合はローカルデータベースから取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalQuizzes": 89,
    "totalAttempts": 2341,
    "adminCount": 3,
    "quizzesByVisibility": {
      "public": 67,
      "private": 22
    },
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "source": "google-apps-script", // または "local-database"
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/public/users/count
登録ユーザー数のみを取得します。

**エンドポイント:** `GET /api/public/users/count`

**認証:** 不要

**説明:** システムに登録されているユーザー数のみを返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "count": 150,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "source": "google-apps-script", // または "local-database"
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/public/quizzes/count
クイズ総数のみを取得します。

**エンドポイント:** `GET /api/public/quizzes/count`

**認証:** 不要

**説明:** システムに登録されているクイズの総数を返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "count": 89,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "source": "google-apps-script", // または "local-database"
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Google Apps Script API

Synapse NoteはGoogle Apps Scriptとの連携機能を提供します。

### GET /api/gas/ping
Google Apps Scriptとの接続をテストします。

**エンドポイント:** `GET /api/gas/ping`

**認証:** 不要

**説明:** 設定されたGoogle Apps ScriptのURLに接続テストを行い、接続状態を返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "scriptUrl": "https://script.google.com/macros/s/.../exec",
    "testedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### POST /api/gas/action
Google Apps Scriptに任意のアクションを送信します。

**エンドポイント:** `POST /api/gas/action`

**認証:** 不要

**Content-Type:** `application/json`

**リクエストボディ:**
```json
{
  "action": "test_action",
  "data": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**必須パラメータ:**
- `action` (string): 実行するアクション名

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "result": "Action executed successfully",
    "processedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### POST /api/gas/submit-user-data
Google Apps Scriptにユーザーデータを送信します。

**エンドポイント:** `POST /api/gas/submit-user-data`

**認証:** 必要

**Content-Type:** `application/json`

**リクエストボディ:**
```json
{
  "data": {
    "userAction": "profile_update",
    "details": "User updated profile information"
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "submitted": true,
    "userId": "user123",
    "submittedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### POST /api/gas/submit-quiz-data
Google Apps Scriptにクイズデータを送信します。

**エンドポイント:** `POST /api/gas/submit-quiz-data`

**認証:** 必要

**Content-Type:** `application/json`

**リクエストボディ:**
```json
{
  "data": {
    "quizId": "quiz123",
    "action": "quiz_completed",
    "score": 85,
    "details": "Quiz completion data"
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "submitted": true,
    "userId": "user123",
    "submittedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 認証が必要なAPI

認証が必要なAPIを使用するには、事前にログインしてセッションを確立する必要があります。

### GET /api/user/profile
現在ログインしているユーザーのプロフィール情報を取得します。

**エンドポイント:** `GET /api/user/profile`

**認証:** 必要

**説明:** セッションから現在のユーザーIDを取得し、そのユーザーの詳細情報を返します。パスワードなどの機密情報は除外されます。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "uid": "user123",
    "username": "田中太郎",
    "handle": "@tanaka",
    "isAdmin": false,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "lastActivityAt": "2025-01-01T11:55:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/user/quizzes
現在のユーザーが作成したクイズの一覧を取得します。

**エンドポイント:** `GET /api/user/quizzes`

**認証:** 必要

**説明:** ログインユーザーが作成したすべてのクイズを作成日時の降順で返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "quizzes": [
      {
        "id": "quiz123",
        "title": "英語基礎文法テスト",
        "description": "基本的な英語の文法問題を集めたテストです。",
        "visibility": "public",
        "questionCount": 10,
        "createdAt": "2024-12-01T12:00:00.000Z",
        "updatedAt": "2024-12-01T12:00:00.000Z"
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/user/history
現在のユーザーのクイズ実行履歴を取得します（最新50件）。

**エンドポイント:** `GET /api/user/history`

**認証:** 必要

**説明:** ログインユーザーが実行したクイズの履歴を最新50件まで、実行日時の降順で返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "attempt123",
        "quizId": "quiz456",
        "quizTitle": "数学基礎問題",
        "score": 85,
        "totalQuestions": 10,
        "correctAnswers": 8,
        "attemptedAt": "2025-01-01T11:00:00.000Z",
        "completedAt": "2025-01-01T11:15:00.000Z"
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/user/stats
現在のユーザーの統計情報を取得します。

**エンドポイント:** `GET /api/user/stats`

**認証:** 必要

**説明:** ログインユーザーのクイズ作成数、実行回数、平均スコアなどの統計情報を計算して返します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "quizzesCreated": 5,
    "publicQuizzes": 3,
    "privateQuizzes": 2,
    "totalAttempts": 25,
    "completedAttempts": 23,
    "averageScore": 78.5,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 認証エンドポイント

### GET /register
ユーザー登録ページを表示します。

**エンドポイント:** `GET /register`

**認証:** 不要（ログイン済みの場合は `/dashboard` にリダイレクト）

**説明:** 新規ユーザー登録フォームを表示します。システム設定で登録が無効化されている場合は、エラーメッセージを表示します。

### POST /register
新規ユーザーを登録します。

**エンドポイント:** `POST /register`

**認証:** 不要

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `username` (string): 表示名
- `handle` (string): ハンドル名（@マークは自動付与）
- `password` (string): パスワード

**成功時:** `/dashboard` にリダイレクト

**失敗時:** 登録ページにエラーメッセージを表示

### GET /login
ログインページを表示します。

**エンドポイント:** `GET /login`

**認証:** 不要（ログイン済みの場合は `/dashboard` にリダイレクト）

**クエリパラメータ:**
- `error` (optional): エラーメッセージタイプ

### POST /login
ユーザーログインを処理します。

**エンドポイント:** `POST /login`

**認証:** 不要

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `handle` (string): ハンドル名（@マークあり/なし両方対応）
- `password` (string): パスワード

**成功時:** `/dashboard` にリダイレクト

**失敗時:** ログインページにエラーメッセージを表示

### GET /logout
ユーザーログアウトを処理します。

**エンドポイント:** `GET /logout`

**認証:** 不要

**説明:** セッションを破棄し、セッションCookieを削除して、トップページにリダイレクトします。

### 管理者初期設定

### GET /setup-admin
初回管理者設定ページを表示します。

**エンドポイント:** `GET /setup-admin`

**認証:** 不要

**説明:** データベースに管理者が存在しない場合のみアクセス可能。初回の管理者アカウント作成フォームを表示します。

### POST /setup-admin
初回管理者アカウントを作成します。

**エンドポイント:** `POST /setup-admin`

**認証:** 不要

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `username` (string): 管理者の表示名
- `handle` (string): 管理者のハンドル名
- `password` (string): 管理者のパスワード

## クイズ管理API

### クイズ作成

### GET /quiz/create-from-image
画像からクイズを作成するページを表示します。

**エンドポイント:** `GET /quiz/create-from-image`

**認証:** 必要

**説明:** 画像をアップロードしてAIでクイズを生成するページを表示します。

### POST /quiz/generate-from-image
画像からAIクイズを生成します。

**エンドポイント:** `POST /quiz/generate-from-image`

**認証:** 必要

**Content-Type:** `multipart/form-data`

**フォームパラメータ:**
- `images` (file[]): アップロード画像ファイル（最大10MB/枚）
- `prompt` (string): 追加のプロンプト指示
- `questionCount` (number): 生成する問題数
- `language` (string): 言語設定

### GET /quiz/create
テキストからクイズを作成するページを表示します。

**エンドポイント:** `GET /quiz/create`

**認証:** 必要

**説明:** テキスト入力または手動でクイズを作成するページを表示します。

### POST /quiz/create
クイズを作成します（AI生成または手動作成）。

**エンドポイント:** `POST /quiz/create`

**認証:** 必要

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `title` (string): クイズタイトル
- `description` (string): クイズ説明
- `visibility` (string): 公開設定（'public' または 'private'）
- `creationMethod` (string): 作成方法（'ai' または 'manual'）
- `textContent` (string): AI生成用のテキスト（AI作成時）
- `questions` (array): 手動作成時の質問データ

### POST /quiz/save-draft
クイズを下書きとして保存します。

**エンドポイント:** `POST /quiz/save-draft`

**認証:** 必要

**Content-Type:** `application/json`

**リクエストボディ:**
```json
{
  "title": "下書きクイズ",
  "questions": [
    {
      "question": "質問文",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correctAnswer": 0,
      "points": 10
    }
  ]
}
```

### クイズ管理

### GET /quiz/:quizId
クイズを表示・実行します。

**エンドポイント:** `GET /quiz/:quizId`

**認証:** プライベートクイズの場合は必要

**パラメータ:**
- `quizId` (string): クイズID

**説明:** 指定されたクイズを表示します。プライベートクイズの場合は作成者または管理者のみアクセス可能です。

### GET /quiz/:quizId/edit
クイズ編集ページを表示します。

**エンドポイント:** `GET /quiz/:quizId/edit`

**認証:** 必要（作成者または管理者のみ）

**パラメータ:**
- `quizId` (string): クイズID

### POST /quiz/:quizId/edit
クイズを更新します。

**エンドポイント:** `POST /quiz/:quizId/edit`

**認証:** 必要（作成者または管理者のみ）

**Content-Type:** `application/x-www-form-urlencoded`

**パラメータ:**
- `quizId` (string): クイズID

**フォームパラメータ:**
- `title` (string): クイズタイトル
- `visibility` (string): 公開設定
- `questions` (array): 質問データ

### GET /quiz/:quizId/delete
クイズを削除します。

**エンドポイント:** `GET /quiz/:quizId/delete`

**認証:** 必要（作成者または管理者のみ）

**パラメータ:**
- `quizId` (string): クイズID

**説明:** 指定されたクイズを削除し、作成者のクイズ一覧ページにリダイレクトします。

### POST /quiz/submit
クイズの回答を提出します。

**エンドポイント:** `POST /quiz/submit`

**認証:** 不要

**Content-Type:** `application/json`

**リクエストボディ:**
```json
{
  "quizId": "quiz123",
  "answers": [0, 2, 1, 3],
  "userId": "user123",
  "startTime": "2025-01-01T12:00:00.000Z",
  "endTime": "2025-01-01T12:15:00.000Z"
}
```

**レスポンス例:**
```json
{
  "success": true,
  "score": 85,
  "totalQuestions": 4,
  "correctAnswers": 3,
  "results": [
    {
      "questionIndex": 0,
      "isCorrect": true,
      "userAnswer": 0,
      "correctAnswer": 0
    }
  ]
}
```

## プロフィール管理API

### GET /profile/
現在のユーザーのプロフィールページを表示します。

**エンドポイント:** `GET /profile/`

**認証:** 必要

**説明:** ログインユーザーのプロフィール情報を表示するページです。

### GET /profile/edit
プロフィール編集ページを表示します。

**エンドポイント:** `GET /profile/edit`

**認証:** 必要

**説明:** ユーザー名、ハンドル名などの編集フォームを表示します。

### GET /profile/:handle
指定されたハンドルのユーザープロフィールを表示します。

**エンドポイント:** `GET /profile/:handle`

**認証:** 不要

**パラメータ:**
- `handle` (string): ユーザーハンドル（@マークあり/なし両方対応）

**説明:** 指定されたユーザーの公開プロフィール情報を表示します。

### POST /profile/update
プロフィール情報を更新します。

**エンドポイント:** `POST /profile/update`

**認証:** 必要

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `username` (string): 新しい表示名
- `handle` (string): 新しいハンドル名
- その他のプロフィール情報

## 管理者API

### GET /admin/
管理者ダッシュボードを表示します。

**エンドポイント:** `GET /admin/`

**認証:** 必要（管理者のみ）

**説明:** システム統計とクイックアクセスメニューを表示する管理者ダッシュボードです。

### GET /admin/users
ユーザー管理ページを表示します。

**エンドポイント:** `GET /admin/users`

**認証:** 必要（管理者のみ）

**説明:** システム内の全ユーザーリストと管理機能を表示します。

### GET /admin/quizzes
クイズ管理ページを表示します。

**エンドポイント:** `GET /admin/quizzes`

**認証:** 必要（管理者のみ）

**説明:** システム内の全クイズリストと管理機能を表示します。

### GET /admin/settings
システム設定ページを表示します。

**エンドポイント:** `GET /admin/settings`

**認証:** 必要（管理者のみ）

**説明:** システムの各種設定（ユーザー登録許可など）を管理するページです。

### POST /admin/settings
システム設定を更新します。

**エンドポイント:** `POST /admin/settings`

**認証:** 必要（管理者のみ）

**Content-Type:** `application/x-www-form-urlencoded`

**フォームパラメータ:**
- `allowRegistration` (boolean): ユーザー登録許可
- `registrationMessage` (string): 登録メッセージ
- その他システム設定

### POST /admin/users/:userId/promote
ユーザーを管理者に昇格させます。

**エンドポイント:** `POST /admin/users/:userId/promote`

**認証:** 必要（管理者のみ）

**パラメータ:**
- `userId` (string): 対象ユーザーID

### POST /admin/users/:userId/demote
管理者権限を削除します。

**エンドポイント:** `POST /admin/users/:userId/demote`

**認証:** 必要（管理者のみ）

**パラメータ:**
- `userId` (string): 対象ユーザーID

### POST /admin/users/:userId/delete
ユーザーを削除します。

**エンドポイント:** `POST /admin/users/:userId/delete`

**認証:** 必要（管理者のみ）

**パラメータ:**
- `userId` (string): 削除対象ユーザーID

### POST /admin/quizzes/:quizId/delete
クイズを削除します（管理者権限）。

**エンドポイント:** `POST /admin/quizzes/:quizId/delete`

**認証:** 必要（管理者のみ）

**パラメータ:**
- `quizId` (string): 削除対象クイズID

### POST /admin/cleanup
システムデータのクリーンアップを実行します。

**エンドポイント:** `POST /admin/cleanup`

**認証:** 必要（管理者のみ）

**説明:** 古いセッション、孤立したデータなどのクリーンアップを実行します。

## メインアプリケーションページ

### GET /
トップページを表示します。

**エンドポイント:** `GET /`

**認証:** 不要

**説明:** ログイン状態に応じて `/dashboard` または `/login` にリダイレクトします。

### GET /dashboard
ユーザーダッシュボードを表示します。

**エンドポイント:** `GET /dashboard`

**認証:** 必要

**説明:** ログインユーザーのメインダッシュボード画面です。

### GET /my-history
ユーザーのクイズ実行履歴を表示します。

**エンドポイント:** `GET /my-history`

**認証:** 必要

**説明:** ログインユーザーが実行したクイズの履歴ページです。

### GET /public-quizzes
公開クイズ一覧を表示します。

**エンドポイント:** `GET /public-quizzes`

**認証:** 不要

**説明:** 誰でもアクセス可能な公開クイズの一覧ページです。

### その他のページ

システムには他にも多くのページが存在します：

- **ヘルスチェック**: `GET /health` - システムの稼働状況を確認
- **管理者デモページ**: `GET /admin-demo*` - 管理者機能のデモンストレーション
- **404エラー**: 存在しないページへのアクセス時

## エラーレスポンス

### 400 Bad Request
不正なリクエストパラメータ：
```json
{
  "success": false,
  "error": "Action parameter is required",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 401 Unauthorized
認証が必要なエンドポイントに未ログイン状態でアクセスした場合：
```json
{
  "success": false,
  "error": "Authentication required",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 403 Forbidden
アクセス権限がない場合（管理者権限必要など）：
```json
{
  "success": false,
  "error": "Access denied. Admin privileges required.",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 404 Not Found
存在しないリソースにアクセスした場合：
```json
{
  "success": false,
  "error": "User not found",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 503 Service Unavailable
データベースが利用できない場合：
```json
{
  "success": false,
  "error": "Database not available",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 500 Internal Server Error
サーバー内部エラーが発生した場合：
```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## APIドキュメント確認

`GET /api/docs` エンドポイントにアクセスすることで、このAPIの仕様をJSON形式で確認できます。

**エンドポイント:** `GET /api/docs`

**認証:** 不要

**レスポンス例:**
```json
{
  "title": "Synapse Note API Documentation",
  "version": "1.0.0",
  "endpoints": {
    "public": {
      "GET /api/public/stats": "システム全体の統計情報を取得",
      "GET /api/public/users/count": "登録ユーザー数を取得",
      "GET /api/public/quizzes/count": "クイズ総数を取得"
    },
    "authenticated": {
      "GET /api/user/profile": "現在のユーザーのプロフィール情報を取得",
      "GET /api/user/quizzes": "現在のユーザーが作成したクイズ一覧を取得",
      "GET /api/user/history": "現在のユーザーのクイズ実行履歴を取得",
      "GET /api/user/stats": "現在のユーザーの統計情報を取得"
    }
  },
  "response_format": {
    "success": true,
    "data": {},
    "timestamp": "ISO 8601 timestamp"
  },
  "error_format": {
    "success": false,
    "error": "Error message",
    "timestamp": "ISO 8601 timestamp"
  }
}
```

## 使用例

### cURLでの使用例

#### 公開API
```bash
# システム統計を取得
curl "http://localhost:3000/api/public/stats"

# ユーザー数を取得
curl "http://localhost:3000/api/public/users/count"

# クイズ数を取得
curl "http://localhost:3000/api/public/quizzes/count"

# Google Apps Script接続テスト
curl "http://localhost:3000/api/gas/ping"
```

#### 認証が必要なAPI（セッションCookie使用）
```bash
# 事前にログインしてセッションCookieを保存
curl -c cookies.txt \
  -X POST \
  -d "handle=@testuser&password=password123" \
  "http://localhost:3000/login"

# セッションCookieを使用してユーザープロフィールを取得
curl -b cookies.txt "http://localhost:3000/api/user/profile"

# ユーザーのクイズ一覧を取得
curl -b cookies.txt "http://localhost:3000/api/user/quizzes"

# ユーザーの統計情報を取得
curl -b cookies.txt "http://localhost:3000/api/user/stats"
```

#### Google Apps Scriptとの連携
```bash
# Google Apps Scriptにアクションを送信
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"test_action","data":{"key":"value"}}' \
  "http://localhost:3000/api/gas/action"

# ユーザーデータをGoogle Apps Scriptに送信（認証必要）
curl -b cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":{"userAction":"profile_update"}}' \
  "http://localhost:3000/api/gas/submit-user-data"
```

#### クイズ関連操作
```bash
# クイズの回答を提出
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "quizId": "quiz123",
    "answers": [0, 2, 1, 3],
    "userId": "user123",
    "startTime": "2025-01-01T12:00:00.000Z",
    "endTime": "2025-01-01T12:15:00.000Z"
  }' \
  "http://localhost:3000/quiz/submit"

# 画像からクイズ生成（ファイルアップロード）
curl -b cookies.txt \
  -X POST \
  -F "images=@/path/to/image.jpg" \
  -F "prompt=数学の問題を作成してください" \
  -F "questionCount=5" \
  -F "language=ja" \
  "http://localhost:3000/quiz/generate-from-image"
```

### JavaScriptでの使用例

#### 基本的な使用方法
```javascript
// システム統計を取得
async function getSystemStats() {
  try {
    const response = await fetch('/api/public/stats');
    const data = await response.json();
    
    if (data.success) {
      console.log('総ユーザー数:', data.data.totalUsers);
      console.log('総クイズ数:', data.data.totalQuizzes);
      console.log('総実行回数:', data.data.totalAttempts);
    }
  } catch (error) {
    console.error('統計取得エラー:', error);
  }
}

// ユーザープロフィールを取得（ログイン済み）
async function getUserProfile() {
  try {
    const response = await fetch('/api/user/profile');
    const data = await response.json();
    
    if (data.success) {
      console.log('ユーザー名:', data.data.username);
      console.log('ハンドル:', data.data.handle);
      console.log('管理者:', data.data.isAdmin);
    } else if (response.status === 401) {
      console.log('ログインが必要です');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
  }
}
```

#### 認証フロー
```javascript
// ログイン処理
async function login(handle, password) {
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        handle: handle,
        password: password
      })
    });

    if (response.redirected) {
      // ログイン成功 - ダッシュボードにリダイレクト
      window.location.href = response.url;
    } else {
      // ログイン失敗 - エラーメッセージを表示
      const text = await response.text();
      console.error('ログイン失敗');
    }
  } catch (error) {
    console.error('ログインエラー:', error);
  }
}

// ログアウト処理
function logout() {
  window.location.href = '/logout';
}
```

#### クイズ機能
```javascript
// クイズ回答提出
async function submitQuizAnswers(quizId, answers, startTime) {
  try {
    const response = await fetch('/quiz/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quizId: quizId,
        answers: answers,
        userId: getCurrentUserId(), // 現在のユーザーIDを取得する関数
        startTime: startTime,
        endTime: new Date().toISOString()
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('スコア:', result.score);
      console.log('正解数:', result.correctAnswers, '/', result.totalQuestions);
      return result;
    } else {
      console.error('回答提出エラー:', result.error);
    }
  } catch (error) {
    console.error('提出処理エラー:', error);
  }
}

// 画像からクイズ生成
async function generateQuizFromImage(imageFile, prompt, questionCount) {
  try {
    const formData = new FormData();
    formData.append('images', imageFile);
    formData.append('prompt', prompt);
    formData.append('questionCount', questionCount);
    formData.append('language', 'ja');

    const response = await fetch('/quiz/generate-from-image', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      // 成功時は通常HTMLページにリダイレクトされる
      window.location.href = response.url;
    } else {
      console.error('クイズ生成エラー');
    }
  } catch (error) {
    console.error('画像アップロードエラー:', error);
  }
}
```

#### Google Apps Script連携
```javascript
// Google Apps Script接続テスト
async function testGoogleAppsScript() {
  try {
    const response = await fetch('/api/gas/ping');
    const data = await response.json();
    
    if (data.success) {
      console.log('GAS接続状態:', data.data.connected);
      console.log('スクリプトURL:', data.data.scriptUrl);
    }
  } catch (error) {
    console.error('GAS接続テストエラー:', error);
  }
}

// Google Apps Scriptにアクション送信
async function sendActionToGAS(action, actionData) {
  try {
    const response = await fetch('/api/gas/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action,
        data: actionData
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('GASアクション送信エラー:', error);
  }
}
```

#### 管理者機能（管理者のみ）
```javascript
// システム設定更新
async function updateSystemSettings(settings) {
  try {
    const formData = new URLSearchParams();
    Object.keys(settings).forEach(key => {
      formData.append(key, settings[key]);
    });

    const response = await fetch('/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (response.ok) {
      console.log('設定更新成功');
      window.location.reload();
    } else {
      console.error('設定更新失敗');
    }
  } catch (error) {
    console.error('設定更新エラー:', error);
  }
}

// ユーザーを管理者に昇格
async function promoteUser(userId) {
  try {
    const response = await fetch(`/admin/users/${userId}/promote`, {
      method: 'POST'
    });

    if (response.ok) {
      console.log('ユーザー昇格成功');
      window.location.reload();
    } else {
      console.error('ユーザー昇格失敗');
    }
  } catch (error) {
    console.error('昇格処理エラー:', error);
  }
}
```

## 開発者向け情報

### 環境変数

Synapse Noteの動作には以下の環境変数が必要です：

```bash
# 必須
SESSION_SECRET=your-session-secret-key

# Firebase設定（いずれか一つ）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
FIREBASE_PROJECT_ID=your-project-id

# オプション
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
USE_GOOGLE_APPS_SCRIPT=true
NODE_ENV=production
PORT=3000
```

### ヘルスチェック

システムの稼働状況を確認するためのヘルスチェックエンドポイント：

```bash
curl http://localhost:3000/health
```

**レスポンス例:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "firebase": true,
  "session": true,
  "ai": true,
  "googleAppsScript": {
    "configured": true,
    "enabled": true,
    "url": "https://script.google.com/macros/s/.../exec",
    "connection": "connected"
  },
  "credentials": {
    "firebaseJson": true,
    "firebaseFile": false,
    "projectId": true
  },
  "databaseConnection": "connected"
}
```

### レート制限

現在、Synapse NoteにはAPIレート制限は実装されていませんが、本番環境では以下を考慮してください：

- 画像アップロード: 10MB/ファイル
- セッション有効期限: 24時間
- AI生成: Gemini APIの制限に依存

### セキュリティ考慮事項

- **セッション管理**: サーバーサイドでセッション状態を管理
- **CSRF対策**: SameSite Cookieによる基本的な保護
- **XSS対策**: HttpOnly Cookieの使用
- **パスワード**: bcryptによるハッシュ化
- **権限管理**: 管理者/一般ユーザーの明確な分離

---

このドキュメントは Synapse Note v1.0.0 を基準に作成されています。最新の情報は `/api/docs` エンドポイントまたは `/health` エンドポイントで確認してください。