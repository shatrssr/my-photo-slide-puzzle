///
// グローバル変数の宣言

// パズルの状態を保持する配列
// ex: 3*3の場合[0,1,2,3,4,5,6,7,8]が完成形.8が空白タイルを表す
let board = [];

// プレイヤーが移動した回数
let moves = 0;

// ゲーム開始時刻（ミリ秒）
let startTime = null;

// タイマーを更新するためのインターバルID
let timerInterval = null;

// 分割された画像データの配列
// 各要素はData URL形式の画像データ
let tiles = [];

// アップロされた元画像のImageオブジェクト
let originalImage = null;

// パズルのグリッドサイズ（3,4 または5)
// 3*3, 4*4, 5*5のパズルに対応
let gridSize = 3;

///
// DOM要素の取得

const difficultySection = document.getElementById('difficultySection');
const difficultyButtons = document.querySelectorAll('.btn-difficulty');
const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const previewContainer = document.getElementById('previewContainer');
const shuffleBtn = document.getElementById('shuffleBtn');
const uploadSection = document.getElementById('uploadSection');
const gameSection = document.getElementById('gameSection');
const puzzleBoard = document.getElementById('puzzleBoard');
const movesDisplay = document.getElementById('moves');
const timerDisplay = document.getElementById('timer');
const referenceImage = document.getElementById('referenceImage');
const giveUpBtn = document.getElementById('giveUpBtn');
const successOverlay = document.getElementById('successOverlay');
const successStats = document.getElementById('successStats');
const replayBtn = document.getElementById('replayBtn');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

///
// イベントリスナーの登録

// 難易度選択ボタンのクリックイベント
// 各ボタンがクリックされたときに難易度を選択
difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        selectDifficulty(btn);
    });
});

// 画像アップロード時のイベント
// ユーザーが画像選択した時に発火
imageInput.addEventListener('change', handleImageUpload);

// シャッフルボタン
// ゲームを開始する
shuffleBtn.addEventListener('click', startGame);

// 降参ボタン
giveUpBtn.addEventListener('click', giveUp);

//もう一度遊ぶ
replayBtn.addEventListener('click', resetGame);

//はい・いいえボタンのクリックイベント

/// 
// 難易度選択処理

/** 難易度選択
 * @param {HTMLElement} selectedBtn - クリックされたボタン要素
 */
function selectDifficulty(selectedBtn) {
    // 全てのボタンから選択解除状態
    difficultyButtons.forEach(btn => {
        btn.classList.remove('selected');
    });

    // クリックで選択状態にする
    selectedBtn.classList.add('selected');

    // data-size属性からグリッドサイズを取得
    // "3", "4", "5"のいずれか
    gridSize = parseInt(selectedBtn.dataset.size);

    // アップロードセクションを表示
    uploadSection.classList.remove('hidden');
}

///
// 画像アップロード処理

/**
 * ユーザーが選択した画像を読み込む
 * @param {Event} e - change イベント
 */
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // FileReaderを使ってファイルを読み込む
        const reader = new FileReader();

        reader.onload = function (event) {
            // 新しいImageオブジェクトを作成
            originalImage = new Image();

            originalImage.onload = function () {
                // プレビュー画像を表示
                preview.src = event.target.result;
                previewContainer.classList.remove('hidden');

                // 画像を分割する処理
                splitImage();
            };

            // Data URLを画像として読み込む
            originalImage.src = event.target.result;
        };

        // ファイルをData URLとして読み込む
        reader.readAsDataURL(file);
    }
}

///
// 画像を指定されたグリッドサイズで分割


// アップロードされた画像をグリッドサイズに応じて分割
// 各ピースをData URL形式でtiles配列に保存

function splitImage() {
    tiles = [];

    // Canvasを作成して画像を描画
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 正方形にするための最大サイズを計算
    const maxSize = Math.min(originalImage.width, originalImage.height);

    // 各タイルのサイズを計算（300pxをグリッド数で割る）
    const tileSize = 300 / gridSize;

    // キャンバスのサイズを設定
    canvas.width = tileSize;
    canvas.height = tileSize;

    // グリッドサイズに応じてループ
    // ex: 3*3の場合、i=0,1,2 * j=0,1,2で9回ループ
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // キャンバスをクリア
            ctx.clearRect(0, 0, tileSize, tileSize);

            // 元画像のどの部分を切り出すか計算
            // sx, sy: 切り出し開始位置
            // sw, sh: 切り出しサイズ
            const sx = j * (maxSize / gridSize);
            const sy = i * (maxSize / gridSize);
            const sw = maxSize / gridSize;
            const sh = maxSize / gridSize;

            // 元画像からこの一を切り出してキャンバズに描画
            ctx.drawImage(
                originalImage, //元画像
                sx, sy, sw, sh, // 切り出し位置とサイズ
                0, 0,   // キャンバス上の描画位置
                tileSize, tileSize  // キャンバス上のサイズ
            );

            // キャンバスの内容をData URLとして取得し配列に追加
            tiles.push(canvas.toDataURL());
        }
    }
}

///
// ゲーム開始処理

// パズルをシャッフルしてゲームを開始
function startGame() {
    // 総タイル数を計算 (ex.3*3なら9)
    const totalTiles = gridSize * gridSize;

    // ボードを初期化（0から始まる連番の配列）
    // [0, 1, 2, 3, 4, 5, 6, 7, 8] のような配列
    board = Array.from({ length: totalTiles }, (_, i) => i);

    // 解けパズルになるまでシャッフルを繰り返す
    // isSolved(): すでに完成していないか
    // isSolvable(): 解けるパズルか（数学的に必ず解ける配置か）
    let attempts = 0;
    do {
        shuffleArray(board);
        attempts++;
    } while ((isSolved() || !isSolvable()) && attempts < 1000);

    // 統計をリセット
    moves = 0;
    movesDisplay.textContent = '0';
    startTime = Date.now();

    // UIの切り替え : 難易度選択とアップロードを非表示、ゲーム画面を表示
    difficultySection.classList.add('hidden');
    uploadSection.classList.add('hidden');
    gameSection.classList.remove('hidden');

    // 見本画像を設定（右側のサイドパネル用）
    referenceImage.src = preview.src;

    // パズルボードのCSSグリッド列数を動的に設定
    // ex: gridSize=3なら "repeat(3, 1fr)"
    puzzleBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

    // パズルボードを描画
    renderBoard();

    // タイマー開始
    startTimer();
}

///
// 配列をシャッフル（Fisher-Yatesアルゴリズム）

/** 配列をランダムにシャッフル
 * Fisher-Yates（フィッシャー–イェーツ）アルゴリズムを使用
 * @param {Array} array - シャッフルする配列
 */
function shuffleArray(array) {
    // 配列の末尾から順に処理
    for (let i = array.length - 1; i > 0; i--) {
        // 0からiまでのランダムなインデックスを生成
        const j = Math.floor(Math.random() * (i + 1));

        // i番目とj番目の要素を入れ替え
        [array[i], array[j]] = [array[j], array[i]];
    }
}

///
// パズルが解けるかどうかを判定

/**
 * パズルが数学的に解けるかどうかを判定
 * 転倒数を使った判定方法
 * @returns {boolean} 解ける場合はtrue
 */
function isSolvable() {
    const totalTiles = gridSize * gridSize;
    const emptyTile = totalTiles - 1; // 最後のタイルが空白
    let inversions = 0;

    // 転倒数を計算
    // 転倒数：配列内で順序が逆になっているペアの数
    for (let i = 0; i < board.length - 1; i++) {
        for (let j = i + 1; j < board.length; j++) {
            // 空白タイルは除外して、大小関係が逆のペアを数える
            if (board[i] !== emptyTile &&
                board[j] !== emptyTile &&
                board[i] > board[j]) {
                inversions++;
            }
        }
    }
    // グリッドサイズが奇数の場合
    // 転倒数が偶数なら解ける
    if (gridSize % 2 === 1) {
        return inversions % 2 === 0;
    } else {
        // グリッドサイズが偶数の場合
        // 空白の位置も考慮する必要がある
        const emptyRow = Math.floor(board.indexOf(emptyTile) / gridSize);
        return (inversions + emptyRow) % 2 === 1;
    }
}

///
// パズルボードを描画

// 現在のboard配列の状態に基づいてパズルを描画
function renderBoard() {
    const totalTiles = gridSize * gridSize;
    const emptyTile = totalTiles - 1;

    // ボードの中身を一旦クリア
    puzzleBoard.innerHTML = '';

    // board配列の各要素に対してタイルを生成
    board.forEach((tileIndex, position) => {
        // div要素を作成
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';

        if (tileIndex === emptyTile) {
            // 空白タイルの場合
            tile.classList.add('empty');
        } else {
            // 画像タイルの場合

            // img要素を作成して画像を設定
            const img = document.createElement('img');
            img.src = tiles[tileIndex];
            tile.appendChild(img);

            // このタイルが動かせる場合、アニメーションを追加
            if (canMove(position)) {
                tile.classList.add('movable');
            }

            // クリックイベントを追加
            tile.addEventListener('click', () => moveTile(position));
        }

        // タイルをボードに追加
        puzzleBoard.appendChild(tile);
    });
}

///
// 指定位置のタイルが動かせるかチェック

/**
 * 指定した位置のタイルが移動可能かチェック
 * @param {number} position - チェックするタイルの位置
 * @returns {boolean} 移動可能ならtrue
 */
function canMove(position) {
    const totalTiles = gridSize * gridSize;
    const emptyPos = board.indexOf(totalTiles - 1);

    // 位置を行・列に変換
    const row = Math.floor(position / gridSize);
    const col = position % gridSize;
    const emptyRow = Math.floor(emptyPos / gridSize);
    const emptyCol = emptyPos % gridSize;

    // 上下左右の隣接チェック
    // 縦方向：行が1つ違い、列が同じ
    // 横方向：列が1つ違い、行が同じ
    return (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
        (Math.abs(col - emptyCol) === 1 && row === emptyRow);
}

///
// タイルを移動

/**
 * 指定位置のタイルを空白と入れ替える
 * @param {number} position - 移動するタイルの位置
 */
function moveTile(position) {
    // 移動可能かチェック
    if (!canMove(position)) return;

    const totalTiles = gridSize * gridSize;
    const emptyPos = board.indexOf(totalTiles - 1);

    // タイルと空白を入れ替え
    // javascriptの分割代入を使用
    [board[position], board[emptyPos]] = [board[emptyPos], board[position]];

    // 手数をカウント
    moves++;
    movesDisplay.textContent = moves;

    // ボードを再描画
    renderBoard();

    // クリア判定
    // 少し遅延を入れてアニメーションを見せる
    if (isSolved()) {
        setTimeout(showSuccess, 300);
    }
}

///
// パズルが完成しているかチェック
/**
 * @retuens {boolean} 完成していればtrue
 */
function isSolved() {
    // board配列の全ての要素が、そのインデックスと一致するか
    // [0,1,2,3,4,5,6,7,8]のような状態が完成形
    return board.every((val, idx) => val === idx);
}

///
// 経過時間を表示するタイマーを開始

function startTimer() {
    // 既存のタイマーがあればクリア
    if (timerInterval) clearInterval(timerInterval);

    // 1秒ごとに経過時間を更新
    timerInterval = setInterval(() => {
        // 現在時刻から開始時刻を引いて経過時間を計算（秒単位)
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerDisplay.textContent = elapsed + 's';
    }, 1000);
}

///
// 降参処理

// パズルを自動的に完成形にする
function giveUp() {
    // 確認ダイアログを表示
    if (confirm('降参しますか？\n完成形が表示されます。')) {
        // タイマーを停止
        clearInterval(timerInterval);

        // ボードを完成形にする
        const totalTiles = gridSize * gridSize;
        board = Array.from({ length: totalTiles }, (_, i) => i);

        // ボードを再描画
        renderBoard();

        // 少し遅延してから成功画面を表示
        setTimeout(() => {
            showSuccess(true); //　降参フラグを渡す
        }, 500);
    }
}

///
// 成功画面表示

/**
 * クリア画面を表示
 * @param {boolean} isGiveUp - 降参による完成かどうか
 */
function showSuccess(isGiveUp = false) {
    // タイマーを停止
    clearInterval(timerInterval);

    // 経過時間を計算
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // 統計情報を表示
    if (isGiveUp) {
        // 降参の場合
        successStats.innerHTML = `降参しました...<br><strong>${moves}手</strong> / <strong>${elapsed}秒</strong>`;
    } else {
        // クリアの場合
        successStats.innerHTML = `<strong>${moves}手</strong> / <strong>${elapsed}秒</strong>`;
    }

    // オーバーレイを表示
    successOverlay.classList.add('show');
}

///
// ゲームをリセット

function resetGame() {
    // オーバーレイを非表示
    successOverlay.classList.remove('show');

    // タイマーを停止
    clearInterval(timerInterval);

    // UIを初期状態に戻す
    gameSection.classList.add('hidden');
    difficultySection.classList.remove('hidden');
    uploadSection.classList.add('hidden');

    // 難易度選択をリセット
    difficultyButtons.forEach(btn => {
        btn.classList.remove('selected');
    });

    // フォームをリセット
    imageInput.value = '';
    preview.src = '';
    previewContainer.classList.add('hidden');
}


