import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { getDailyTip } from '../utils/scoring'

const RANK_COLORS = [
  'var(--gold)',
  '#aaa',
  '#b07050',
  'var(--felt)',
  'var(--felt)',
]

const BALL_EMOJIS = ['🎱', '🟡', '🔴', '🔵', '🟣', '🟠']

export default function Home() {
  const [top5, setTop5] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('average', 'desc'), limit(5))
    const unsub = onSnapshot(q, snap => {
      setTop5(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const tip = getDailyTip()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxHeight: '420px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
      }}>
        <img
          src="/photos/table.png"
          alt="Pool table"
          style={{
            width: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            display: 'block',
          }}
        />
        {/* gradient overlay bottom → transparent */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(245,240,232,0.0) 40%, rgba(245,240,232,0.85) 80%, var(--bg) 100%)',
          pointerEvents: 'none',
        }} />
        {/* title over hero */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          width: '100%',
          padding: '0 16px',
        }}>
          <h1 style={{
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            color: '#fff',
            letterSpacing: '0.1em',
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.4)',
          }}>
            VICTOR POOL LEAGUE
          </h1>
          <p style={{
            color: 'var(--gold)',
            fontWeight: '700',
            fontSize: '1rem',
            textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            marginTop: '4px',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px 48px' }}>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px', marginTop: '24px' }}>
          <Link to="/submit" style={{
            background: 'var(--felt)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(42,122,78,0.3)',
            fontWeight: '700',
            fontSize: '1rem',
          }}>
            <span style={{ fontSize: '1.8rem' }}>🎯</span>
            <span>Submit<br/>Score</span>
          </Link>
          <Link to="/schedule" style={{
            background: 'var(--gold)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(232,160,32,0.35)',
            fontWeight: '700',
            fontSize: '1rem',
          }}>
            <span style={{ fontSize: '1.8rem' }}>📅</span>
            <span>View<br/>Schedule</span>
          </Link>
        </div>

        {/* Top 5 */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--felt-dark)', letterSpacing: '0.06em' }}>
              🏆 TOP 5 STANDINGS
            </h2>
            <Link to="/roster" style={{ color: 'var(--felt)', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none' }}>
              Full table →
            </Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {top5.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: i === 0 ? 'var(--gold-light)' : i === 1 ? 'var(--felt-light)' : 'var(--surface-2)',
                  border: `1px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`,
                }}>
                  <span style={{
                    fontFamily: 'Bebas Neue',
                    fontSize: '1.4rem',
                    color: RANK_COLORS[i] || 'var(--text-muted)',
                    width: '26px',
                    textAlign: 'center',
                    lineHeight: 1,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>{BALL_EMOJIS[i] || '🎱'}</span>
                  <span style={{ flex: 1, fontWeight: '700', color: 'var(--text)', fontSize: '1rem' }}>{p.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', color: 'var(--felt)', fontSize: '1rem' }}>{p.average?.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {p.gameRecord?.[0]}-{p.gameRecord?.[1]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Tip */}
        <div style={{
          background: 'var(--felt)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(42,122,78,0.2)',
        }}>
          <p style={{ color: 'var(--gold)', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.18em', marginBottom: '8px' }}>
            💡 TODAY'S TIP
          </p>
          <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: 1.65, fontStyle: 'italic', fontWeight: '400' }}>
            "{tip}"
          </p>
        </div>

      </div>
    </div>
  )
}
