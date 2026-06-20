// Gemini API による「どの箱？」振り分け提案
// OAuth トークン（ユーザー）を Authorization ヘッダに付けて Generative Language API を呼ぶ。
// Gemini API キーが設定されている場合はそちらを優先（個人開発用）。

import { getAccessToken } from './auth'
import { BoxKey, BOXES } from '@/types'

const MODEL = 'gemini-1.5-flash'
const ENDPOINT_BY_KEY = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const ENDPOINT_BY_TOKEN = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export interface BoxSuggestion {
  box: BoxKey
  reason: string
  alternatives: { box: BoxKey; why: string }[]
}

function buildPrompt(content: string): string {
  const boxList = (Object.keys(BOXES) as BoxKey[])
    .map((k) => {
      const b = BOXES[k]
      return `- ${k}: ${b.label}（${b.description}）\n  基準: ${b.criterion}\n  例: ${b.examples.join(' / ')}`
    })
    .join('\n')

  return `あなたは、山田様（ユーザー）の「思考の箱」システムの振り分けアシスタントです。
浮かんだ思考を、以下の5つの箱のいずれかに提案してください。

【箱の定義】
${boxList}

【ユーザーの思考】
「${content}」

【判定フロー（この順序で問いかけて判定）】
1. 思い出すと明るくなる、または静かにありがたいと感じることか？ → yes: happy
2. それ以外（大事だけど今すぐ答えはいらない、または今考えても苦しくなるだけ）→ later

【出力フォーマット】
以下の JSON のみ（コードブロック不要・他テキスト不要）。

{
  "box": "<later|happy>",
  "reason": "なぜその箱を選んだか、30〜80字で。山田様に優しく。",
  "alternatives": [
    { "box": "<別の箱キー>", "why": "こっちの可能性もある理由（簡潔に）" }
  ]
}`
}

function extractJson(text: string): any {
  // コードブロック除去
  const cleaned = text.replace(/```(?:json)?/g, '').trim()
  // 最初の { から最後の } まで
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI 応答に JSON が見つかりません')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function suggestBox(content: string): Promise<BoxSuggestion> {
  const prompt = buildPrompt(content)
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  })

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  let res: Response
  if (apiKey && !apiKey.startsWith('your-')) {
    // APIキーがある場合
    res = await fetch(`${ENDPOINT_BY_KEY}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } else {
    // OAuth トークン
    const token = getAccessToken()
    if (!token) throw new Error('未ログインです。')
    res = await fetch(ENDPOINT_BY_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    })
  }

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Gemini API エラー (${res.status}): ${t}`)
  }
  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? ''
  const parsed = extractJson(text)
  if (!parsed.box || !(parsed.box in BOXES)) {
    throw new Error('AI の応答から箱キーを判定できませんでした。')
  }
  return {
    box: parsed.box as BoxKey,
    reason: String(parsed.reason ?? ''),
    alternatives: Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .filter((a: any) => a && a.box && a.box in BOXES)
          .map((a: any) => ({ box: a.box as BoxKey, why: String(a.why ?? '') }))
      : [],
  }
}
