// Google Sheets API との読み書きを行う
// スプレッドシートを「1行1思考」のデータストアとして扱う

import { getAccessToken } from './auth'
import { BOXES, LEGACY_BOX_MAP, SHEET_COLUMNS, Thought, NewThoughtInput, BoxKey } from '@/types'

const SHEET_NAME = 'thoughts'
const HEADER_ROW = SHEET_COLUMNS

function getSpreadsheetId(): string {
  const id = import.meta.env.VITE_GOOGLE_SHEETS_ID
  if (!id || id.startsWith('your-')) {
    throw new Error(
      'VITE_GOOGLE_SHEETS_ID が設定されていません。.env にスプレッドシートIDを入力してください。',
    )
  }
  return id
}

async function sheetsFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = getAccessToken()
  if (!token) throw new Error('未ログインです。先にサインインしてください。')
  const url = path.startsWith('http')
    ? path
    : `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets API エラー (${res.status}): ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// シートが無ければ作り、ヘッダー行を準備する
export async function ensureSheet(): Promise<void> {
  // スプレッドシートのメタデータ取得 → シート存在確認
  let meta
  try {
    meta = await sheetsFetch(`?fields=sheets(properties.title)`)
  } catch (e: any) {
    // 権限エラー等の場合はここで止める
    throw e
  }
  const titles: string[] = (meta.sheets ?? []).map((s: any) => s.properties.title)
  if (!titles.includes(SHEET_NAME)) {
    await sheetsFetch(`:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: SHEET_NAME },
            },
          },
        ],
      }),
    })
  }
  // ヘッダー書き込み（A1:??1）。冪等に。
  const range = `${SHEET_NAME}!A1:${columnLetter(HEADER_ROW.length)}1`
  await sheetsFetch(`/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [HEADER_ROW],
    }),
  })
  // ヘッダー行を固定・太字に（見栄え）
  await sheetsFetch(`:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: undefined,
              title: SHEET_NAME,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    }),
  }).catch(() => {
    /* 凍結失敗は無視 */
  })
}

function columnLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function rowToThought(row: any[]): Thought | null {
  if (!row || row.length === 0) return null
  const [
    timestamp,
    id,
    content,
    box,
    source,
    ai_reason,
    status,
    due_at,
    reviewed_at,
  ] = row
  if (!content) return null
  const resolvedBox: BoxKey =
    (box as BoxKey) in BOXES
      ? (box as BoxKey)
      : (LEGACY_BOX_MAP[box] ?? 'later')
  return {
    timestamp: timestamp || '',
    id: id || String(Date.now()),
    content,
    box: resolvedBox,
    source: source === 'ai' ? 'ai' : 'manual',
    ai_reason: ai_reason || undefined,
    status: status === 'archived' ? 'archived' : 'active',
    due_at: due_at || undefined,
    reviewed_at: reviewed_at || undefined,
  }
}

export async function fetchThoughts(): Promise<Thought[]> {
  const range = `${SHEET_NAME}!A2:${columnLetter(HEADER_ROW.length)}`
  let data
  try {
    data = await sheetsFetch(`/values/${range}`)
  } catch (e: any) {
    // シートがまだ無い場合 → 作って空配列を返す
    if (String(e.message).includes('Unable to parse')) {
      await ensureSheet()
      return []
    }
    throw e
  }
  const values: any[][] = data.values ?? []
  const thoughts = values
    .map(rowToThought)
    .filter((t): t is Thought => t !== null)
  // 新しい順
  thoughts.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  return thoughts
}

export async function appendThought(input: NewThoughtInput): Promise<Thought> {
  await ensureSheet()
  const now = new Date()
  const thought: Thought = {
    id: String(now.getTime()),
    timestamp: now.toISOString(),
    content: input.content,
    box: input.box,
    source: input.source,
    ai_reason: input.ai_reason,
    status: 'active',
    due_at: input.due_at,
  }
  const row = [
    thought.timestamp,
    thought.id,
    thought.content,
    thought.box,
    thought.source,
    thought.ai_reason ?? '',
    thought.status,
    thought.due_at ?? '',
    thought.reviewed_at ?? '',
  ]
  await sheetsFetch(
    `/values/${SHEET_NAME}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({
        range: `${SHEET_NAME}!A:A`,
        values: [row],
      }),
    },
  )
  return thought
}

// 特定のidの行番号を探して部分更新
export async function updateThoughtBox(
  id: string,
  newBox: BoxKey,
  opts: { aiReason?: string; dueAt?: string } = {},
): Promise<void> {
  // 全取得 → 行番号特定（idで突き合わせ）
  const all = await fetchThoughts()
  // スプレッドシート上の行番号は ヘッダー + 出現順（新しい順ソート前）
  const range = `${SHEET_NAME}!A2:${columnLetter(HEADER_ROW.length)}`
  const data = await sheetsFetch(`/values/${range}`)
  const values: any[][] = data.values ?? []
  const rowIndex = values.findIndex((r) => r[1] === id)
  if (rowIndex === -1) throw new Error('更新対象の思考が見つかりません')
  const sheetRow = rowIndex + 2 // ヘッダー分 +1
  // 部分更新（box=col D, ai_reason=col F, due_at=col H, reviewed_at=col I）
  const updates: { range: string; values: any[][] }[] = [
    {
      range: `${SHEET_NAME}!D${sheetRow}`,
      values: [[newBox]],
    },
  ]
  if (opts.aiReason !== undefined) {
    updates.push({
      range: `${SHEET_NAME}!F${sheetRow}`,
      values: [[opts.aiReason]],
    })
  }
  if (opts.dueAt !== undefined) {
    updates.push({
      range: `${SHEET_NAME}!H${sheetRow}`,
      values: [[opts.dueAt]],
    })
  }
  updates.push({
    range: `${SHEET_NAME}!I${sheetRow}`,
    values: [[new Date().toISOString()]],
  })
  await sheetsFetch(`/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates,
    }),
  })
  // unused参照回避
  void all
}

export async function archiveThought(id: string): Promise<void> {
  const range = `${SHEET_NAME}!A2:${columnLetter(HEADER_ROW.length)}`
  const data = await sheetsFetch(`/values/${range}`)
  const values: any[][] = data.values ?? []
  const rowIndex = values.findIndex((r) => r[1] === id)
  if (rowIndex === -1) throw new Error('対象の思考が見つかりません')
  const sheetRow = rowIndex + 2
  await sheetsFetch(`/values/${SHEET_NAME}!G${sheetRow}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({
      range: `${SHEET_NAME}!G${sheetRow}`,
      values: [['archived']],
    }),
  })
}
