// functions/src/index.ts

import { https } from "firebase-functions/v2";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 食材を受け取り、献立を生成して返すHTTPS関数
 */
export const suggestMenu = https.onRequest({
  secrets: ["GEMINI_API_KEY"],
  memory: "512MiB",
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
  response.set("Content-Type", "text/plain; charset=utf-8");

  // リクエストボディから全てのパラメータを取得
  const ingredients: string = request.body.ingredients;
  const onlyInput: boolean = request.body.onlyInputIngredients;
  const dietConstraint: boolean = request.body.isDietMenu;
  const dishCount: string = request.body.dishCount;
  const dishType: string = request.body.dishType;
  const dishGenre: string = request.body.dishGenre;

  if (!ingredients) {
    return response.end(JSON.stringify({ error: "食材名（ingredients）が必要です。" }));
  }

  let basePrompt = "以下の食材を最大限に活用した献立とレシピを提案してください。以降で制約が指定されていない場合、品数は1品、使用可能な食材以外も使用可能です。";
  let constraint = "";

  // 1. チェックボックスの制約
  if (onlyInput) {
    constraint += "入力された食材のみを使用してください。追加食材は使用しないでください。基本的な調味料は使用してもかまいません。\n";
  }
  if (dietConstraint) {
    constraint += "献立は、カロリーと糖質を最大限に抑えたヘルシーな内容にしてください。\n";
  }

  // ★ 2. ドロップダウンの制約をプロンプトに組み込む ★
  if (dishCount && dishCount !== 'おまかせ') {
    constraint += `品数: 必ず **${dishCount}** の料理を提案してください。\n`;
  } 

  if (dishType && dishType !== 'おまかせ') {
    constraint += `料理の種類: 提案する料理は、**${dishType}** をメインとしてください。\n`;
  }

  if (dishGenre && dishGenre !== 'おまかせ') {
    constraint += `ジャンル: 提案する料理のジャンルは **${dishGenre}** に限定してください。\n`;
  }
  // ★

  // 出力形式の指示 (Markdown)
  const detailPrompt = "出力形式は以下のような形式としてください。料理名を一番最初に出力。見出しは大きく、材料名もわかりやすく出力してください。材料\n材料名1　250g\n材料名2　1/2個\n材料名3　大さじ1\n\n作り方\n\n1.\n2.\n3.";

  const prompt =
    `${basePrompt}\n` +
    `使用可能な食材: ${ingredients}\n` +
    `【制約・希望】\n${constraint}\n` +
    `${detailPrompt}`;

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