# Synapse Note API Documentation

このドキュメントでは、Synapse Noteアプリケーションに新しく追加されたAPIエンドポイントについて説明します。

## 概要

Synapse Note APIには以下の2種類のエンドポイントがあります：

1. **公開API** - 認証不要でアクセス可能
2. **認証API** - ログインしたユーザーのみアクセス可能

## 基本URL

```
http://localhost:3000/api
```

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

## 公開API (認証不要)

### GET /api/public/stats
システム全体の統計情報を取得します。

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
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/public/users/count
登録ユーザー数のみを取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "count": 150,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### GET /api/public/quizzes/count
クイズ総数のみを取得します。

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "count": 89,
    "generatedAt": "2025-01-01T12:00:00.000Z"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 認証が必要なAPI

認証が必要なAPIを使用するには、事前にログインしてセッションを確立する必要があります。

### GET /api/user/profile
現在ログインしているユーザーのプロフィール情報を取得します。

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

## エラーレスポンス

### 401 Unauthorized
認証が必要なエンドポイントに未ログイン状態でアクセスした場合：
```json
{
  "success": false,
  "error": "Authentication required",
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

## 使用例

### cURLでの使用例

```bash
# システム統計を取得
curl http://localhost:3000/api/public/stats

# ユーザー数を取得
curl http://localhost:3000/api/public/users/count

# ログイン後、ユーザープロフィールを取得（セッションクッキーが必要）
curl -b cookies.txt http://localhost:3000/api/user/profile
```

### JavaScriptでの使用例

```javascript
// システム統計を取得
fetch('/api/public/stats')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('総ユーザー数:', data.data.totalUsers);
      console.log('総クイズ数:', data.data.totalQuizzes);
    }
  });

// ユーザープロフィールを取得（ログイン済み）
fetch('/api/user/profile')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('ユーザー名:', data.data.username);
    } else if (response.status === 401) {
      console.log('ログインが必要です');
    }
  });
```