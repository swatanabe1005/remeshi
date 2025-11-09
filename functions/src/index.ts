// functions/src/index.ts

import { https } from "firebase-functions/v2";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 食材を受け取り、献立を生成して返すHTTPS関数
 */
export const suggestMenu = https.onRequest({
  secrets: ["GEMINI_API_KEY"],
  memory: "512MiB", // 高速化のためメモリを増強することを推奨
  cpu: 1
  // @ts-ignore
}, async (request, response) => {
  // CORSヘッダーを直接設定
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") {
    // 必要なCORSヘッダーをセットして204で応答
    return response.status(204).send("");
  }
  if (request.method !== "POST") {
    return response.status(405).send("Method Not Allowed");
  }
  // レスポンスヘッダーをストリーミング用に設定
  response.set("Content-Type", "text/plain; charset=utf-8"); // Content-Typeを text/plain に変更

  const ingredients: string = request.body.ingredients;
  // チェックボックスの値を取得
  const onlyInput: boolean = request.body.onlyInputIngredients;
  const dietConstraint: boolean = request.body.isDietMenu;

  if (!ingredients) {
    return response.end(JSON.stringify({ error: "食材名（ingredients）が必要です。" }));
  }

  let basePrompt = "以下の食材を使って、献立を考えてください。レシピの内容は検索結果上位に来るような内容が望ましいです。";
  let constraint = "";

  // 1. 食材の制約
  if (onlyInput) {
    // 入力食材のみ
    constraint += "【重要】入力された食材のみを使用してください。追加食材は【一切】使用しないでください。調味料は使用してもかまいません。\n";
  }

  // 2. ダイエットの制約 (例)
  if (dietConstraint) {
    constraint += "【重要】献立は、カロリーと糖質を最大限に抑えたヘルシーな内容にしてください。\n";
  }
  const detailPrompt = "各料理のタイトル、必要な追加食材、簡単な調理手順を、日本語のMarkdown形式（箇条書きや見出し）で構造化して出力してください。";
  const prompt =
    `${basePrompt}\n` +
    `${constraint}\n` +
    `${detailPrompt}\n` +
    `使用可能な食材: ${ingredients}`;

  try {
    const model = "gemini-2.5-flash";
    const stream = await ai.models.generateContentStream({
      model: model,
      contents: [prompt],
    });

    // ストリームのデータをレスポンスに書き込み
    for await (const chunk of stream) {
      // response.write() でフロントエンドにデータを送信
      response.write(chunk.text);
    }
    // 処理完了後、response.end() でストリームを終了
    response.end();
  } catch (error) {
    console.error("Gemini API Error:", error);
    // エラー応答を返す
    response.end(JSON.stringify({ error: "献立生成中にエラーが発生しました。" }));
  }
});
