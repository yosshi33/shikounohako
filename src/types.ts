// 5つの箱の定義
// 西園寺凛さんとの対話に基づく設計

export type BoxKey = 'today' | 'later' | 'release' | 'happy' | 'gratitude'

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
  today: {
    key: 'today',
    label: '今日やる箱',
    subtitle: '行動の場所',
    emoji: '1\uFE0F\u20E3',
    color: '#2d6a4f',
    accent: '#52b788',
    bg: '#e8f5ee',
    description: '今日、自分の行動で1歩進められること。',
    criterion: '今日、自分が行動できる？',
    examples: ['返信、確認、支払い', '薬、水分、歩数', '仕事で次に着手する1手'],
    keyword: 'これは今日、動ける',
  },
  later: {
    key: 'later',
    label: 'あとで考える箱',
    subtitle: '保管の場所',
    emoji: '2\uFE0F\u20E3',
    color: '#1d4e89',
    accent: '#468faf',
    bg: '#e6f1fa',
    description: '大事だけど、今ここで答えを出さなくていいこと。',
    criterion: '大事だけど、今すぐ答えはいらない？',
    examples: ['仕事の方向性', 'お金の計画', '人間関係の整理', '将来の判断'],
    keyword: 'これは大事。だから後でちゃんと考える',
  },
  release: {
    key: 'release',
    label: '今は手放す箱',
    subtitle: '退避の場所',
    emoji: '3\uFE0F\u20E3',
    color: '#6c757d',
    accent: '#adb5bd',
    bg: '#f1f3f5',
    description: '今考えても行動にも結論にもつながらず、自分を責めるだけのこと。',
    criterion: '今考えても苦しくなるだけ？',
    examples: ['過去の後悔', '相手の気持ちの深読み', '最悪の未来予測', '自己否定'],
    keyword: 'これは今の私の仕事ではない',
  },
  happy: {
    key: 'happy',
    label: 'しあわせ箱',
    subtitle: '回復の場所',
    emoji: '\uD83C\uDF38',
    color: '#c9184a',
    accent: '#ff4d6d',
    bg: '#ffe5ec',
    description: '思い出すと少し笑える、楽しみになる、安心するもの。',
    criterion: '思い出すと明るくなる？',
    examples: ['美味しかったもの', '行きたい場所', 'ルル・ピピの可愛いこと', '達成できたこと'],
    keyword: 'これは私を明るい方に戻す',
  },
  gratitude: {
    key: 'gratitude',
    label: '感謝の箱',
    subtitle: '安心の場所',
    emoji: '\uD83C\uDF40',
    color: '#9d4edd',
    accent: '#c77dff',
    bg: '#f3e8ff',
    description: 'ありがたい、支えられている、いただいている、と感じるもの。',
    criterion: '静かにありがたいと感じる？',
    examples: ['食事への感謝', '体が動くこと', '家族、仲間、仕事', '小さな親切'],
    keyword: 'これは私を満たしてくれる',
  },
}

export const BOX_ORDER: BoxKey[] = ['today', 'later', 'release', 'happy', 'gratitude']

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
