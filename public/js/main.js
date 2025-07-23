/**
 * Synapse Note - Frontend JavaScript
 * 
 * このファイルはクライアントサイドのJavaScript機能を提供します：
 * - モバイルナビゲーションのハンバーガーメニュー制御
 * - PWA（Progressive Web App）機能のService Workerの登録
 * - ユーザーインターフェースの動的な動作制御
 * - カスタムアラート機能
 * 
 * 開発者向けメモ:
 * - DOM要素の取得時は常にnullチェックを行い、エラーの防止に努める
 * - イベントリスナーの追加は適切なタイミングで行う（DOMContentLoaded後）
 * - ブラウザサポートを考慮したポリフィルの使用
 */

// ===== カスタムアラート機能 =====
window.showCustomAlert = function(message, type = 'info', duration = 5000) {
    // アラートタイプのアイコンマッピング
    const icons = {
        success: '✓',
        error: '⚠',
        warning: '⚠',
        info: 'ℹ'
    };
    
    // アラート要素を作成
    const alert = document.createElement('div');
    alert.className = `custom-alert custom-alert-${type}`;
    alert.innerHTML = `
        <span class="alert-icon">${icons[type] || icons.info}</span>
        ${message}
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // ページの最初の .form-container または body に追加
    const container = document.querySelector('.form-container') || document.body;
    container.insertBefore(alert, container.firstChild);
    
    // 自動削除
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, duration);
    }
};

// browser alert を置き換える関数
window.originalAlert = window.alert;
window.alert = function(message) {
    window.showCustomAlert(message, 'info');
};

// ===== DOM読み込み完了後の初期化処理 =====
document.addEventListener('DOMContentLoaded', function() {
    // ハンバーガーメニューとヘッダー要素を取得
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const header = document.querySelector('header');

    // 要素が存在する場合のみイベントリスナーを設定
    // これにより、該当要素がないページでもエラーが発生しない
    if (hamburgerButton && header) {
        // ハンバーガーボタンのクリックイベント
        hamburgerButton.addEventListener('click', function() {
            // header要素の'mobile-menu-open'クラスをトグル
            // このクラスによってCSSでモバイルメニューの表示/非表示が制御される
            header.classList.toggle('mobile-menu-open');
            
            // アクセシビリティのためのaria-expanded属性の更新
            const isExpanded = header.classList.contains('mobile-menu-open');
            hamburgerButton.setAttribute('aria-expanded', isExpanded);
        });
        
        // モバイルメニュー外のクリックでメニューを閉じる
        document.addEventListener('click', function(event) {
            // クリックされた要素がヘッダー内でない場合
            if (!header.contains(event.target)) {
                header.classList.remove('mobile-menu-open');
                hamburgerButton.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Escapeキーでモバイルメニューを閉じる（アクセシビリティ向上）
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && header.classList.contains('mobile-menu-open')) {
                header.classList.remove('mobile-menu-open');
                hamburgerButton.setAttribute('aria-expanded', 'false');
                hamburgerButton.focus(); // フォーカスをボタンに戻す
            }
        });
    }
});

// ===== PWA (Progressive Web App) 機能 =====
// Service Workerの登録により、オフライン機能とキャッシュ機能を提供
if ('serviceWorker' in navigator) {
    // ページ読み込み完了後にService Workerを登録
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ ServiceWorker registration successful:', registration.scope);
            })
            .catch(err => {
                console.error('❌ ServiceWorker registration failed:', err);
            });
    });
}