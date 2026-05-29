import { useEffect, useState } from 'react'
import { collection, getDocs, runTransaction, doc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { calcMatchResult } from '../utils/scoring'

const STEPS = ['Find Match', 'Verify PIN', 'Enter Scores', 'Done']

export default function SubmitScore() {
  const [step, setStep] = useState(0)
  const [players, setPlayers] = useState([])
  const [matchups, setMatchups] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [myMatchups, setMyMatchups] = useState([])
  const [selectedMatchup, setSelectedMatchup] = useState(null)
  const [games, setGames] = useState([{ p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'players')).then(snap => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.fillIn))
    })
    getDocs(collection(db, 'matchups')).then(snap => {
      setMatchups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  function handleSelectPlayer(p) {
    setSelectedPlayer(p)
    setPin('')
    setPinError('')
    setStep(1)
  }

  function handleVerifyPin() {
    if (pin === String(selectedPlayer.pin)) {
      const pending = matchups.filter(m =>
        m.status === 'pending' &&
        (m.player1Id === selectedPlayer.id || m.player2Id === selectedPlayer.id)
      )
      setMyMatchups(pending)
      setSelectedMatchup(pending.length === 1 ? pending[0] : null)
      setStep(2)
    } else {
      setPinError('Incorrect PIN. Try again.')
    }
  }

  function handleGameScore(gi, side, val) {
    setGames(prev => {
      const next = prev.map((g, i) => i === gi ? { ...g, [side]: val } : g)
      return next
    })
  }

  // Validate: exactly one player per game scores 9
  function getGameError(g) {
    const p1 = parseInt(g.p1)
    const p2 = parseInt(g.p2)
    if (isNaN(p1) || isNaN(p2)) return null
    if (p1 === 9 && p2 === 9) return 'Only one player can score 9 per game'
    if (p1 !== 9 && p2 !== 9) return 'One player must score 9 per game'
    if (p1 < 0 || p2 < 0 || p1 > 9 || p2 > 9) return 'Scores must be 0–9'
    return null
  }

  const allGamesValid = selectedMatchup && games.every(g => {
    const p1 = parseInt(g.p1); const p2 = parseInt(g.p2)
    if (isNaN(p1) || isNaN(p2)) return false
    const err = getGameError(g); if (err) return false
    return true
  })

  function preview() {
    if (!selectedMatchup || !allGamesValid) return null
    const gamesData = games.map(g => ({ player1Score: parseInt(g.p1), player2Score: parseInt(g.p2) }))
    return calcMatchResult(gamesData, selectedMatchup.player1Id, selectedMatchup.player2Id, selectedMatchup.lowerRankedId, selectedMatchup.handicap)
  }

  async function handleSubmit() {
    if (!allGamesValid || !selectedMatchup) return
    setSubmitting(true)
    setSubmitError('')
    const gamesData = games.map(g => ({ player1Score: parseInt(g.p1), player2Score: parseInt(g.p2) }))
    const result = calcMatchResult(gamesData, selectedMatchup.player1Id, selectedMatchup.player2Id, selectedMatchup.lowerRankedId, selectedMatchup.handicap)
    try {
      await runTransaction(db, async t => {
        // ── All reads first ──────────────────────────────────────────────
        const matchRef = doc(db, 'matchups', selectedMatchup.id)
        const p1Ref = doc(db, 'players', selectedMatchup.player1Id)
        const p2Ref = doc(db, 'players', selectedMatchup.player2Id)
        const [snap, p1Snap, p2Snap] = await Promise.all([t.get(matchRef), t.get(p1Ref), t.get(p2Ref)])
        if (snap.data().status !== 'pending') throw new Error('Match already submitted')
        // ── All writes after ─────────────────────────────────────────────
        t.update(matchRef, { status: 'played' })
        const resultRef = doc(collection(db, 'results'))
        t.set(resultRef, {
          matchupId: selectedMatchup.id,
          round: selectedMatchup.round || 1,
          week: selectedMatchup.week,
          player1Id: selectedMatchup.player1Id,
          player2Id: selectedMatchup.player2Id,
          games: gamesData,
          player1Total: result.player1Total,
          player2Total: result.player2Total,
          winner: result.winner,
          submittedBy: selectedPlayer.id,
          submittedAt: serverTimestamp(),
        })
        function updatedStats(snap, playerResult) {
          const d = snap.data()
          const prevGP = d.gamesPlayed || 0
          const prevAvg = d.average || 0
          const newGames = gamesData.length
          const myScores = playerResult.games.map(g => g.playerScore)
          const myTotal = myScores.reduce((a, b) => a + b, 0)
          const newGP = prevGP + newGames
          const newAvg = (prevAvg * prevGP + myTotal) / newGP
          const gameW = (d.gameRecord?.[0] || 0) + playerResult.gameWins
          const gameL = (d.gameRecord?.[1] || 0) + playerResult.gameLosses
          const matchWin = playerResult.matchWin ? 1 : 0
          const matchLoss = playerResult.matchLoss ? 1 : 0
          const matchTie = playerResult.matchTie ? 1 : 0
          const mW = (d.matchRecord?.[0] || 0) + matchWin
          const mL = (d.matchRecord?.[1] || 0) + matchLoss
          const mT = (d.matchRecord?.[2] || 0) + matchTie
          return { gamesPlayed: newGP, average: parseFloat(newAvg.toFixed(4)), gameRecord: [gameW, gameL], matchRecord: [mW, mL, mT] }
        }
        // Update player stats
        t.update(p1Ref, updatedStats(p1Snap, result.player1Result))
        t.update(p2Ref, updatedStats(p2Snap, result.player2Result))
      })
      setStep(3)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep(0); setSelectedPlayer(null); setPin(''); setPinError(''); setMyMatchups([])
    setSelectedMatchup(null); setGames([{ p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' }])
    setSubmitError('')
  }

  const p1Name = selectedMatchup ? (players.find(p => p.id === selectedMatchup.player1Id)?.name || '?') : ''
  const p2Name = selectedMatchup ? (players.find(p => p.id === selectedMatchup.player2Id)?.name || '?') : ''
  const lowerName = selectedMatchup?.lowerRankedId ? (players.find(p => p.id === selectedMatchup.lowerRankedId)?.name || '') : ''
  const pre = preview()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ background: 'var(--felt-dark)', padding: '28px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', color: '#fff', letterSpacing: '0.08em' }}>
          🎯 SUBMIT SCORE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', marginTop: '4px' }}>
          Record your match result
        </p>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '28px' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: i < step ? 'var(--felt)' : i === step ? 'var(--gold)' : 'var(--border)',
                color: i <= step ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '800',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: '20px', height: '2px', background: i < step ? 'var(--felt)' : 'var(--border)', borderRadius: '2px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Select player */}
        {step === 0 && (
          <div style={cardStyle}>
            <h2 style={headingStyle}>Who are you?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map(p => (
                <button key={p.id} onClick={() => handleSelectPlayer(p)} style={playerBtnStyle}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>{p.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Avg {p.average?.toFixed(2)} · HCP {p.handicap}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Verify PIN */}
        {step === 1 && (
          <div style={cardStyle}>
            <h2 style={headingStyle}>Enter your PIN</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
              Hi <strong>{selectedPlayer?.name}</strong>! Enter your 4-digit PIN to continue.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError('') }}
              placeholder="••••"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
            />
            {pinError && <p style={{ color: 'var(--ball-red)', fontSize: '0.85rem', marginTop: '8px' }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setStep(0)} style={secondaryBtnStyle}>← Back</button>
              <button onClick={handleVerifyPin} disabled={!pin} style={{ ...primaryBtnStyle, flex: 1 }}>Verify →</button>
            </div>
          </div>
        )}

        {/* Step 2: Enter scores */}
        {step === 2 && (
          <div>
            {/* Select matchup if multiple pending */}
            {myMatchups.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎱</div>
                <p style={{ color: 'var(--text-muted)' }}>No pending matches found for you this round.</p>
                <button onClick={reset} style={{ ...primaryBtnStyle, marginTop: '16px' }}>Start Over</button>
              </div>
            )}

            {myMatchups.length > 1 && !selectedMatchup && (
              <div style={cardStyle}>
                <h2 style={headingStyle}>Select your match</h2>
                {myMatchups.map(m => {
                  const opp = m.player1Id === selectedPlayer.id
                    ? players.find(p => p.id === m.player2Id)?.name
                    : players.find(p => p.id === m.player1Id)?.name
                  return (
                    <button key={m.id} onClick={() => setSelectedMatchup(m)} style={{ ...playerBtnStyle, marginBottom: '8px' }}>
                      <span>Week {m.week} vs <strong>{opp || '?'}</strong></span>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedMatchup && (
              <div style={cardStyle}>
                <h2 style={headingStyle}>Game Scores</h2>
                {/* Match info */}
                <div style={{
                  background: 'var(--felt-light)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: '800', color: 'var(--felt-dark)' }}>{p1Name}</span>
                  <span style={{
                    background: lowerName ? 'var(--gold)' : 'var(--surface-2)',
                    color: lowerName ? '#fff' : 'var(--text-muted)',
                    borderRadius: '8px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                  }}>
                    {lowerName ? `+${selectedMatchup.handicap}→${lowerName}` : 'VS'}
                  </span>
                  <span style={{ fontWeight: '800', color: 'var(--felt-dark)' }}>{p2Name}</span>
                </div>

                {/* Per-game score inputs */}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                  One player scores 9 per game; the other scores 0–8.
                </p>
                {games.map((g, gi) => {
                  const err = g.p1 !== '' && g.p2 !== '' ? getGameError(g) : null
                  return (
                    <div key={gi} style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Game {gi + 1}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{p1Name}</label>
                          <input
                            type="number" min="0" max="9"
                            value={g.p1}
                            onChange={e => handleGameScore(gi, 'p1', e.target.value)}
                            style={{ ...inputStyle, textAlign: 'center', fontSize: '1.4rem', fontWeight: '800' }}
                          />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', paddingTop: '18px' }}>vs</span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{p2Name}</label>
                          <input
                            type="number" min="0" max="9"
                            value={g.p2}
                            onChange={e => handleGameScore(gi, 'p2', e.target.value)}
                            style={{ ...inputStyle, textAlign: 'center', fontSize: '1.4rem', fontWeight: '800' }}
                          />
                        </div>
                      </div>
                      {err && <p style={{ color: 'var(--ball-red)', fontSize: '0.8rem', marginTop: '4px' }}>{err}</p>}
                    </div>
                  )
                })}

                {/* Preview */}
                {pre && (
                  <div style={{
                    background: 'var(--gold-light)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginTop: '8px',
                    marginBottom: '16px',
                    border: '1px solid var(--gold)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--felt-dark)', letterSpacing: '0.05em' }}>
                      {p1Name} {pre.player1Total} – {pre.player2Total} {p2Name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold-dark)', fontWeight: '700', marginTop: '4px' }}>
                      {pre.winner === 'tie' ? 'TIE' : pre.winner === selectedMatchup.player1Id ? `${p1Name} wins!` : `${p2Name} wins!`}
                    </div>
                  </div>
                )}

                {submitError && <p style={{ color: 'var(--ball-red)', fontSize: '0.85rem', marginBottom: '12px' }}>{submitError}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={reset} style={secondaryBtnStyle}>← Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={!allGamesValid || submitting}
                    style={{ ...primaryBtnStyle, flex: 1, opacity: (!allGamesValid || submitting) ? 0.5 : 1 }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Score ✓'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: 'var(--felt-dark)', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Score Submitted!
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Result recorded. Check standings to see the update.
            </p>
            <button onClick={reset} style={primaryBtnStyle}>Submit Another</button>
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'var(--surface)',
  borderRadius: '16px',
  border: '1px solid var(--border)',
  padding: '24px 20px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  marginBottom: '16px',
}

const headingStyle = {
  fontFamily: 'Bebas Neue',
  fontSize: '1.5rem',
  color: 'var(--felt-dark)',
  letterSpacing: '0.06em',
  marginBottom: '16px',
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '2px solid var(--border)',
  background: '#fff',
  fontSize: '1rem',
  fontFamily: 'Nunito, sans-serif',
  fontWeight: '600',
  color: 'var(--text)',
  boxSizing: 'border-box',
  outline: 'none',
}

const primaryBtnStyle = {
  background: 'var(--felt)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 20px',
  fontFamily: 'Nunito, sans-serif',
  fontWeight: '800',
  fontSize: '0.95rem',
  cursor: 'pointer',
  textAlign: 'center',
}

const secondaryBtnStyle = {
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 16px',
  fontFamily: 'Nunito, sans-serif',
  fontWeight: '700',
  fontSize: '0.9rem',
  cursor: 'pointer',
}

const playerBtnStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '12px 16px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  textAlign: 'left',
}
