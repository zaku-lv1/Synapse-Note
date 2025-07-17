/**
 * Loading States Management
 * Provides functions to show/hide loading overlays and manage loading states
 */

class LoadingManager {
    constructor() {
        this.overlay = null;
        this.init();
    }

    /**
     * Initialize loading overlay
     */
    init() {
        // Create loading overlay if it doesn't exist
        if (!document.getElementById('loading-overlay')) {
            this.createOverlay();
        }
        this.overlay = document.getElementById('loading-overlay');
    }

    /**
     * Create the loading overlay HTML
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text" id="loading-text">処理中...</p>
                <p class="loading-subtext" id="loading-subtext">しばらくお待ちください</p>
                <div class="loading-progress">
                    <div class="loading-progress-bar indeterminate"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    /**
     * Show loading overlay with custom text
     * @param {string} text - Main loading text
     * @param {string} subtext - Additional loading text
     */
    show(text = '処理中...', subtext = 'しばらくお待ちください') {
        if (!this.overlay) this.init();
        
        const loadingText = document.getElementById('loading-text');
        const loadingSubtext = document.getElementById('loading-subtext');
        
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext) loadingSubtext.textContent = subtext;
        
        this.overlay.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide loading overlay
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Update loading text while loading is active
     * @param {string} text - New main text
     * @param {string} subtext - New subtext
     */
    updateText(text, subtext = '') {
        const loadingText = document.getElementById('loading-text');
        const loadingSubtext = document.getElementById('loading-subtext');
        
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext) loadingSubtext.textContent = subtext;
    }
}

// Global loading manager instance
const loadingManager = new LoadingManager();

/**
 * Quiz-specific loading functions
 */
const QuizLoading = {
    /**
     * Show loading for quiz grading
     */
    showGrading() {
        loadingManager.show(
            'クイズを採点中...',
            'AIが解答を分析しています。しばらくお待ちください。'
        );
    },

    /**
     * Show loading for quiz creation from text
     */
    showCreatingFromText() {
        loadingManager.show(
            'クイズを生成中...',
            'テキストからクイズを作成しています。'
        );
    },

    /**
     * Show loading for quiz creation from image
     */
    showCreatingFromImage() {
        loadingManager.show(
            '画像を解析中...',
            '画像からクイズを生成しています。'
        );
    },

    /**
     * Show loading for quiz saving
     */
    showSaving() {
        loadingManager.show(
            'クイズを保存中...',
            '少々お待ちください。'
        );
    },

    /**
     * Hide loading
     */
    hide() {
        loadingManager.hide();
    }
};

/**
 * Admin-specific loading functions
 */
const AdminLoading = {
    /**
     * Show loading for admin settings save
     */
    showSettingsSave() {
        loadingManager.show(
            'システム設定を保存中...',
            '設定を保存しています。しばらくお待ちください。'
        );
    },

    /**
     * Show loading for admin cleanup operation
     */
    showCleanup() {
        loadingManager.show(
            'ユーザーのクリーンアップを実行中...',
            '非アクティブユーザーを削除しています。この処理には時間がかかる場合があります。'
        );
    },

    /**
     * Hide loading
     */
    hide() {
        loadingManager.hide();
    }
};

/**
 * Form submission with loading state
 */
function submitFormWithLoading(form, loadingType = 'default') {
    // Prevent multiple submissions
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.classList.add('loading');
        submitButton.disabled = true;
    }

    // Show appropriate loading based on form type
    switch (loadingType) {
        case 'grading':
            QuizLoading.showGrading();
            break;
        case 'creating-text':
            QuizLoading.showCreatingFromText();
            break;
        case 'creating-image':
            QuizLoading.showCreatingFromImage();
            break;
        case 'saving':
            QuizLoading.showSaving();
            break;
        case 'admin-settings':
            AdminLoading.showSettingsSave();
            break;
        case 'admin-cleanup':
            AdminLoading.showCleanup();
            break;
        default:
            loadingManager.show('処理中...', 'しばらくお待ちください');
    }

    // Add form loading class
    form.classList.add('loading');
}

/**
 * Initialize loading for quiz forms
 */
function initializeQuizLoading() {
    // Quiz submission form
    const solveQuizForm = document.querySelector('form[action="/quiz/submit"]');
    if (solveQuizForm) {
        solveQuizForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'grading');
        });
    }

    // Quiz creation forms - text-based
    const createQuizForm = document.querySelector('form[action="/quiz/create"]');
    if (createQuizForm) {
        createQuizForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'creating-text');
        });
    }

    // Quiz creation forms - image-based
    const createFromImageForm = document.querySelector('form[action="/quiz/generate-from-image"]');
    if (createFromImageForm) {
        createFromImageForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'creating-image');
        });
    }

    // Quiz saving forms
    const saveDraftForm = document.querySelector('form[action="/quiz/save-draft"]');
    if (saveDraftForm) {
        saveDraftForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'saving');
        });
    }

    // Manual quiz creation form
    const manualCreateForm = document.querySelector('form[action="/quiz/manual-create"]');
    if (manualCreateForm) {
        manualCreateForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'saving');
        });
    }
}

/**
 * Initialize loading for admin forms
 */
function initializeAdminLoading() {
    // Admin settings form
    const adminSettingsForm = document.querySelector('form[action="/admin/settings"]');
    if (adminSettingsForm) {
        adminSettingsForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'admin-settings');
        });
    }

    // Admin cleanup form
    const adminCleanupForm = document.querySelector('form[action="/admin/cleanup"]');
    if (adminCleanupForm) {
        adminCleanupForm.addEventListener('submit', function(e) {
            submitFormWithLoading(this, 'admin-cleanup');
        });
    }
}

/**
 * Handle page errors and hide loading if necessary
 */
function handlePageErrors() {
    window.addEventListener('error', function() {
        loadingManager.hide();
    });

    window.addEventListener('unload', function() {
        loadingManager.hide();
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeQuizLoading();
    initializeAdminLoading();
    handlePageErrors();
});

// Export for global use
window.LoadingManager = LoadingManager;
window.QuizLoading = QuizLoading;
window.AdminLoading = AdminLoading;
window.loadingManager = loadingManager;