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
export const suggestMenu = https.onRequest({secrets: ["GEMINI_API_KEY"],cpu: 1,memory: "256MiB"},(request, response) => {
    if (!process.env.GEMINI_API_KEY) {
      console.error("DEBUG: GEMINI_API_KEY is missing or undefined!");
      return response.status(500).send({ error: "API Key is missing." });
    }
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

      if (!ingredients) {
        return response.status(400).send({ error: "食材名（ingredients）が必要です。" });
      }

      // max-lenルールを回避しつつプロンプト文字列を構築
      const promptBase = "あなたはプロの栄養士です。以下の食材を使って、健康的で美味しい3品";
      const promptDetail = "（主菜、副菜、汁物）の夕食献立を考えてください。各料理のタイトル、必要な追加食材、";
      const promptSteps = "簡単な調理手順を、日本語のMarkdown形式（箇条書きや見出し）で構造化して出力してください。";
      const prompt = `${promptBase}${promptDetail}${promptSteps}食材: ${ingredients}`;

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