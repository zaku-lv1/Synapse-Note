/**
 * Loading States Management
 * Provides functions to show/hide loading overlays and manage loading states
 */

class LoadingManager {
    constructor() {
        this.overlay = null;
        this.timeoutId = null;
        this.isShowing = false;
        this.init();
    }

    /**
     * Initialize loading overlay
     */
    init() {
        // Remove any existing loading overlays to prevent duplicates
        const existingOverlays = document.querySelectorAll('.loading-overlay');
        existingOverlays.forEach(overlay => {
            if (overlay.id !== 'loading-overlay') {
                overlay.remove();
            }
        });
        
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
     * @param {number} timeout - Optional timeout in milliseconds (default: 30000)
     */
    show(text = '処理中...', subtext = 'しばらくお待ちください', timeout = 30000) {
        if (!this.overlay) this.init();
        
        // Clear any existing timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        const loadingText = document.getElementById('loading-text');
        const loadingSubtext = document.getElementById('loading-subtext');
        
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext) loadingSubtext.textContent = subtext;
        
        this.overlay.classList.add('active');
        this.isShowing = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Set timeout to automatically hide loading after specified time
        if (timeout > 0) {
            this.timeoutId = setTimeout(() => {
                console.warn('Loading timeout reached, automatically hiding overlay');
                this.hide();
            }, timeout);
        }
    }

    /**
     * Hide loading overlay
     */
    hide() {
        // Clear timeout if exists
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        
        this.isShowing = false;
        
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

    /**
     * Force hide loading overlay and clean up all states
     * Use this as an emergency cleanup function
     */
    forceHide() {
        // Clear any timeouts
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        // Remove all loading overlays from the page
        const allOverlays = document.querySelectorAll('.loading-overlay');
        allOverlays.forEach(overlay => {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        });
        
        // Reset all loading states
        this.isShowing = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clean up any loading buttons
        const loadingButtons = document.querySelectorAll('.btn.loading');
        loadingButtons.forEach(btn => {
            btn.classList.remove('loading');
            btn.disabled = false;
        });
        
        // Clean up any loading forms
        const loadingForms = document.querySelectorAll('.form-container.loading');
        loadingForms.forEach(form => {
            form.classList.remove('loading');
            if (form._loadingCleanup) {
                form._loadingCleanup();
            }
        });
        
        console.log('Force hide completed - all loading states cleared');
    }

    /**
     * Check if loading is currently active
     * @returns {boolean}
     */
    isActive() {
        return this.isShowing;
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
        
        // Add grading-specific styling
        if (loadingManager.overlay) {
            loadingManager.overlay.classList.add('grading-mode');
        }
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
        
        // Remove grading-specific styling
        if (loadingManager.overlay) {
            loadingManager.overlay.classList.remove('grading-mode');
        }
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
    
    // Set up error recovery - hide loading if form submission fails
    const hideLoadingOnError = () => {
        loadingManager.hide();
        if (submitButton) {
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
        }
        form.classList.remove('loading');
    };
    
    // Add a backup timeout to prevent infinite loading
    const backupTimeout = setTimeout(() => {
        console.warn('Form submission timeout reached, hiding loading overlay');
        hideLoadingOnError();
    }, 60000); // 60 seconds backup timeout
    
    // Store cleanup function for potential use
    form._loadingCleanup = () => {
        clearTimeout(backupTimeout);
        hideLoadingOnError();
    };
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
 * Emergency loading cleanup - accessible globally
 */
function emergencyLoadingCleanup() {
    console.warn('Emergency loading cleanup triggered');
    if (window.loadingManager) {
        window.loadingManager.forceHide();
    }
    
    // Additional cleanup for any rogue loading elements
    document.querySelectorAll('.loading-overlay').forEach(el => {
        el.remove();
    });
    
    // Restore body scroll as final measure
    document.body.style.overflow = '';
}

/**
 * Handle page errors and hide loading if necessary
 */
function handlePageErrors() {
    // Hide loading on any JavaScript errors
    window.addEventListener('error', function(event) {
        console.error('Page error detected, hiding loading overlay:', event.error);
        loadingManager.hide();
    });

    // Hide loading on unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection detected, hiding loading overlay:', event.reason);
        loadingManager.hide();
    });

    // Hide loading when page is about to unload
    window.addEventListener('beforeunload', function() {
        loadingManager.hide();
    });
    
    // Hide loading when page becomes hidden (tab switch, minimize)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && loadingManager.isShowing) {
            console.warn('Page became hidden while loading was active, hiding overlay');
            loadingManager.hide();
        }
    });
    
    // Emergency keyboard shortcut: Ctrl+Shift+X to force hide loading
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'X') {
            emergencyLoadingCleanup();
        }
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
window.emergencyLoadingCleanup = emergencyLoadingCleanup;