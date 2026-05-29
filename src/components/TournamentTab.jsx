import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

// ── Styles (mirrored from Admin) ─────────────────────────────────────────────
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
const labelSt = { fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }
const inputSt = { background: '#fff', border: '2px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', width: '100%', fontSize: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600', boxSizing: 'border-box' }
const btnGreen = { background: 'var(--felt)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif' }
const btnGold = { background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif' }
const btnGhost = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600' }

// ── Round-robin schedule generator ───────────────────────────────────────────
function generateMatches(players) {
  const list = [...players]
  if (list.length % 2 !== 0) list.push({ id: 'BYE', name: 'BYE' })
  const n = list.length
  const arr = [...list]
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const matches = []
    for (let i = 0; i < n / 2; i++) {
      const p1 = arr[i]; const p2 = arr[n - 1 - i]
      if (p1.id !== 'BYE' && p2.id !== 'BYE') {
        matches.push({ id: `r${r}-m${i}`, p1Id: p1.id, p1Name: p1.name, p2Id: p2.id, p2Name: p2.name, p1Score: null, p2Score: null, complete: false })
      }
    }
    if (matches.length > 0) rounds.push({ round: r + 1, matches })
    const last = arr.pop(); arr.splice(1, 0, last)
  }
  return rounds
}

// ── Standings calculator ──────────────────────────────────────────────────────
function calcStandings(players, rounds) {
  const stats = {}
  players.forEach(p => { stats[p.id] = { id: p.id, name: p.name, w: 0, l: 0, t: 0, gw: 0, gl: 0 } })
  ;(rounds || []).forEach(r => {
    r.matches.forEach(m => {
      if (!m.complete) return
      const p1 = stats[m.p1Id]; const p2 = stats[m.p2Id]
      if (!p1 || !p2) return
      p1.gw += m.p1Score ?? 0; p1.gl += m.p2Score ?? 0
      p2.gw += m.p2Score ?? 0; p2.gl += m.p1Score ?? 0
      if (m.p1Score > m.p2Score) { p1.w++; p2.l++ }
      else if (m.p2Score > m.p1Score) { p2.w++; p1.l++ }
      else { p1.t++; p2.t++ }
    })
  })
  return Object.values(stats).sort((a, b) =>
    b.w !== a.w ? b.w - a.w : (b.gw - b.gl) - (a.gw - a.gl)
  )
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function TournamentTab({ rosterPlayers }) {
  const [tournament, setTournament] = useState(undefined) // undefined=loading
  const [setupName, setSetupName] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [customName, setCustomName] = useState('')
  const [customPlayers, setCustomPlayers] = useState([])
  const [scoreInputs, setScoreInputs] = useState({}) // { [matchId]: { p1, p2 } }
  const [savingMatch, setSavingMatch] = useState(null)
  const [activeRound, setActiveRound] = useState(1)
  const [view, setView] = useState('matches')
  const [cancelConfirm, setCancelConfirm] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tournaments', 'active'), snap => {
      setTournament(snap.exists() ? snap.data() : null)
    })
    return () => unsub()
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function startTournament() {
    const rosterSelected = rosterPlayers.filter(p => selectedIds.has(p.id)).map(p => ({ id: p.id, name: p.name }))
    const allPlayers = [...rosterSelected, ...customPlayers]
    if (allPlayers.length < 2) return
    const rounds = generateMatches(allPlayers)
    await setDoc(doc(db, 'tournaments', 'active'), {
      name: setupName.trim() || 'Round Robin Tournament',
      players: allPlayers,
      rounds,
      status: 'active',
      createdAt: new Date().toISOString(),
    })
    setActiveRound(1)
    setView('matches')
  }

  async function submitScore(roundNum, matchId) {
    const inp = scoreInputs[matchId] || {}
    const p1Score = parseInt(inp.p1)
    const p2Score = parseInt(inp.p2)
    if (isNaN(p1Score) || isNaN(p2Score) || p1Score < 0 || p2Score < 0) return
    setSavingMatch(matchId)
    const updatedRounds = tournament.rounds.map(r =>
      r.round === roundNum
        ? { ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, p1Score, p2Score, complete: true } : m) }
        : r
    )
    await updateDoc(doc(db, 'tournaments', 'active'), { rounds: updatedRounds })
    setScoreInputs(prev => { const n = { ...prev }; delete n[matchId]; return n })
    setSavingMatch(null)
  }

  async function reopenMatch(roundNum, matchId) {
    const updatedRounds = tournament.rounds.map(r =>
      r.round === roundNum
        ? { ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, p1Score: null, p2Score: null, complete: false } : m) }
        : r
    )
    await updateDoc(doc(db, 'tournaments', 'active'), { rounds: updatedRounds })
  }

  async function endTournament() {
    await updateDoc(doc(db, 'tournaments', 'active'), { status: 'complete' })
  }

  async function clearTournament() {
    await deleteDoc(doc(db, 'tournaments', 'active'))
    setSetupName(''); setSelectedIds(new Set()); setCustomPlayers([])
    setCancelConfirm(false)
  }

  function togglePlayer(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addCustomPlayer() {
    if (!customName.trim()) return
    setCustomPlayers(p => [...p, { id: 'custom-' + Date.now(), name: customName.trim() }])
    setCustomName('')
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (tournament === undefined) {
    return <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading…</p>
  }

  // ── Complete view ─────────────────────────────────────────────────────────
  if (tournament?.status === 'complete') {
    const standings = calcStandings(tournament.players, tournament.rounds)
    return (
      <div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--felt-dark)', letterSpacing: '0.06em' }}>
            {tournament.name}
          </h2>
          <p style={{ color: 'var(--felt)', fontWeight: '700', marginTop: '4px' }}>Tournament Complete!</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {standings.map((p, i) => (
            <div key={p.id} style={{
              ...card, marginBottom: 0, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
              border: i === 0 ? '2px solid var(--gold)' : '1px solid var(--border)',
              background: i === 0 ? 'var(--gold-light)' : 'var(--surface)',
            }}>
              <span style={{ fontSize: i < 3 ? '1.5rem' : '1.1rem', fontFamily: 'Bebas Neue', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'center' }}>
                {MEDAL[i] || i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: '800', fontSize: '1rem' }}>{p.name}</span>
              <div style={{ background: 'var(--felt-light)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', color: 'var(--felt-dark)', fontSize: '0.95rem' }}>{p.w}W–{p.l}L{p.t ? `–${p.t}T` : ''}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>MATCHES</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', color: 'var(--text)', fontSize: '0.95rem' }}>{p.gw}–{p.gl}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>GAMES</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={clearTournament} style={{ ...btnGhost, width: '100%' }}>
          🗑 Clear & Start New Tournament
        </button>
      </div>
    )
  }

  // ── Setup view ────────────────────────────────────────────────────────────
  if (!tournament) {
    const totalPlayers = selectedIds.size + customPlayers.length
    const totalMatches = Math.floor(totalPlayers * (totalPlayers - 1) / 2)
    const activeRoster = rosterPlayers.filter(p => p.active !== false && !p.fillIn)

    return (
      <div>
        <div style={card}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--felt-dark)', letterSpacing: '0.06em', marginBottom: '16px' }}>
            NEW ROUND ROBIN TOURNAMENT
          </h3>

          <label style={labelSt}>TOURNAMENT NAME</label>
          <input
            value={setupName}
            onChange={e => setSetupName(e.target.value)}
            placeholder="Friday Night Round Robin"
            style={{ ...inputSt, marginBottom: '20px' }}
          />

          <label style={labelSt}>SELECT FROM ROSTER</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px', marginBottom: '20px' }}>
            {activeRoster.map(p => {
              const on = selectedIds.has(p.id)
              return (
                <button key={p.id} onClick={() => togglePlayer(p.id)} style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${on ? 'var(--felt)' : 'var(--border)'}`,
                  background: on ? 'var(--felt-light)' : 'var(--surface-2)',
                  color: on ? 'var(--felt-dark)' : 'var(--text)',
                  fontWeight: on ? '800' : '600',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'Nunito, sans-serif',
                  textAlign: 'left',
                }}>
                  {on ? '✓ ' : ''}{p.name}
                </button>
              )
            })}
          </div>

          <label style={labelSt}>ADD WALK-IN / GUEST PLAYERS</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Player name"
              onKeyDown={e => e.key === 'Enter' && addCustomPlayer()}
              style={{ ...inputSt, flex: 1 }}
            />
            <button onClick={addCustomPlayer} style={{ ...btnGreen, flexShrink: 0 }}>Add</button>
          </div>

          {customPlayers.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {customPlayers.map(p => (
                <span key={p.id} style={{
                  background: 'var(--gold-light)', border: '1px solid var(--gold)',
                  borderRadius: '20px', padding: '4px 12px', fontSize: '0.85rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {p.name}
                  <button onClick={() => setCustomPlayers(prev => prev.filter(x => x.id !== p.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-dark)', fontWeight: '800', padding: 0, lineHeight: 1, fontSize: '1rem' }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text)' }}>{totalPlayers}</strong> players
              {totalPlayers > 1 && <> · <strong style={{ color: 'var(--text)' }}>{totalMatches}</strong> matches · <strong style={{ color: 'var(--text)' }}>{totalPlayers - 1}</strong> rounds</>}
            </div>
            <button onClick={startTournament} disabled={totalPlayers < 2}
              style={{ ...btnGold, padding: '11px 28px', fontSize: '1rem', opacity: totalPlayers < 2 ? 0.4 : 1 }}>
              🏆 Start Tournament
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active view ───────────────────────────────────────────────────────────
  const standings = calcStandings(tournament.players, tournament.rounds)
  const totalMatches = tournament.rounds.reduce((a, r) => a + r.matches.length, 0)
  const doneMatches = tournament.rounds.reduce((a, r) => a + r.matches.filter(m => m.complete).length, 0)
  const allDone = doneMatches === totalMatches && totalMatches > 0

  return (
    <div>
      {/* Tournament header card */}
      <div style={{ ...card, paddingBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--felt-dark)', letterSpacing: '0.06em', lineHeight: 1 }}>
              {tournament.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '3px' }}>
              {doneMatches} / {totalMatches} matches complete &nbsp;·&nbsp; {tournament.players.length} players
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {allDone && (
              <button onClick={endTournament} style={{ ...btnGold, padding: '7px 16px' }}>🏁 Finish</button>
            )}
            {!cancelConfirm
              ? <button onClick={() => setCancelConfirm(true)} style={{ ...btnGhost, fontSize: '0.75rem', padding: '6px 12px' }}>✕ Cancel</button>
              : <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ball-red)', fontWeight: '700', alignSelf: 'center' }}>Sure?</span>
                  <button onClick={clearTournament} style={{ background: 'var(--ball-red)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', fontFamily: 'Nunito, sans-serif' }}>Yes</button>
                  <button onClick={() => setCancelConfirm(false)} style={{ ...btnGhost, padding: '6px 10px', fontSize: '0.78rem' }}>No</button>
                </div>
            }
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--felt)', borderRadius: '4px', width: `${totalMatches ? (doneMatches / totalMatches * 100) : 0}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[{ v: 'matches', label: '🎱 Matches' }, { v: 'standings', label: '🏆 Standings' }].map(({ v, label }) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '7px 18px', borderRadius: '20px', border: view === v ? 'none' : '1px solid var(--border)',
            cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'Nunito, sans-serif',
            background: view === v ? 'var(--felt)' : 'var(--surface)',
            color: view === v ? '#fff' : 'var(--text-muted)',
            boxShadow: view === v ? '0 2px 8px rgba(42,122,78,0.25)' : 'none',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── MATCHES VIEW ─────────────────────────────────────────────────── */}
      {view === 'matches' && (
        <div>
          {/* Round pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '16px' }}>
            {tournament.rounds.map(r => {
              const done = r.matches.every(m => m.complete)
              const partial = !done && r.matches.some(m => m.complete)
              return (
                <button key={r.round} onClick={() => setActiveRound(r.round)} style={{
                  flexShrink: 0, padding: '6px 15px', borderRadius: '16px',
                  border: activeRound === r.round ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', fontFamily: 'Nunito, sans-serif',
                  background: activeRound === r.round ? 'var(--felt)' : done ? 'var(--felt-light)' : partial ? 'var(--gold-light)' : 'var(--surface)',
                  color: activeRound === r.round ? '#fff' : done ? 'var(--felt)' : partial ? 'var(--gold-dark)' : 'var(--text-muted)',
                }}>
                  Round {r.round}{done ? ' ✓' : ''}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(tournament.rounds.find(r => r.round === activeRound)?.matches || []).map(m => {
              const inp = scoreInputs[m.id] || {}
              const saving = savingMatch === m.id
              const p1Win = m.complete && m.p1Score > m.p2Score
              const p2Win = m.complete && m.p2Score > m.p1Score
              const canSubmit = inp.p1 !== undefined && inp.p1 !== '' && inp.p2 !== undefined && inp.p2 !== ''

              return (
                <div key={m.id} style={{
                  background: 'var(--surface)',
                  borderRadius: '12px',
                  border: `1px solid ${m.complete ? 'var(--felt-light)' : 'var(--border)'}`,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* P1 */}
                    <span style={{ flex: 1, fontWeight: '800', color: p1Win ? 'var(--felt)' : 'var(--text)', fontSize: '0.95rem' }}>
                      {p1Win && '🏆 '}{m.p1Name}
                    </span>

                    {/* Score area */}
                    {m.complete ? (
                      <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--felt-dark)', letterSpacing: '0.04em', minWidth: '64px', textAlign: 'center' }}>
                        {m.p1Score}–{m.p2Score}
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number" min="0"
                          value={inp.p1 ?? ''}
                          onChange={e => setScoreInputs(prev => ({ ...prev, [m.id]: { ...prev[m.id], p1: e.target.value } }))}
                          style={{ ...inputSt, width: '54px', textAlign: 'center', padding: '6px 4px', fontSize: '1.2rem', fontWeight: '800' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '1rem' }}>–</span>
                        <input
                          type="number" min="0"
                          value={inp.p2 ?? ''}
                          onChange={e => setScoreInputs(prev => ({ ...prev, [m.id]: { ...prev[m.id], p2: e.target.value } }))}
                          style={{ ...inputSt, width: '54px', textAlign: 'center', padding: '6px 4px', fontSize: '1.2rem', fontWeight: '800' }}
                        />
                        <button
                          onClick={() => submitScore(activeRound, m.id)}
                          disabled={saving || !canSubmit}
                          style={{ ...btnGreen, padding: '7px 13px', fontSize: '0.9rem', opacity: canSubmit ? 1 : 0.35 }}
                        >
                          {saving ? '…' : '✓'}
                        </button>
                      </div>
                    )}

                    {/* P2 */}
                    <span style={{ flex: 1, fontWeight: '800', color: p2Win ? 'var(--felt)' : 'var(--text)', fontSize: '0.95rem', textAlign: 'right' }}>
                      {m.p2Name}{p2Win && ' 🏆'}
                    </span>
                  </div>

                  {/* Edit link for completed matches */}
                  {m.complete && (
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button onClick={() => reopenMatch(activeRound, m.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                        edit score
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── STANDINGS VIEW ───────────────────────────────────────────────── */}
      {view === 'standings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {standings.map((p, i) => (
            <div key={p.id} style={{
              ...card, marginBottom: 0, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
              border: i === 0 ? '2px solid var(--gold)' : '1px solid var(--border)',
              background: i === 0 ? 'var(--gold-light)' : 'var(--surface)',
            }}>
              <span style={{ fontSize: i < 3 ? '1.4rem' : '1rem', fontFamily: 'Bebas Neue', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'center' }}>
                {MEDAL[i] || i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: '800', fontSize: '1rem' }}>{p.name}</span>
              <div style={{ background: 'var(--felt-light)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', color: 'var(--felt-dark)', fontSize: '0.95rem' }}>
                  {p.w}W–{p.l}L{p.t ? `–${p.t}T` : ''}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>MATCH RECORD</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '4px 12px', textAlign: 'center' }}>
                <div style={{ fontWeight: '800', color: 'var(--text)', fontSize: '0.95rem' }}>{p.gw}–{p.gl}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>GAMES</div>
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '4px 10px', textAlign: 'center', minWidth: '44px' }}>
                <div style={{ fontWeight: '800', color: p.gw - p.gl >= 0 ? 'var(--felt)' : 'var(--ball-red)', fontSize: '0.9rem' }}>
                  {p.gw - p.gl > 0 ? '+' : ''}{p.gw - p.gl}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700' }}>+/–</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
