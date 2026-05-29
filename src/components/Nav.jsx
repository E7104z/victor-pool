import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/roster', label: 'Standings' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/results', label: 'Results' },
  { to: '/submit', label: 'Submit Score' },
]

export default function Nav() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      background: 'var(--felt-dark)',
      borderBottom: '4px solid var(--gold)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        height: '54px',
        gap: '4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginRight: '4px' }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🎱</span>
          <span style={{
            fontFamily: 'Bebas Neue',
            fontSize: '1.35rem',
            color: 'var(--gold)',
            letterSpacing: '0.1em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
            VICTOR POOL
          </span>
        </Link>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', flexShrink: 0, marginRight: '4px' }} />

        {/* Links */}
        {links.map(l => {
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to} style={{
              color: active ? 'var(--gold)' : 'rgba(255,255,255,0.85)',
              fontWeight: active ? '800' : '600',
              fontSize: '0.82rem',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: '8px',
              background: active ? 'rgba(232,160,32,0.15)' : 'transparent',
              border: active ? '1px solid rgba(232,160,32,0.4)' : '1px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {l.label}
            </Link>
          )
        })}
        <Link to="/admin" style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.75rem',
          textDecoration: 'none',
          padding: '4px 8px',
          flexShrink: 0,
        }}>
          ⚙
        </Link>
      </div>
    </nav>
  )
}
