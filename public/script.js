// Firebaseの設定情報
const firebaseConfig = {
    apiKey: "AIzaSyCE6vjXLNiDqwcCQHAbYhC0I7kb0LvP0eo",
    authDomain: "remeshi.firebaseapp.com",
    projectId: "remeshi",
    storageBucket: "remeshi.firebasestorage.app",
    messagingSenderId: "955306222881",
    appId: "1:955306222881:web:ba6e127977246174cbca60",
    measurementId: "G-YHLB5E2CSK"
};

// Firebase 初期化
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- グローバル変数 ---
const form = document.getElementById('menu-form');
const input = document.getElementById('ingredients');
const resultDisplay = document.getElementById('result-display');
const submitBtn = document.getElementById('submit-btn');
const adContainer1 = document.getElementById('ad-container-1');
const favoriteBtn = document.getElementById('favorite-btn');
const showFavoritesBtn = document.getElementById('show-favorites-btn');
const favoritesList = document.getElementById('favorites-list');

// 選択肢要素
const onlyInputCheckbox = document.getElementById('onlyInputIngredients');
const isDietCheckbox = document.getElementById('isDietMenu');
const dishCountSelect = document.getElementById('dish-count');
const dishTypeSelect = document.getElementById('dish-type');
const dishGenreSelect = document.getElementById('dish-genre');

// --- DOM要素の取得 ---
const authDesktopContainer = document.getElementById('auth-desktop');
const authMobileContainer = document.getElementById('auth-mobile');

// 初期のログインボタンHTMLを保存
const initialDesktopBtnHTML = authDesktopContainer.innerHTML;
const initialMobileBtnHTML = authMobileContainer.innerHTML;


// -------------------------------------------------
// ★ 1. 認証関連の処理 (ログイン/ログアウト)
// -------------------------------------------------
const loginHandler = () => {
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(googleProvider)
        .then((result) => {
            console.log("Googleログイン成功:", result.user.uid);
        })
        .catch((error) => {
            console.error("Googleログインエラー:", error.message);
            alert("ログインに失敗しました。");
        });
};

// ボタンへのイベント設定
const desktopLoginBtn = document.getElementById('desktop-google-login-btn');
const mobileLoginBtn = document.getElementById('mobile-google-login-btn');

if (desktopLoginBtn) desktopLoginBtn.addEventListener('click', loginHandler);
if (mobileLoginBtn) mobileLoginBtn.addEventListener('click', loginHandler);

// ハンバーガーメニュー
document.getElementById('hamburger-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});

// 認証状態の監視
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // ログイン時
        const displayName = user.displayName || 'ユーザー';
        const logoutButtonHTML = `<button id="logout-btn" style="padding: 8px 10px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">ログアウト</button>`;

        authDesktopContainer.innerHTML = `<span style="margin-right: 10px;">${displayName}さん</span>${logoutButtonHTML}`;
        authMobileContainer.innerHTML = `<span style="display: block; margin-bottom: 5px;">${displayName}さんとしてログイン中</span>${logoutButtonHTML}`;

        // ログアウト処理
        const handleLogout = () => {
            firebase.auth().signOut().then(() => {
                alert("ログアウトしました。");
                favoritesList.innerHTML = ''; // 表示をクリア
                favoriteBtn.style.display = 'none'; // 保存ボタンを隠す
            });
        };

        // ログアウトボタンへのイベント設定
        authDesktopContainer.querySelector('#logout-btn').addEventListener('click', handleLogout);
        authMobileContainer.querySelector('#logout-btn').addEventListener('click', handleLogout);

    } else {
        // ログインボタンのHTMLを再セット
        authDesktopContainer.innerHTML = initialDesktopBtnHTML;
        authMobileContainer.innerHTML = initialMobileBtnHTML;
        // 未ログイン時（ボタンを元のHTMLに戻し、イベントリスナーを再設定する）
        const desktopLoginBtn = document.getElementById('desktop-google-login-btn');
        const mobileLoginBtn = document.getElementById('mobile-google-login-btn');

        // 再度イベントリスナーを設定
        const newDesktopBtn = document.getElementById('desktop-google-login-btn');
        const newMobileBtn = document.getElementById('mobile-google-login-btn');

        if (newDesktopBtn) newDesktopBtn.addEventListener('click', loginHandler);
        if (newMobileBtn) newMobileBtn.addEventListener('click', loginHandler);
    }
});

// -------------------------------------------------
// ★ 2. Firestore 関連の処理 (保存/取得/表示)
// -------------------------------------------------

// ▼ レシピを保存する関数 (グローバルに移動)
async function saveRecipe(userId, recipeContent) {
    try {
        // 'favorites' コレクションに保存
        await db.collection("favorites").add({
            userId: userId, // 検索用ID
            recipeTitle: recipeContent.substring(0, 50) + "...", // タイトル（簡易）
            recipeContent: recipeContent,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('レシピをお気に入りに保存しました！');
    } catch (e) {
        console.error("Error saving document: ", e);
        alert('保存に失敗しました。: ' + e.message);
    }
}

// ▼ お気に入り一覧を表示する関数
async function displayFavorites() {
    const user = firebase.auth().currentUser;
    if (!user) {
        favoritesList.innerHTML = '<div style="text-align:center; padding:20px; color:#777;">ログインするとお気に入りを表示できます。</div>';
        return;
    }

    favoritesList.innerHTML = '<div style="text-align:center; padding:20px;"><span class="loader"></span> 読み込み中...</div>';

    try {
        const snapshot = await db.collection("favorites")
            .where("userId", "==", user.uid)
            .orderBy("createdAt", "desc")
            .get();

        if (snapshot.empty) {
            favoritesList.innerHTML = '<div style="text-align:center; padding:20px; background:#f9f9f9; border-radius:8px;">まだお気に入りのレシピはありません。<br>AIが提案したレシピを保存してみましょう！🍳</div>';
            return;
        }

        let htmlContent = '<ul>';

        snapshot.forEach(doc => {
            const data = doc.data();
            // 日付のフォーマット整形
            let dateStr = '日時不明';
            if (data.createdAt) {
                const d = data.createdAt.toDate();
                dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
            }

            // タイトルが長すぎる場合に省略する処理（必要であれば）
            const title = data.recipeTitle || 'タイトルなし';

            // カードHTMLの生成
            htmlContent += `
                    <li class="recipe-card">
                        <div class="recipe-info">
                            <div class="recipe-title">🍳 ${title}</div>
                            <div class="recipe-date">📅 ${dateStr}</div>
                        </div>
                        <div class="recipe-actions">
                            <button class="view-detail-btn" onclick="showFullRecipe('${doc.id}')">
                                レシピを見る
                            </button>
                            <button class="delete-btn" onclick="deleteRecipe('${doc.id}')">
                                削除
                            </button>
                        </div>
                    </li>`;
        });

        htmlContent += '</ul>';
        favoritesList.innerHTML = htmlContent;

    } catch (e) {
        console.error("取得エラー:", e);
        favoritesList.innerHTML = `<p style="color:red;">データ取得エラー: ${e.message}</p>`;
    }
}

// ▼ お気に入りレシピを削除する関数
async function deleteRecipe(docId) {
    if (!confirm('本当にこのレシピを削除しますか？')) {
        return; // ユーザーがキャンセルした場合
    }
    try {
        // Firestoreからドキュメントを削除
        await db.collection("favorites").doc(docId).delete();

        alert("レシピを削除しました。");

        // 削除後、一覧を再表示して画面を更新
        await displayFavorites();

    } catch (e) {
        console.error("削除エラー:", e);
        alert(`削除に失敗しました: ${e.message}`);
    }
}

// ▼ 詳細を表示する関数 (グローバル)
async function showFullRecipe(docId) {
    const doc = await db.collection("favorites").doc(docId).get();
    if (doc.exists) {
        resultDisplay.innerHTML = marked.parse(doc.data().recipeContent);
        resultDisplay.scrollIntoView({ behavior: 'smooth' });
    } else {
        alert("データが見つかりません。");
    }
}

// 一覧ボタンのイベント
showFavoritesBtn.addEventListener('click', displayFavorites);


// -------------------------------------------------
// ★ 3. 献立作成 (API呼び出し) の処理
// -------------------------------------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 値の取得
    const ingredientsValue = input.value;
    if (!ingredientsValue) {
        resultDisplay.textContent = '食材を入力してください。';
        return;
    }

    // UI制御
    if (adContainer1) adContainer1.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '考え中... 🧠';
    resultDisplay.textContent = 'AIが献立を考えています...';
    favoriteBtn.style.display = 'none'; // 新しい提案中は保存ボタンを隠す

    const requestBody = {
        ingredients: ingredientsValue,
        onlyInputIngredients: onlyInputCheckbox.checked,
        isDietMenu: isDietCheckbox.checked,
        dishCount: dishCountSelect.value,
        dishType: dishTypeSelect.value,
        dishGenre: dishGenreSelect.value
    };

    let fullMarkdown = '';

    try {
        const functionUrl = 'https://us-central1-remeshi.cloudfunctions.net/suggestMenu';
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        // ストリーミング処理
        resultDisplay.textContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullMarkdown += decoder.decode(value, { stream: true });
            resultDisplay.innerHTML = marked.parse(fullMarkdown);
            resultDisplay.scrollTop = resultDisplay.scrollHeight;
        }

        // ★ 完了後の処理: 保存ボタンの表示
        const user = firebase.auth().currentUser;
        if (user) {
            favoriteBtn.style.display = 'block';
            // イベントリスナーの重複登録を防ぐため、onclickプロパティを使用
            favoriteBtn.onclick = () => saveRecipe(user.uid, fullMarkdown);
        }

        if (adContainer1) adContainer1.style.display = 'block';

    } catch (error) {
        console.error('エラー:', error);
        resultDisplay.textContent = `エラーが発生しました: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '献立を考えてもらう';
    }
});
