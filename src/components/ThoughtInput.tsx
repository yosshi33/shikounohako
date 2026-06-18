import { useState } from 'react'
import { BOXES, BoxKey, BOX_ORDER } from '@/types'
import { suggestBox, BoxSuggestion } from '@/lib/gemini'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (content: string, box: BoxKey, aiReason?: string, dueAt?: string) => void
  useAI: boolean
}

export function ThoughtInput({ open, onClose, onSubmit, useAI }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<BoxSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BoxKey | null>(null)
  const [dueAt, setDueAt] = useState('')

  if (!open) return null

  async function handleAsk() {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    setSuggestion(null)
    try {
      const s = await suggestBox(content.trim())
      setSuggestion(s)
      setSelected(s.box)
      if (s.box === 'later') {
        // 既定の再考日 = 3日後の夜
        const d = new Date(Date.now() + 3 * 86400_000)
        d.setHours(21, 0, 0, 0)
        setDueAt(d.toISOString().slice(0, 10))
      }
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit() {
    if (!content.trim() || !selected) return
    onSubmit(
      content.trim(),
      selected,
      suggestion?.reason,
      selected === 'later' && dueAt ? dueAt : undefined,
    )
    setContent('')
    setSuggestion(null)
    setSelected(null)
    setDueAt('')
    onClose()
  }

  function handleManualSubmit(box: BoxKey) {
    onSubmit(content.trim(), box)
    setContent('')
    setSelected(null)
    setDueAt('')
    onClose()
  }

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>今の思考を書き込む</h2>
          <button className="sheet__close" onClick={onClose} aria-label="とじる">
            ×
          </button>
        </header>

        <textarea
          className="sheet__textarea"
          placeholder="何が浮かんでいますか？ 書き出して、机から下ろしましょう。"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          autoFocus
        />

        {useAI && (
          <div className="sheet__ask">
            <button
              className="btn btn--ask"
              disabled={!content.trim() || loading}
              onClick={handleAsk}
            >
              {loading ? 'AIに聞いています…' : 'AIに「どの箱？」を聞く'}
            </button>
            <span className="sheet__ask-hint">※ まず AI に提案してもらい、納得したら箱へ</span>
          </div>
        )}

        {error && <div className="sheet__error">{error}</div>}

        {suggestion && (
          <div
            className="suggest"
            style={{
              background: BOXES[suggestion.box].bg,
              borderColor: BOXES[suggestion.box].color,
            }}
          >
            <div className="suggest__head" style={{ color: BOXES[suggestion.box].color }}>
              {BOXES[suggestion.box].emoji} {BOXES[suggestion.box].label}
            </div>
            <p className="suggest__reason">{suggestion.reason}</p>
            <div className="suggest__keyword" style={{ color: BOXES[suggestion.box].color }}>
              「{BOXES[suggestion.box].keyword}」
            </div>
            {suggestion.alternatives.length > 0 && (
              <div className="suggest__alts">
                <span className="suggest__alts-label">他の可能性：</span>
                {suggestion.alternatives.map((a) => (
                  <button
                    key={a.box}
                    className="chip"
                    style={{
                      borderColor: BOXES[a.box].color,
                      color: BOXES[a.box].color,
                    }}
                    onClick={() => setSelected(a.box)}
                    title={a.why}
                  >
                    {BOXES[a.box].emoji} {BOXES[a.box].label}
                  </button>
                ))}
              </div>
            )}
            {selected === 'later' && (
              <label className="suggest__due">
                いつ考える？
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </label>
            )}
          </div>
        )}

        {selected && (
          <div className="sheet__selected">
            <span>選択中：</span>
            <strong style={{ color: BOXES[selected].color }}>
              {BOXES[selected].emoji} {BOXES[selected].label}
            </strong>
          </div>
        )}

        <div className="sheet__actions">
          {suggestion ? (
            <button
              className="btn btn--primary"
              disabled={!content.trim() || !selected}
              onClick={handleSubmit}
            >
              この箱に入れる
            </button>
          ) : (
            <>
              <div className="sheet__manual-label">手動で選ぶ：</div>
              <div className="sheet__manual-row">
                {BOX_ORDER.map((k) => (
                  <button
                    key={k}
                    className="btn btn--box"
                    style={{
                      background: BOXES[k].bg,
                      color: BOXES[k].color,
                      borderColor: BOXES[k].color,
                    }}
                    disabled={!content.trim()}
                    onClick={() => handleManualSubmit(k)}
                  >
                    {BOXES[k].emoji}
                    <span>{BOXES[k].label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
