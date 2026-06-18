import { BOXES, BoxKey, BOX_ORDER, Thought } from '@/types'

interface Props {
  boxKey: BoxKey
  thoughts: Thought[]
  selected?: boolean
  collapsed?: boolean
  onSelect: (boxKey: BoxKey) => void
  onArchive?: (id: string) => void
  onMove?: (id: string, to: BoxKey) => void
}

export function BoxColumn({
  boxKey,
  thoughts,
  selected,
  collapsed,
  onSelect,
  onArchive,
  onMove,
}: Props) {
  const def = BOXES[boxKey]
  const count = thoughts.length
  const isRecoverBox = boxKey === 'happy' || boxKey === 'gratitude'

  return (
    <section
      className="box"
      style={{
        background: def.bg,
        borderColor: def.color,
      }}
      aria-label={def.label}
    >
      <header
        className="box__head"
        style={{ color: def.color }}
        onClick={() => onSelect(boxKey)}
        role="button"
        tabIndex={0}
      >
        <span className="box__emoji">{def.emoji}</span>
        <div className="box__titles">
          <h2 className="box__label">{def.label}</h2>
          <span className="box__sub">{def.subtitle}</span>
        </div>
        <span className="box__count" style={{ background: '#fff', color: def.color }}>
          {count}
        </span>
      </header>

      {!collapsed && (
        <>
          <p className="box__criterion">{def.criterion}</p>

          {selected && (
            <div className="box__keyword" style={{ background: '#ffffffcc', color: def.color }}>
              「{def.keyword}」
            </div>
          )}

          <ul className="box__list">
            {thoughts.length === 0 && (
              <li className="box__empty">まだ何も入っていません</li>
            )}
            {thoughts.map((t) => (
              <li key={t.id} className="card" style={{ borderLeftColor: def.color }}>
                <div className="card__time">{formatTime(t.timestamp)}</div>
                <div className="card__content">{t.content}</div>
                {t.source === 'ai' && t.ai_reason && (
                  <div className="card__reason">AI: {t.ai_reason}</div>
                )}
                {t.due_at && boxKey === 'later' && (
                  <div className="card__due">予定: {formatDate(t.due_at)}</div>
                )}
                <div className="card__actions">
                  <select
                    className="card__move"
                    value={t.box}
                    onChange={(e) => onMove?.(t.id, e.target.value as BoxKey)}
                    aria-label="移動先"
                  >
                    {BOX_ORDER.map((k) => (
                      <option key={k} value={k}>
                        → {BOXES[k].label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="card__archive"
                    onClick={() => onArchive?.(t.id)}
                    title="机から下ろす"
                  >
                    下ろす
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {isRecoverBox && thoughts.length > 0 && (
            <div className="box__recover-note">
              一つ、ゆっくり読んでみてください。
            </div>
          )}
        </>
      )}
    </section>
  )
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

function formatDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return `${d.getMonth() + 1}/${d.getDate()}`
}
