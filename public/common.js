// --- これはサーバー (Node.js) 側で動かすコードの例です ---
// ※別途 `npm install express @google/generative-ai` が必要

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json()); // JSONリクエストをパースするため

// ★★★ 絶対に公開してはいけないキー ★★★
// 実際には .env ファイルなどに保存します
const API_KEY = 'YOUR_GEMINI_API_KEY'; 
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// '/api/generate-menu' というURLでリクエストを受け付ける
app.post('/api/generate-menu', async (req, res) => {
  try {
    const ingredients = req.body.ingredients; // フロントから送られてきた食材
    
    if (!ingredients) {
      return res.status(400).json({ error: '食材が指定されていません' });
    }

    const prompt = `${ingredients} を使った簡単な献立を3つ提案してください。作り方も簡潔に教えてください。`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // フロントエンドにAIの回答をJSON形式で返す
    res.json({ menu: text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AIの応答中にエラーが発生しました' });
  }
});

// サーバーを起動
app.listen(3000, () => {
  console.log('サーバーがポート3000で起動しました');
  console.log('http://localhost:3000 で待機中...');
});