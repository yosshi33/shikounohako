import { useEffect, useState, useCallback } from 'react'
import { BOXES, BoxKey, BOX_ORDER, Thought, NewThoughtInput } from '@/types'
import {
  initAuth,
  signIn as authSignIn,
  signOut as authSignOut,
  silentSignIn,
  isSignedIn,
} from '@/lib/auth'
import {
  appendThought,
  archiveThought,
  ensureSheet,
  fetchThoughts,
  updateThoughtBox,
} from '@/lib/sheets'
import { BoxColumn } from '@/components/BoxColumn'
import { ThoughtInput } from '@/components/ThoughtInput'
import './App.css'

export default function App() {
  const [bootState, setBootState] = useState<'loading' | 'signin' | 'ready'>('loading')
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [selectedBox, setSelectedBox] = useState<BoxKey>('later')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAI, setUseAI] = useState(true)

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    try {
      await initAuth()
      if (isSignedIn()) {
        await loadThoughts()
        setBootState('ready')
        return
      }
      // 過去にログイン済みなら自動サインインを試みる
      if (localStorage.getItem('gis_authed')) {
        try {
          await silentSignIn()
          await loadThoughts()
          setBootState('ready')
          return
        } catch {
          // サイレント失敗 → サインイン画面へ
        }
      }
      setBootState('signin')
    } catch (e: any) {
      setError(e.message ?? String(e))
      setBootState('signin')
    }
  }

  const loadThoughts = useCallback(async () => {
    setLoadingList(true)
    try {
      await ensureSheet()
      const list = await fetchThoughts()
      setThoughts(list)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoadingList(false)
    }
  }, [])

  async function handleSignIn() {
    setError(null)
    try {
      await authSignIn()
      await loadThoughts()
      setBootState('ready')
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  async function handleSignOut() {
    authSignOut()
    localStorage.removeItem('gis_authed')
    setBootState('signin')
    setThoughts([])
  }

  async function handleAdd(
    content: string,
    box: BoxKey,
    aiReason?: string,
    dueAt?: string,
  ) {
    const input: NewThoughtInput = {
      content,
      box,
      source: aiReason ? 'ai' : 'manual',
      ai_reason: aiReason,
      due_at: dueAt,
    }
    try {
      const t = await appendThought(input)
      setThoughts((prev) => [t, ...prev])
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  async function handleMove(id: string, to: BoxKey) {
    try {
      await updateThoughtBox(id, to)
      setThoughts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, box: to, reviewed_at: new Date().toISOString() } : t)),
      )
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  async function handleArchive(id: string) {
    try {
      await archiveThought(id)
      setThoughts((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  if (bootState === 'loading') {
    return (
      <div className="loading">
        <div className="loading__spinner" />
        <div>準備しています…</div>
      </div>
    )
  }

  if (bootState === 'signin') {
    return <SignInScreen onSignIn={handleSignIn} error={error} />
  }

  const byBox = (k: BoxKey) => thoughts.filter((t) => t.box === k && t.status === 'active')

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          思考の箱
          <small>SHIKOUNOHAKO</small>
        </h1>
        <div className="app__header-actions">
          <button
            className="btn btn--ask"
            onClick={() => setUseAI((v) => !v)}
            title="AI振り分け ON/OFF"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            AI {useAI ? 'ON' : 'OFF'}
          </button>
          <a
            className="btn btn--ask"
            href={`https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_GOOGLE_SHEETS_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}
          >
            📊 シート
          </a>
          <button
            className="btn btn--ask"
            onClick={handleSignOut}
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="app__container">
        <div className="app__hero">
          <TakarabakoMap
            onSelect={(k) => {
              setSelectedBox(k)
              document.getElementById(`box-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
          <p className="app__oneliner">
            「これは、<strong>どの箱？</strong>」浮かんだら、机から下ろして、箱へ。
          </p>
        </div>

        {error && <div className="sheet__error">{error}</div>}

        {loadingList && (
          <div className="loading">
            <div className="loading__spinner" />
            <div>スプレッドシートを読み込み中…</div>
          </div>
        )}

        <div className="boxes">
          {BOX_ORDER.map((k) => (
            <div key={k} id={`box-${k}`}>
              <BoxColumn
                boxKey={k}
                thoughts={byBox(k)}
                selected={selectedBox === k}
                onSelect={setSelectedBox}
                onArchive={handleArchive}
                onMove={handleMove}
              />
            </div>
          ))}
        </div>

        <footer className="app__footer">
          目的は消すことではなく、<strong>置いておく場所</strong>を作ること。
          <br />
          <code>spreadsheet: {import.meta.env.VITE_GOOGLE_SHEETS_ID.slice(0, 8)}…</code>
        </footer>
      </div>

      <button className="fab" onClick={() => setSheetOpen(true)}>
        <span className="fab__plus">+</span>
        思考を置く
      </button>

      <ThoughtInput
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleAdd}
        useAI={useAI}
      />
    </div>
  )
}

const CHEST_AREAS: { key: BoxKey; label: string; style: React.CSSProperties }[] = [
  { key: 'later', label: 'あとで/手放す箱', style: { left: '1%',  top: '32%', width: '57%', height: '58%' } },
  { key: 'happy', label: 'しあわせ/感謝の箱', style: { left: '59%', top: '27%', width: '40%', height: '63%' } },
]

function TakarabakoMap({ onSelect }: { onSelect: (k: BoxKey) => void }) {
  return (
    <div className="tmap">
      <img
        src={`${import.meta.env.BASE_URL}takarabako.png`}
        alt="5つの宝箱"
        className="tmap__img"
        draggable={false}
      />
      {CHEST_AREAS.map(({ key, label, style }) => (
        <button
          key={key}
          className="tmap__area"
          style={style}
          aria-label={label}
          onClick={() => onSelect(key)}
          title={label}
        />
      ))}
    </div>
  )
}

function SignInScreen({
  onSignIn,
  error,
}: {
  onSignIn: () => void
  error: string | null
}) {
  return (
    <div className="signin">
      <div className="signin__panel">
        <img
          src={`${import.meta.env.BASE_URL}takarabako.png`}
          alt="5つの宝箱"
          className="signin__hero"
        />
        <h1 className="signin__title">思考の箱</h1>
        <p className="signin__desc">
          考えなくてよい思考が浮かんだ時に、
          <br />
          <strong>置いておく場所</strong>。
          <br />
          <br />
          Googleアカウントでサインインすると、
          <br />
          あなたのスプレッドシートがそのまま箱になります。
        </p>
        <div className="signin__boxes">
          {BOX_ORDER.map((k) => (
            <span
              key={k}
              className="signin__box-chip"
              style={{ background: BOXES[k].bg, color: BOXES[k].color }}
            >
              {BOXES[k].emoji} {BOXES[k].label}
            </span>
          ))}
        </div>
        <button className="signin__btn" onClick={onSignIn}>
          Google でサインイン
        </button>
        {error && <div className="signin__err">{error}</div>}
      </div>
    </div>
  )
}
