/**
 * Synapse Note - Manual Quiz Creation JavaScript
 * 
 * このファイルは手動クイズ作成ページの動的機能を提供します：
 * - 問題の追加・削除・編集
 * - 選択肢の動的管理（選択式問題の場合）
 * - 問題タイプの変更対応（選択式・短答式・記述式）
 * - フォームデータの同期と保存
 * 
 * 開発者向けメモ:
 * - 全ての問題データは配列`questions`で管理される
 * - DOM操作後は必ずhiddenフィールドの更新を行う
 * - ユーザー入力の検証とサニタイゼーションを考慮する
 */

// ===== グローバル状態管理 =====
let questions = []; // 全ての問題データを保持する配列

/**
 * 問題一覧をDOMに描画する
 * 各問題カードを動的に生成し、適切なイベントハンドラーを設定
 */
function renderQuestions() {
    const area = document.getElementById('questionsArea');
    if (!area) return; // 要素が存在しない場合は早期リターン
    
    // 既存のコンテンツをクリア
    area.innerHTML = '';
    
    // 各問題に対してカードを生成
    questions.forEach((q, i) => {
        area.innerHTML += `
            <div class="question-editor-card">
                <!-- 問題文入力 -->
                <label>問題文 
                    <input type="text" 
                           value="${escapeHtml(q.question || '')}" 
                           onchange="updateQuestion(${i}, 'question', this.value)"
                           placeholder="問題文を入力してください">
                </label>
                
                <!-- 問題タイプ選択 -->
                <label>タイプ
                    <select onchange="updateQuestion(${i}, 'type', this.value)">
                        <option value="multiple_choice" ${q.type==='multiple_choice'?'selected':''}>選択式</option>
                        <option value="short_answer" ${q.type==='short_answer'?'selected':''}>短答式</option>
                        <option value="descriptive" ${q.type==='descriptive'?'selected':''}>記述式</option>
                    </select>
                </label>
                
                <!-- 配点設定 -->
                <label>配点 
                    <input type="number" 
                           value="${q.points||10}" 
                           min="1" 
                           max="100"
                           onchange="updateQuestion(${i}, 'points', this.value)">
                </label>
                
                <!-- 選択式の場合のみ選択肢を表示 -->
                ${q.type === 'multiple_choice' ? renderOptions(i, q) : ''}
                
                <!-- 正解入力 -->
                <label>正解 
                    <input type="text" 
                           value="${escapeHtml(q.answer||'')}" 
                           onchange="updateQuestion(${i}, 'answer', this.value)"
                           placeholder="正解を入力してください">
                </label>
                
                <!-- 問題削除ボタン -->
                <button type="button" 
                        class="delete-question-btn" 
                        onclick="removeQuestion(${i})"
                        title="この問題を削除">
                    問題を削除
                </button>
            </div>
        `;
    });
    
    // 隠しフィールドを更新（フォーム送信時にサーバーに送るデータ）
    updateHiddenInput();
}

/**
 * 選択式問題の選択肢を描画する
 * @param {number} idx - 問題のインデックス
 * @param {Object} q - 問題オブジェクト
 * @returns {string} - 選択肢のHTML
 */
function renderOptions(idx, q) {
    const options = q.options || ["", ""]; // デフォルトで2つの空の選択肢
    
    return `
        <div class="options-area">
            <label>選択肢:</label>
            ${options.map((opt, j) => `
                <div class="options-area-row">
                    <input type="text" 
                           value="${escapeHtml(opt)}" 
                           onchange="updateOption(${idx}, ${j}, this.value)"
                           placeholder="選択肢 ${j + 1}">
                    <button type="button" 
                            class="remove-option-btn" 
                            onclick="removeOption(${idx}, ${j})"
                            title="この選択肢を削除"
                            ${options.length <= 2 ? 'disabled' : ''}>
                        削除
                    </button>
                </div>
            `).join('')}
            <button type="button" 
                    class="add-option-btn" 
                    onclick="addOption(${idx})"
                    title="選択肢を追加">
                選択肢を追加
            </button>
        </div>
    `;
}

/**
 * 新しい問題を追加する
 */
function addQuestion() {
    const newQuestion = {
        question: "",
        type: "multiple_choice",
        options: ["", ""], // 選択式のデフォルト選択肢
        answer: "",
        points: 10
    };
    
    questions.push(newQuestion);
    renderQuestions();
    
    // 新しく追加された問題にスクロール
    setTimeout(() => {
        const questionCards = document.querySelectorAll('.question-editor-card');
        const lastCard = questionCards[questionCards.length - 1];
        if (lastCard) {
            lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

/**
 * 指定された問題を削除する
 * @param {number} idx - 削除する問題のインデックス
 */
function removeQuestion(idx) {
    if (questions.length <= 1) {
        alert('少なくとも1つの問題が必要です。');
        return;
    }
    
    if (confirm('この問題を削除しますか？')) {
        questions.splice(idx, 1);
        renderQuestions();
    }
}

/**
 * 問題の属性を更新する
 * @param {number} idx - 問題のインデックス
 * @param {string} key - 更新する属性名
 * @param {any} val - 新しい値
 */
function updateQuestion(idx, key, val) {
    if (key === "points") {
        // 配点は数値として処理し、1以上の値に制限
        val = Math.max(1, Number(val) || 10);
    }
    
    questions[idx][key] = val;
    
    // 問題タイプが選択式に変更された場合、選択肢を初期化
    if (key === "type" && val === "multiple_choice" && !questions[idx].options) {
        questions[idx].options = ["", ""];
    }
    
    renderQuestions();
}

/**
 * 選択肢を追加する
 * @param {number} qIdx - 問題のインデックス
 */
function addOption(qIdx) {
    if (!questions[qIdx].options) {
        questions[qIdx].options = [];
    }
    
    // 最大選択肢数の制限（例：10個まで）
    if (questions[qIdx].options.length >= 10) {
        alert('選択肢は最大10個まで追加できます。');
        return;
    }
    
    questions[qIdx].options.push("");
    renderQuestions();
}

/**
 * 選択肢を削除する
 * @param {number} qIdx - 問題のインデックス
 * @param {number} oIdx - 選択肢のインデックス
 */
function removeOption(qIdx, oIdx) {
    if (questions[qIdx].options.length <= 2) {
        alert('選択肢は最低2つ必要です。');
        return;
    }
    
    questions[qIdx].options.splice(oIdx, 1);
    renderQuestions();
}

/**
 * 選択肢の内容を更新する
 * @param {number} qIdx - 問題のインデックス
 * @param {number} oIdx - 選択肢のインデックス
 * @param {string} val - 新しい値
 */
function updateOption(qIdx, oIdx, val) {
    questions[qIdx].options[oIdx] = val;
    updateHiddenInput(); // 即座にhiddenフィールドを更新
}

/**
 * 隠しフィールドを更新する
 * フォーム送信時にサーバーに送信するためのJSON文字列を設定
 */
function updateHiddenInput() {
    const questionsInput = document.getElementById('questionsInput');
    if (questionsInput) {
        questionsInput.value = JSON.stringify(questions);
    }
}

/**
 * HTMLエスケープ処理
 * XSS攻撃を防ぐためのセキュリティ対策
 * @param {string} text - エスケープするテキスト
 * @returns {string} - エスケープされたテキスト
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ===== 初期化処理 =====
document.addEventListener('DOMContentLoaded', function() {
    // 問題追加ボタンのイベントリスナー設定
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) {
        addQuestionBtn.onclick = addQuestion;
    }
    
    // 初期問題がない場合は1つ追加
    if (questions.length === 0) {
        addQuestion();
    } else {
        renderQuestions();
    }
});