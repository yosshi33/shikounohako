// 2つの箱の定義

export type BoxKey = 'later' | 'happy'

export interface BoxDef {
  key: BoxKey
  label: string
  subtitle: string
  emoji: string
  color: string
  accent: string
  bg: string
  description: string
  criterion: string
  examples: string[]
  keyword: string
}

export const BOXES: Record<BoxKey, BoxDef> = {
  later: {
    key: 'later',
    label: 'あとで/手放す箱',
    subtitle: '保管と退避の場所',
    emoji: '📦',
    color: '#1d4e89',
    accent: '#468faf',
    bg: '#e6f1fa',
    description: '大事だけど今すぐ答えはいらないこと、または今考えても苦しくなるだけのこと。',
    criterion: '今すぐ行動しなくていい？',
    examples: ['仕事の方向性', 'お金の計画', '人間関係の整理', '過去の後悔', '自己否定'],
    keyword: 'これは今の私が急いで考えなくていい',
  },
  happy: {
    key: 'happy',
    label: 'しあわせ/感謝の箱',
    subtitle: '回復と安心の場所',
    emoji: '🌸',
    color: '#c9184a',
    accent: '#ff4d6d',
    bg: '#ffe5ec',
    description: '思い出すと明るくなる、またはありがたいと感じるもの。',
    criterion: '思い出すと明るくなる、または静かにありがたい？',
    examples: ['美味しかったもの', '行きたい場所', '達成できたこと', '体が動くこと', '家族、仲間'],
    keyword: 'これは私を満たしてくれる',
  },
}

export const BOX_ORDER: BoxKey[] = ['later', 'happy']

// 旧キーから新キーへのマッピング（スプレッドシートの既存データ対応）
export const LEGACY_BOX_MAP: Record<string, BoxKey> = {
  today: 'later',
  release: 'later',
  gratitude: 'happy',
}

// スプレッドシートの列マッピング
export const SHEET_COLUMNS = [
  'timestamp', // A
  'id', // B
  'content', // C
  'box', // D
  'source', // E
  'ai_reason', // F
  'status', // G
  'due_at', // H
  'reviewed_at', // I
] as const

export type SheetColumn = (typeof SHEET_COLUMNS)[number]

export interface Thought {
  id: string
  timestamp: string
  content: string
  box: BoxKey
  source: 'ai' | 'manual'
  ai_reason?: string
  status: 'active' | 'archived'
  due_at?: string
  reviewed_at?: string
}

export type NewThoughtInput = {
  content: string
  box: BoxKey
  source: 'ai' | 'manual'
  ai_reason?: string
  due_at?: string
}
