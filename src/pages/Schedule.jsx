import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export default function Schedule() {
  const [matchups, setMatchups] = useState([])
  const [players, setPlayers] = useState({})
  const [results, setResults] = useState({})
  const [currentRound, setCurrentRound] = useState(1)
  const [activeWeek, setActiveWeek] = useState(null)

  useEffect(() => {
    const unsubP = onSnapshot(collection(db, 'players'), snap => {
      const pMap = {}
      snap.docs.forEach(d => { pMap[d.id] = d.data() })
      setPlayers(pMap)
    })
    const unsubM = onSnapshot(query(collection(db, 'matchups'), orderBy('week', 'asc')), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMatchups(all)
      if (all.length > 0) {
        const maxRound = Math.max(...all.map(m => m.round || 1))
        setCurrentRound(maxRound)
        // default to most recent week with pending matchups, else last week
        const pending = all.filter(m => m.status === 'pending')
        if (pending.length > 0) {
          setActiveWeek(Math.min(...pending.map(m => m.week)))
        } else {
          setActiveWeek(Math.max(...all.map(m => m.week)))
        }
      }
    })
    const unsubR = onSnapshot(collection(db, 'results'), snap => {
      const rMap = {}
      snap.docs.forEach(d => { rMap[d.data().matchupId] = d.data() })
      setResults(rMap)
    })
    return () => { unsubP(); unsubM(); unsubR() }
  }, [])

  const roundMatchups = matchups.filter(m => (m.round || 1) === currentRound)
  const weeks = [...new Set(roundMatchups.map(m => m.week))].sort((a, b) => a - b)

  function statusBadge(m, result) {
    if (m.status === 'bye') return { label: 'BYE', bg: 'var(--surface-2)', color: 'var(--text-muted)' }
    if (result) return { label: 'Played', bg: 'var(--felt-light)', color: 'var(--felt)' }
    return { label: 'Pending', bg: 'var(--gold-light)', color: 'var(--gold-dark)' }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{
        background: 'var(--felt-dark)',
        padding: '28px 20px 24px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', color: '#fff', letterSpacing: '0.08em' }}>
          📅 SCHEDULE — ROUND {currentRound}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', marginTop: '4px' }}>
          {matchups.filter(m => m.status === 'pending').length} matches pending
        </p>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Week tabs */}
        {weeks.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            marginBottom: '20px',
          }}>
            {weeks.map(w => {
              const weekMatchups = roundMatchups.filter(m => m.week === w)
              const allPlayed = weekMatchups.every(m => m.status === 'played' || m.status === 'bye')
              const hasActive = weekMatchups.some(m => m.status === 'pending')
              return (
                <button key={w} onClick={() => setActiveWeek(w)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    background: activeWeek === w
                      ? 'var(--felt)'
                      : allPlayed ? 'var(--felt-light)' : hasActive ? 'var(--gold-light)' : 'var(--surface)',
                    color: activeWeek === w
                      ? '#fff'
                      : allPlayed ? 'var(--felt)' : hasActive ? 'var(--gold-dark)' : 'var(--text-muted)',
                    boxShadow: activeWeek === w ? '0 2px 8px rgba(42,122,78,0.3)' : 'none',
                  }}>
                  Wk {w} {allPlayed ? '✓' : hasActive ? '•' : ''}
                </button>
              )
            })}
          </div>
        )}

        {/* Matchups for selected week */}
        {activeWeek !== null && (() => {
          const weekMatchups = roundMatchups.filter(m => m.week === activeWeek)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {weekMatchups.map(m => {
                const result = results[m.id]
                const isBye = m.status === 'bye' || !m.player2Id
                const p1Name = players[m.player1Id]?.name || m.player1Id
                const p2Name = isBye ? 'BYE' : (players[m.player2Id]?.name || m.player2Id)
                const lowerName = !isBye && m.lowerRankedId && players[m.lowerRankedId]?.name
                const badge = statusBadge(m, result)

                return (
                  <div key={m.id} style={{
                    background: 'var(--surface)',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    padding: '16px 18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    {/* Players row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ flex: 1, fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>
                        {p1Name}
                      </span>
                      <span style={{
                        background: 'var(--surface-2)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                      }}>VS</span>
                      <span style={{ flex: 1, fontWeight: '800', fontSize: '1rem', color: 'var(--text)', textAlign: 'right' }}>
                        {p2Name}
                      </span>
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {lowerName && (
                          <span style={{
                            background: 'var(--gold-light)',
                            color: 'var(--gold-dark)',
                            borderRadius: '8px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}>
                            +{m.handicap} → {lowerName}
                          </span>
                        )}
                        <span style={{
                          background: badge.bg,
                          color: badge.color,
                          borderRadius: '8px',
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                        }}>
                          {badge.label}
                        </span>
                      </div>

                      {result && (
                        <div style={{
                          fontFamily: 'Bebas Neue',
                          fontSize: '1.2rem',
                          color: 'var(--felt-dark)',
                          letterSpacing: '0.05em',
                        }}>
                          {result.player1Total} – {result.player2Total}
                          {result.winner === 'tie' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'Nunito' }}>TIE</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Per-game scores */}
                    {result?.games && result.games.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {result.games.map((g, gi) => (
                          <div key={gi} style={{
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            padding: '3px 10px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                          }}>
                            G{gi + 1}: {g.player1Score}–{g.player2Score}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {matchups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
            <p>No schedule set up yet. Admin will post it soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
