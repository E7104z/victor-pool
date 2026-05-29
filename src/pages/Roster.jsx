import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

const RANK_MEDAL = ['🥇', '🥈', '🥉']

export default function Roster() {
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('average', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.fillIn))
    })
    return () => unsub()
  }, [])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{
        background: 'var(--felt-dark)',
        padding: '28px 20px 24px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', color: '#fff', letterSpacing: '0.08em' }}>
          🏆 STANDINGS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', marginTop: '4px' }}>
          Round 1 Final — sorted by average
        </p>
      </div>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Mobile cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {players.map((p, i) => {
            const gameW = p.gameRecord?.[0] ?? 0
            const gameL = p.gameRecord?.[1] ?? 0
            const gamePct = gameW + gameL > 0 ? ((gameW / (gameW + gameL)) * 100).toFixed(0) : '0'
            const mW = p.matchRecord?.[0] ?? 0
            const mL = p.matchRecord?.[1] ?? 0
            const mT = p.matchRecord?.[2] ?? 0
            const mTotal = mW + mL + mT
            const mPct = mTotal > 0 ? ((mW / mTotal) * 100).toFixed(0) : '0'
            const isTop3 = i < 3

            return (
              <div key={p.id} style={{
                background: 'var(--surface)',
                borderRadius: '14px',
                border: `2px solid ${i === 0 ? 'var(--gold)' : i === 1 ? '#aaa' : i === 2 ? '#b07050' : 'var(--border)'}`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: isTop3 ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
              }}>
                {/* Rank */}
                <div style={{
                  minWidth: '40px',
                  textAlign: 'center',
                }}>
                  {isTop3
                    ? <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{RANK_MEDAL[i]}</span>
                    : <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--text-muted)' }}>{i + 1}</span>
                  }
                </div>

                {/* Name + record */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {gameW}-{gameL} games &nbsp;·&nbsp; {mW}-{mL}{mT > 0 ? `-${mT}` : ''} matches
                  </div>
                </div>

                {/* Stats pills */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    background: 'var(--felt-light)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: '800', color: 'var(--felt-dark)', fontSize: '1rem' }}>{p.average?.toFixed(2)}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>AVG</div>
                  </div>
                  <div style={{
                    background: 'var(--gold-light)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: '800', color: 'var(--gold-dark)', fontSize: '1rem' }}>{p.handicap}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>HCP</div>
                  </div>
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{ fontWeight: '800', color: 'var(--text)', fontSize: '1rem' }}>{gamePct}%</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>WIN%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {players.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎱</div>
            <p>No players loaded yet. Admin must seed the database first.</p>
          </div>
        )}
      </div>
    </div>
  )
}
