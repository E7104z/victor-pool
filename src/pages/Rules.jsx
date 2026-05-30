export default function Rules() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 16px 56px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue',
            fontSize: 'clamp(2rem, 7vw, 3rem)',
            color: 'var(--felt-dark)',
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}>
            📋 Rules &amp; Guide
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            Everything you need to know to play in the Victor Pool League.
          </p>
        </div>

        {/* ── Submitting a Score ───────────────────────────────────────── */}
        <Section title="Submitting a Score">
          {[
            'Tap Submit Score in the nav bar.',
            'Tap your name.',
            'Enter your 4-digit PIN.',
            'Enter the score for each of the 3 games. Winner scores 9. Loser enters balls pocketed.',
            'Tap Submit. Standings update automatically.',
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '12px 0',
              borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--felt)',
                color: '#fff',
                fontFamily: 'Bebas Neue',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {i + 1}
              </span>
              <span style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.5, paddingTop: '4px' }}>
                {step}
              </span>
            </div>
          ))}
        </Section>

        {/* ── Scoring Rules ────────────────────────────────────────────── */}
        <Section title="Scoring Rules">
          <Table
            rows={[
              ['Win the game (sink the 8-ball)', '9 points'],
              ['Lose the game', '1 point per ball you pocketed during the game'],
              ['Scratch on the 8-ball', 'Your ball count minus 4 (e.g. pocketed 7 balls = 3 pts)'],
              ['Match winner', 'Higher total across all 3 games (after handicap)'],
              ['Tie', 'Equal totals — match is recorded as a tie'],
            ]}
            headers={['Situation', 'Score']}
          />
        </Section>

        {/* ── Handicap ─────────────────────────────────────────────────── */}
        <Section title="Handicap">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>
            The lower-ranked player in each match gets bonus points added to their total:
          </p>
          <Table
            headers={['Your Average', 'Bonus Points']}
            rows={[
              ['7.5 or above', '+8'],
              ['6.5 – 7.49', '+7'],
              ['5.5 – 6.49', '+6'],
              ['Below 5.5', '+5'],
            ]}
            highlightCol={1}
          />
        </Section>

        {/* ── Quick Reference ──────────────────────────────────────────── */}
        <Section title="Quick Reference">
          <Table
            rows={[
              ['Forgot your PIN?', 'Ask the admin to reset it.'],
              ['Wrong score submitted?', 'Contact the admin — they can fix it.'],
              ['No match showing?', 'Already submitted, or you have a BYE this week.'],
              ['When do standings update?', 'Immediately. Just refresh the page.'],
            ]}
          />
        </Section>

        {/* ── 8-Ball Rules ─────────────────────────────────────────────── */}
        <Section title="8-Ball Rules">
          <Table
            rows={[
              ['Break', 'Groups are not assigned on the break. You claim solids or stripes only after sinking a ball on a regular shot.'],
              ['Call your shots', 'Call the ball and pocket before every shot. Uncalled balls that drop don\'t count.'],
              ['Your turn', 'Must hit one of your balls first. Keep shooting until you miss.'],
              ['Foul', 'Opponent gets ball-in-hand anywhere on the table.'],
              ['The 8-ball', 'Sink all your balls first, then call your pocket and sink the 8.'],
              ['Lose instantly', 'Sink the 8 before clearing your balls, or scratch on the 8.'],
            ]}
          />
        </Section>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginTop: '8px',
          fontStyle: 'italic',
        }}>
          Good luck this season. 🎱
        </p>

      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      <h2 style={{
        fontFamily: 'Bebas Neue',
        fontSize: '1.5rem',
        color: 'var(--felt-dark)',
        letterSpacing: '0.07em',
        marginBottom: '16px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Table({ headers, rows, highlightCol }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        {headers && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  background: 'var(--felt-dark)',
                  color: '#fff',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontFamily: 'Nunito',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  letterSpacing: '0.04em',
                  borderRadius: i === 0 ? '8px 0 0 0' : i === headers.length - 1 ? '0 8px 0 0' : undefined,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '11px 14px',
                  color: highlightCol === ci ? 'var(--gold-dark)' : ci === 0 ? 'var(--felt)' : 'var(--text)',
                  fontWeight: highlightCol === ci ? '800' : ci === 0 ? '700' : '400',
                  fontSize: highlightCol === ci ? '1rem' : '0.9rem',
                  borderBottom: '1px solid var(--border)',
                  lineHeight: 1.5,
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
