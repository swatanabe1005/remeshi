// functions/src/index.ts

import { https } from "firebase-functions";
import { GoogleGenAI } from "@google/genai";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require("cors")({ origin: true });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 食材を受け取り、献立を生成して返すHTTPS関数
 */
// @ts-ignore
export const suggestMenu = https.onRequest({ secrets: ["GEMINI_API_KEY"], cpu: 1, memory: "256MiB" }, (request, response) => {
  return cors(request, response, async () => {
    if (request.method === "OPTIONS") {
      // 必要なCORSヘッダーをセットして204で応答
      response.set("Access-Control-Allow-Origin", "*");
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return response.status(204).send("");
    }

    if (request.method !== "POST") {
      return response.status(405).send("Method Not Allowed");
    }

    const ingredients: string = request.body.ingredients;
    // チェックボックスの値を取得
    const allowOther: boolean = request.body.allowOtherIngredients;
    const dietConstraint: boolean = request.body.isDietMenu;

    if (!ingredients) {
      return response.status(400).send({ error: "食材名（ingredients）が必要です。" });
    }

    let constraintPrompt = `食材: ${ingredients}`;
    let basePrompt = "あなたはプロの栄養士です。以下の食材を使って、健康的で美味しい3品（主菜、副菜、汁物）の夕食献立を考えてください。";

    // 1. 食材の制約
    if (!allowOther) {
      // チェックがない場合: 入力食材のみ
      constraintPrompt = `以下の入力食材【のみ】を使って献立を考えてください。追加食材は【一切】使用しないでください。${constraintPrompt}`;
    }

    // 2. ダイエットの制約 (例)
    if (dietConstraint) {
      basePrompt = `あなたはプロのダイエット栄養士です。カロリーと糖質を抑えたヘルシーな3品`;
    }
    const detailPrompt = "各料理のタイトル、必要な追加食材、簡単な調理手順を、日本語のMarkdown形式（箇条書きや見出し）で構造化して出力してください。"; 
    const prompt = `${basePrompt}${detailPrompt}${constraintPrompt}`;

    try {
      const model = "gemini-2.5-flash";
      const result = await ai.models.generateContent({
        model: model,
        contents: [prompt],
      });

      const menuContent = result.text;

      // 成功応答を返す
      return response.status(200).send({ menu: menuContent });
    } catch (error) {
      console.error("Gemini API Error:", error);
      // エラー応答を返す
      return response.status(500).send({ error: "献立生成中にエラーが発生しました。" });
    }
  });
});
// @ts-ignore
suggestMenu.secrets = ["GEMINI_API_KEY"];
// 最終行に改行を追加することで eol-last エラーを解消