import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function Results() {
  const [results, setResults] = useState([])
  const [players, setPlayers] = useState({})
  const [selectedWeek, setSelectedWeek] = useState(null)

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'players'), snap => {
      const m = {}
      snap.docs.forEach(d => { m[d.id] = d.data().name })
      setPlayers(m)
    })
    const unsubR = onSnapshot(query(collection(db, 'results'), orderBy('week', 'asc')), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setResults(all)
      if (all.length > 0 && selectedWeek === null) {
        setSelectedWeek(Math.max(...all.map(r => r.week)))
      }
    })
    return () => { unsubP(); unsubR() }
  }, [])

  const weeks = [...new Set(results.map(r => r.week))].sort((a, b) => a - b)
  const weekResults = results.filter(r => r.week === selectedWeek)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--felt-dark)', padding: '28px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', color: '#fff', letterSpacing: '0.08em' }}>
          📊 RESULTS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', marginTop: '4px' }}>
          {results.length} matches played
        </p>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Week selector */}
        {weeks.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '24px' }}>
            {weeks.map(w => (
              <button key={w} onClick={() => setSelectedWeek(w)} style={{
                flexShrink: 0,
                padding: '7px 18px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.85rem',
                fontFamily: 'Nunito, sans-serif',
                background: selectedWeek === w ? 'var(--felt)' : 'var(--surface)',
                color: selectedWeek === w ? '#fff' : 'var(--text-muted)',
                border: selectedWeek === w ? 'none' : '1px solid var(--border)',
                boxShadow: selectedWeek === w ? '0 2px 8px rgba(42,122,78,0.3)' : 'none',
              }}>
                Week {w}
              </button>
            ))}
          </div>
        )}

        {/* Results for selected week */}
        {selectedWeek !== null && (
          <>
            <h2 style={{
              fontFamily: 'Bebas Neue',
              fontSize: '1.4rem',
              color: 'var(--felt-dark)',
              letterSpacing: '0.06em',
              marginBottom: '14px',
            }}>
              WEEK {selectedWeek}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekResults.length === 0 && (
                <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No results recorded for this week.</p>
              )}
              {weekResults.map(r => {
                const p1 = players[r.player1Id] || '?'
                const p2 = players[r.player2Id] || '?'
                const p1Win = r.winner === r.player1Id
                const p2Win = r.winner === r.player2Id
                const tie = r.winner === 'tie'
                return (
                  <div key={r.id} style={{
                    background: 'var(--surface)',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    padding: '16px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    {/* Score row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: p1Win ? 'var(--felt)' : 'var(--text)' }}>
                          {p1Win && <span style={{ marginRight: '4px' }}>🏆</span>}{p1}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: 'Bebas Neue',
                        fontSize: '2rem',
                        letterSpacing: '0.05em',
                        color: 'var(--felt-dark)',
                        textAlign: 'center',
                        minWidth: '80px',
                      }}>
                        {r.player1Total} – {r.player2Total}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: p2Win ? 'var(--felt)' : 'var(--text)' }}>
                          {p2}{p2Win && <span style={{ marginLeft: '4px' }}>🏆</span>}
                        </div>
                      </div>
                    </div>

                    {tie && (
                      <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TIE</div>
                    )}

                    {/* Per-game breakdown */}
                    {r.games?.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                        {r.games.map((g, i) => (
                          <div key={i} style={{
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                          }}>
                            G{i + 1}: {g.player1Score}–{g.player2Score}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
            <p>No results yet. Submit the first score!</p>
          </div>
        )}
      </div>
    </div>
  )
}
