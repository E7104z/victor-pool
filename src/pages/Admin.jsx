import { useState, useEffect } from 'react'
import { auth, googleProvider, db } from '../firebase'
import { signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  collection, onSnapshot, doc, updateDoc, writeBatch, getDoc, query, orderBy
} from 'firebase/firestore'
import { calcMatchResult } from '../utils/scoring'
import { seedDatabase, seedSchedule } from '../seed'
import TournamentTab from '../components/TournamentTab'

const ADMIN_EMAILS = ['jasonhgriffin@gmail.com', 'johnny.kane@charter.net']

function toCSV(rows) {
  return rows.map(r =>
    r.map(cell => {
      const s = cell == null ? '' : String(cell)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  ).join('\n')
}

function downloadFile(name, content, type = 'text/csv') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

// ── Shared micro-styles ──────────────────────────────────────────────────────
const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '18px 20px',
  marginBottom: '16px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}
const labelSt = { fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }
const inputSt = { background: '#fff', border: '2px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', width: '100%', fontSize: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600', boxSizing: 'border-box' }
const btnGreen = { background: 'var(--felt)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif' }
const btnGold = { background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif' }
const btnGhost = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600' }

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('choose') // 'choose' | 'email'

  async function handleEmailLogin(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert('Sign-in failed: ' + (err.message || err.code))
      }
    }
  }

  if (mode === 'email') {
    return (
      <div style={{ ...{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔑</div>
        <form onSubmit={handleEmailLogin}>
          <div style={{ marginBottom: '12px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ background: '#fff', border: '2px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', width: '100%', fontSize: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ background: '#fff', border: '2px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', width: '100%', fontSize: '0.9rem', fontFamily: 'Nunito, sans-serif', fontWeight: '600', boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: 'var(--ball-red)', fontSize: '0.82rem', marginBottom: '12px', fontWeight: '700' }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ ...btnGreen, width: '100%', fontSize: '1rem', padding: '12px', marginBottom: '10px' }}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <button onClick={() => { setMode('choose'); setError('') }} style={{ ...btnGhost, width: '100%' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔑</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>Sign in to access the admin panel.</p>
      <button onClick={handleGoogleSignIn} style={{ ...btnGreen, width: '100%', fontSize: '1rem', padding: '12px', marginBottom: '10px' }}>
        Sign in with Google
      </button>
      <button onClick={() => setMode('email')} style={{ ...btnGhost, width: '100%' }}>
        Sign in with Email & Password
      </button>
    </div>
  )
}

export default function Admin() {
  const [user, setUser] = useState(null)
  const [players, setPlayers] = useState([])
  const [matchups, setMatchups] = useState([])
  const [results, setResults] = useState([])
  const [archives, setArchives] = useState([])
  const [tab, setTab] = useState('schedule')
  const [seeded, setSeeded] = useState(false)
  const [scheduledSeeded, setScheduleSeeded] = useState(false)
  const [newRound, setNewRound] = useState({ round: 2, weekStart: 10 })
  const [newPlayer, setNewPlayer] = useState({ name: '', phone: '', pin: '', email: '' })
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [pinEdits, setPinEdits] = useState({})   // { [playerId]: { value, saved } }
  const [newSeasonConfirm, setNewSeasonConfirm] = useState(false)
  const [newSeasonBusy, setNewSeasonBusy] = useState(false)
  const [editingMatchupId, setEditingMatchupId] = useState(null)
  const [matchupEdit, setMatchupEdit] = useState({ p1: '', p2: 'BYE' })
  const [editingResultId, setEditingResultId] = useState(null)
  const [editGames, setEditGames] = useState([{ p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' }])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!ADMIN_EMAILS.includes(user?.email)) return
    const u1 = onSnapshot(query(collection(db, 'players'), orderBy('average', 'desc')),
      s => setPlayers(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(query(collection(db, 'matchups'), orderBy('week', 'desc')),
      s => setMatchups(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u3 = onSnapshot(collection(db, 'results'),
      s => setResults(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u4 = onSnapshot(collection(db, 'archives'),
      s => setArchives(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2(); u3(); u4() }
  }, [user])

  async function handleSeed() {
    await seedDatabase()
    setSeeded(true)
  }

  async function handleSeedSchedule() {
    await seedSchedule()
    setScheduleSeeded(true)
  }

  async function handleAddPlayer(e) {
    e.preventDefault()
    if (!newPlayer.name.trim()) return
    setAddingPlayer(true)
    try {
      const id = newPlayer.name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'players', id), {
        name: newPlayer.name.trim(),
        phone: newPlayer.phone.trim(),
        pin: newPlayer.pin.trim() || '0000',
        email: newPlayer.email.trim(),
        active: true, fillIn: false,
        gamesPlayed: 0, totalPoints: 0, average: 0, handicap: 5,
        gameRecord: [0, 0], matchRecord: [0, 0, 0],
        createdAt: new Date(),
      })
      setNewPlayer({ name: '', phone: '', pin: '', email: '' })
    } catch (err) {
      alert('Error adding player: ' + err.message)
    }
    setAddingPlayer(false)
  }

  async function generateRound() {
    const activePlayers = players.filter(p => p.active)
    const sorted = [...activePlayers].sort((a, b) => b.average - a.average)
    const batch = writeBatch(db)
    const week = newRound.weekStart
    const n = sorted.length % 2 === 0 ? sorted.length : sorted.length + 1
    const playerList = sorted.map(p => p.id)
    if (playerList.length % 2 !== 0) playerList.push('BYE')
    const numWeeks = sorted.length - 1
    for (let w = 0; w < numWeeks; w++) {
      for (let i = 0; i < n / 2; i++) {
        const p1Id = playerList[i]; const p2Id = playerList[n - 1 - i]
        if (p1Id === 'BYE' || p2Id === 'BYE') {
          const realPlayer = p1Id === 'BYE' ? p2Id : p1Id
          batch.set(doc(collection(db, 'matchups')), { round: newRound.round, week: week + w, player1Id: realPlayer, player2Id: null, lowerRankedId: null, handicap: 0, status: 'bye' })
        } else {
          const p1 = sorted.find(x => x.id === p1Id); const p2 = sorted.find(x => x.id === p2Id)
          const lowerRanked = (p1?.average || 0) < (p2?.average || 0) ? p1Id : p2Id
          const lowerPlayer = lowerRanked === p1Id ? p1 : p2
          const handicap = (lowerPlayer?.gamesPlayed > 0) ? (lowerPlayer?.handicap || 0) : 0
          batch.set(doc(collection(db, 'matchups')), { round: newRound.round, week: week + w, player1Id: p1Id, player2Id: p2Id, lowerRankedId: lowerRanked, handicap, status: 'pending' })
        }
      }
      const last = playerList.pop(); playerList.splice(1, 0, last)
    }
    await batch.commit()
    alert(`Round ${newRound.round} schedule generated — ${numWeeks} weeks.`)
  }

  async function overrideMatchup(matchupId, field, value) {
    await updateDoc(doc(db, 'matchups', matchupId), { [field]: value })
  }

  async function updatePlayerField(playerId, field, value) {
    await updateDoc(doc(db, 'players', playerId), { [field]: value })
  }

  async function startNewSeason() {
    setNewSeasonBusy(true)
    try {
      // 1. Auto-archive current standings
      const { getDocs, deleteDoc } = await import('firebase/firestore')
      const roundNum = Math.max(1, ...matchups.map(m => m.round || 1))
      const archiveId = `round-${roundNum}-${Date.now()}`
      const archiveBatch = writeBatch(db)
      archiveBatch.set(doc(db, 'archives', archiveId), {
        round: roundNum,
        label: `Round ${roundNum} Final`,
        archivedAt: new Date(),
        standings: players.map(p => ({
          id: p.id, name: p.name, average: p.average, handicap: p.handicap,
          gamesPlayed: p.gamesPlayed, totalPoints: p.totalPoints,
          gameRecord: p.gameRecord || [0, 0], matchRecord: p.matchRecord || [0, 0, 0]
        }))
      })
      await archiveBatch.commit()

      // 2. Delete all matchups and results in batches of 400
      const [matchSnap, resultSnap] = await Promise.all([
        getDocs(collection(db, 'matchups')),
        getDocs(collection(db, 'results')),
      ])
      const toDelete = [...matchSnap.docs, ...resultSnap.docs]
      for (let i = 0; i < toDelete.length; i += 400) {
        const chunk = toDelete.slice(i, i + 400)
        const b = writeBatch(db)
        chunk.forEach(d => b.delete(d.ref))
        await b.commit()
      }

      // 3. Reset all player stats
      const { calcHandicap } = await import('../utils/scoring')
      const resetBatch = writeBatch(db)
      players.forEach(p => {
        resetBatch.update(doc(db, 'players', p.id), {
          gamesPlayed: 0, totalPoints: 0, average: 0,
          handicap: calcHandicap(0),
          gameRecord: [0, 0], matchRecord: [0, 0, 0],
        })
      })
      await resetBatch.commit()

      setNewSeasonConfirm(false)
      setNewRound({ round: roundNum + 1, weekStart: 1 })
      alert(`Season reset! Round ${roundNum} archived. All stats cleared. Ready to generate Round ${roundNum + 1}.`)
    } catch (err) {
      alert('Error resetting season: ' + err.message)
    }
    setNewSeasonBusy(false)
  }

  async function savePin(playerId) {
    const val = (pinEdits[playerId]?.value ?? '').trim()
    if (!val) return
    await updateDoc(doc(db, 'players', playerId), { pin: val })
    setPinEdits(prev => ({ ...prev, [playerId]: { value: val, saved: true } }))
    setTimeout(() => setPinEdits(prev => ({ ...prev, [playerId]: { value: val, saved: false } })), 2000)
  }

  async function deleteUnplayedMatchups() {
    const round = newRound.round
    const toDelete = matchups.filter(m => (m.round || 1) === round && m.status !== 'played')
    if (toDelete.length === 0) { alert('No unplayed matchups found for this round.'); return }
    if (!window.confirm(`Delete ${toDelete.length} unplayed matchups from Round ${round}? This cannot be undone.`)) return
    const { deleteDoc } = await import('firebase/firestore')
    const b = writeBatch(db)
    toDelete.forEach(m => b.delete(doc(db, 'matchups', m.id)))
    await b.commit()
    alert(`Deleted ${toDelete.length} matchups. You can now regenerate the schedule.`)
  }

  function reversedStats(snap, oldGames, oldGameWins, oldOutcome) {
    const d = snap.data()
    const gp = d.gamesPlayed || 0
    const oldRaw = oldGames.reduce((s, x) => s + x, 0)
    const newGP = Math.max(0, gp - oldGames.length)
    const newAvg = newGP > 0 ? ((d.average || 0) * gp - oldRaw) / newGP : 0
    return {
      gamesPlayed: newGP,
      average: parseFloat(newAvg.toFixed(4)),
      gameRecord: [
        Math.max(0, (d.gameRecord?.[0] || 0) - oldGameWins),
        Math.max(0, (d.gameRecord?.[1] || 0) - (oldGames.length - oldGameWins)),
      ],
      matchRecord: [
        Math.max(0, (d.matchRecord?.[0] || 0) - (oldOutcome === 'win' ? 1 : 0)),
        Math.max(0, (d.matchRecord?.[1] || 0) - (oldOutcome === 'loss' ? 1 : 0)),
        Math.max(0, (d.matchRecord?.[2] || 0) - (oldOutcome === 'tie' ? 1 : 0)),
      ],
    }
  }

  async function resetResult(r) {
    if (!window.confirm(`Reset this result? The match will reopen for resubmission and stats will be reversed.`)) return
    const oldGames = r.games || []
    const p1GameWins = oldGames.filter(g => g.player1Score === 9).length
    const p2GameWins = oldGames.length - p1GameWins
    const p1Outcome = r.winner === r.player1Id ? 'win' : r.winner === r.player2Id ? 'loss' : 'tie'
    const p2Outcome = r.winner === r.player2Id ? 'win' : r.winner === r.player1Id ? 'loss' : 'tie'
    const [p1Snap, p2Snap] = await Promise.all([
      getDoc(doc(db, 'players', r.player1Id)),
      getDoc(doc(db, 'players', r.player2Id)),
    ])
    const b = writeBatch(db)
    b.update(doc(db, 'players', r.player1Id), reversedStats(p1Snap, oldGames.map(g => g.player1Score), p1GameWins, p1Outcome))
    b.update(doc(db, 'players', r.player2Id), reversedStats(p2Snap, oldGames.map(g => g.player2Score), p2GameWins, p2Outcome))
    b.delete(doc(db, 'results', r.id))
    b.update(doc(db, 'matchups', r.matchupId), { status: 'pending' })
    await b.commit()
  }

  function startEditResult(r) {
    setEditingResultId(r.id)
    setEditGames((r.games || []).map(g => ({ p1: String(g.player1Score), p2: String(g.player2Score) })))
  }

  function getEditGameError(g) {
    const p1 = parseInt(g.p1), p2 = parseInt(g.p2)
    if (isNaN(p1) || isNaN(p2)) return 'Enter both scores'
    if (p1 === 9 && p2 === 9) return 'Only one player can score 9'
    if (p1 !== 9 && p2 !== 9) return 'One player must score 9'
    if (p1 < 0 || p2 < 0 || p1 > 9 || p2 > 9) return 'Scores must be 0–9'
    return null
  }

  async function saveResultEdit(r) {
    if (editGames.some(g => getEditGameError(g))) return
    const newGamesData = editGames.map(g => ({ player1Score: parseInt(g.p1), player2Score: parseInt(g.p2) }))
    const matchup = matchups.find(m => m.id === r.matchupId)
    const newResult = calcMatchResult(newGamesData, r.player1Id, r.player2Id, matchup?.lowerRankedId, matchup?.handicap || 0)
    const [p1Snap, p2Snap] = await Promise.all([
      getDoc(doc(db, 'players', r.player1Id)),
      getDoc(doc(db, 'players', r.player2Id)),
    ])
    const oldGames = r.games || []
    const p1OldWins = oldGames.filter(g => g.player1Score === 9).length
    const p2OldWins = oldGames.length - p1OldWins
    const p1NewWins = newGamesData.filter(g => g.player1Score === 9).length
    const p2NewWins = newGamesData.length - p1NewWins
    const p1OldOutcome = r.winner === r.player1Id ? 'win' : r.winner === r.player2Id ? 'loss' : 'tie'
    const p2OldOutcome = r.winner === r.player2Id ? 'win' : r.winner === r.player1Id ? 'loss' : 'tie'
    const p1NewOutcome = newResult.winner === r.player1Id ? 'win' : newResult.winner === r.player2Id ? 'loss' : 'tie'
    const p2NewOutcome = newResult.winner === r.player2Id ? 'win' : newResult.winner === r.player1Id ? 'loss' : 'tie'

    function adjustedStats(snap, oldScores, oldWins, oldOutcome, newScores, newWins, newOutcome) {
      const d = snap.data()
      const gp = d.gamesPlayed || 0
      const oldRaw = oldScores.reduce((s, x) => s + x, 0)
      const newRaw = newScores.reduce((s, x) => s + x, 0)
      const newAvg = gp > 0 ? ((d.average || 0) * gp - oldRaw + newRaw) / gp : 0
      return {
        average: parseFloat(newAvg.toFixed(4)),
        gameRecord: [
          Math.max(0, (d.gameRecord?.[0] || 0) - oldWins + newWins),
          Math.max(0, (d.gameRecord?.[1] || 0) - (oldScores.length - oldWins) + (newScores.length - newWins)),
        ],
        matchRecord: [
          Math.max(0, (d.matchRecord?.[0] || 0) - (oldOutcome === 'win' ? 1 : 0) + (newOutcome === 'win' ? 1 : 0)),
          Math.max(0, (d.matchRecord?.[1] || 0) - (oldOutcome === 'loss' ? 1 : 0) + (newOutcome === 'loss' ? 1 : 0)),
          Math.max(0, (d.matchRecord?.[2] || 0) - (oldOutcome === 'tie' ? 1 : 0) + (newOutcome === 'tie' ? 1 : 0)),
        ],
      }
    }

    const b = writeBatch(db)
    b.update(doc(db, 'players', r.player1Id), adjustedStats(p1Snap, oldGames.map(g => g.player1Score), p1OldWins, p1OldOutcome, newGamesData.map(g => g.player1Score), p1NewWins, p1NewOutcome))
    b.update(doc(db, 'players', r.player2Id), adjustedStats(p2Snap, oldGames.map(g => g.player2Score), p2OldWins, p2OldOutcome, newGamesData.map(g => g.player2Score), p2NewWins, p2NewOutcome))
    b.update(doc(db, 'results', r.id), { games: newGamesData, player1Total: newResult.player1Total, player2Total: newResult.player2Total, winner: newResult.winner })
    await b.commit()
    setEditingResultId(null)
  }

  function startEditMatchup(m) {
    setEditingMatchupId(m.id)
    setMatchupEdit({ p1: m.player1Id, p2: m.player2Id || 'BYE' })
  }

  async function saveMatchupEdit(matchupId) {
    const { p1, p2 } = matchupEdit
    if (!p1) return
    if (p2 === 'BYE') {
      await updateDoc(doc(db, 'matchups', matchupId), {
        player1Id: p1, player2Id: null, lowerRankedId: null, handicap: 0, status: 'bye',
      })
    } else {
      const p1Data = players.find(p => p.id === p1)
      const p2Data = players.find(p => p.id === p2)
      const lowerRanked = (p1Data?.average || 0) <= (p2Data?.average || 0) ? p1 : p2
      const lowerPlayer = lowerRanked === p1 ? p1Data : p2Data
      await updateDoc(doc(db, 'matchups', matchupId), {
        player1Id: p1, player2Id: p2, lowerRankedId: lowerRanked,
        handicap: lowerPlayer?.handicap || 0, status: 'pending',
      })
    }
    setEditingMatchupId(null)
  }

  async function togglePlayerActive(playerId, current) {
    await updateDoc(doc(db, 'players', playerId), { active: !current })
  }

  async function archiveStandings() {
    const round = prompt('Round number to archive:', '1')
    if (!round) return
    const label = prompt('Label:', `Round ${round} Final`)
    const archiveId = `round-${round}-${Date.now()}`
    const batch = writeBatch(db)
    batch.set(doc(db, 'archives', archiveId), {
      round: parseInt(round), label: label || `Round ${round}`, archivedAt: new Date(),
      standings: players.map(p => ({ id: p.id, name: p.name, average: p.average, handicap: p.handicap, gamesPlayed: p.gamesPlayed, totalPoints: p.totalPoints, gameRecord: p.gameRecord || [0, 0], matchRecord: p.matchRecord || [0, 0, 0] }))
    })
    await batch.commit()
    alert(`Archived as "${label}".`)
  }

  function exportStandingsCSV() {
    const header = ['Rank', 'Name', 'Games Played', 'Total Points', 'Average', 'Handicap', 'Game Wins', 'Game Losses', 'Match Wins', 'Match Losses', 'Match Ties']
    const rows = players.map((p, i) => [i + 1, p.name, p.gamesPlayed, p.totalPoints, p.average?.toFixed(5), p.handicap, p.gameRecord?.[0] ?? 0, p.gameRecord?.[1] ?? 0, p.matchRecord?.[0] ?? 0, p.matchRecord?.[1] ?? 0, p.matchRecord?.[2] ?? 0])
    downloadFile(`standings-${new Date().toISOString().slice(0, 10)}.csv`, toCSV([header, ...rows]))
  }

  function exportResultsCSV() {
    const playerName = id => players.find(p => p.id === id)?.name || id
    const header = ['Round', 'Week', 'Player 1', 'Player 2', 'P1 Total', 'P2 Total', 'Winner', 'Handicap', 'Lower Ranked', 'Submitted By', 'Submitted At']
    const sorted = [...results].sort((a, b) => (a.round - b.round) || (a.week - b.week))
    const rows = sorted.map(r => [r.round, r.week, playerName(r.player1Id), playerName(r.player2Id), r.player1Total, r.player2Total, r.winner === 'tie' ? 'tie' : playerName(r.winner), r.handicapApplied, playerName(r.lowerRankedId), playerName(r.submittedBy), r.submittedAt?.toDate ? r.submittedAt.toDate().toISOString() : ''])
    downloadFile(`results-${new Date().toISOString().slice(0, 10)}.csv`, toCSV([header, ...rows]))
  }

  function emailUnsubmittedReminders() {
    const pending = matchups.filter(m => m.status === 'pending' && m.player2Id)
    if (pending.length === 0) { alert('No pending matchups.'); return }
    const recipients = new Set()
    pending.forEach(m => {
      const p1 = players.find(p => p.id === m.player1Id); const p2 = players.find(p => p.id === m.player2Id)
      if (p1?.email) recipients.add(p1.email); if (p2?.email) recipients.add(p2.email)
    })
    if (recipients.size === 0) { alert('No emails on file. Add emails in the Players tab first.'); return }
    const lines = pending.map(m => {
      const p1 = players.find(p => p.id === m.player1Id)?.name || m.player1Id
      const p2 = players.find(p => p.id === m.player2Id)?.name || m.player2Id
      return `Wk ${m.week}: ${p1} vs ${p2}`
    })
    const subject = encodeURIComponent('Victor Pool — Unsubmitted Matches Reminder')
    const body = encodeURIComponent(`Hey,\n\nThe following matches haven't been submitted yet:\n\n${lines.join('\n')}\n\nPlease submit at the league site as soon as possible.\n\nThanks!`)
    window.location.href = `mailto:?bcc=${[...recipients].join(',')}&subject=${subject}&body=${body}`
  }

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ background: 'var(--felt-dark)', padding: '28px 20px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.8rem', color: '#fff', letterSpacing: '0.08em' }}>⚙ ADMIN</h1>
        </div>
        <div style={{ maxWidth: '360px', margin: '48px auto', padding: '0 16px', textAlign: 'center' }}>
          <AdminLogin />
        </div>
      </div>
    )
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'var(--ball-red)', fontWeight: '700', marginBottom: '12px' }}>Access denied. Not an admin account.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Signed in as: {user.email}</p>
        <button onClick={() => signOut(auth)} style={btnGhost}>Sign out</button>
      </div>
    )
  }

  const TABS = [
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'players', label: '👥 Players' },
    { id: 'results', label: '📊 Results' },
    { id: 'tournament', label: '🏆 Tournament' },
    { id: 'archives', label: '📦 Archives' },
    { id: 'setup', label: '⚙ Setup' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--felt-dark)', padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#fff', letterSpacing: '0.08em' }}>⚙ ADMIN PANEL</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '2px' }}>{user.email}</p>
        </div>
        <button onClick={() => signOut(auth)} style={{ ...btnGhost, fontSize: '0.78rem', padding: '6px 12px', marginTop: '4px' }}>Sign out</button>
      </div>

      {/* Tab bar */}
      <div style={{
        background: 'var(--felt-dark)',
        display: 'flex',
        gap: '2px',
        overflowX: 'auto',
        padding: '10px 16px 0',
        borderBottom: '3px solid var(--gold)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.82rem',
              background: tab === t.id ? 'var(--bg)' : 'transparent',
              color: tab === t.id ? 'var(--felt-dark)' : 'rgba(255,255,255,0.65)',
              borderBottom: tab === t.id ? '3px solid var(--gold)' : '3px solid transparent',
              marginBottom: '-3px',
              fontFamily: 'Nunito, sans-serif',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* ─── SCHEDULE TAB ─────────────────────────────────────────────────── */}
        {tab === 'schedule' && (
          <div>
            <div style={card}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--felt-dark)', marginBottom: '14px', letterSpacing: '0.06em' }}>GENERATE NEW ROUND</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <label style={labelSt}>Round #</label>
                  <input type="number" value={newRound.round} onChange={e => setNewRound(r => ({ ...r, round: parseInt(e.target.value) }))}
                    style={{ ...inputSt, width: '80px' }} />
                </div>
                <div>
                  <label style={labelSt}>Start Week #</label>
                  <input type="number" value={newRound.weekStart} onChange={e => setNewRound(r => ({ ...r, weekStart: parseInt(e.target.value) }))}
                    style={{ ...inputSt, width: '90px' }} />
                </div>
                <button onClick={generateRound} style={btnGreen}>Generate</button>
                <button onClick={emailUnsubmittedReminders} style={btnGold}>✉ Email Reminders</button>
                <button onClick={deleteUnplayedMatchups}
                  style={{ ...btnGhost, border: '1px solid var(--ball-red)', color: 'var(--ball-red)' }}>
                  🗑 Clear Unplayed
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {matchups.map(m => (
                <div key={m.id} style={{
                  background: 'var(--surface)',
                  border: `1px solid ${m.status === 'played' ? 'var(--felt-light)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  fontSize: '0.875rem',
                }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: '44px', fontWeight: '600' }}>Wk {m.week}</span>
                  {editingMatchupId === m.id ? (
                    <>
                      <select value={matchupEdit.p1} onChange={e => setMatchupEdit(v => ({ ...v, p1: e.target.value }))}
                        style={{ ...inputSt, flex: 1, padding: '4px 8px', fontSize: '0.82rem' }}>
                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>vs</span>
                      <select value={matchupEdit.p2} onChange={e => setMatchupEdit(v => ({ ...v, p2: e.target.value }))}
                        style={{ ...inputSt, flex: 1, padding: '4px 8px', fontSize: '0.82rem' }}>
                        <option value="BYE">BYE</option>
                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button onClick={() => saveMatchupEdit(m.id)} style={{ ...btnGreen, padding: '4px 12px', fontSize: '0.75rem' }}>Save</button>
                      <button onClick={() => setEditingMatchupId(null)} style={{ ...btnGhost, padding: '4px 12px', fontSize: '0.75rem' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: '700', color: 'var(--text)' }}>
                        {players.find(p => p.id === m.player1Id)?.name || m.player1Id}
                        <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> vs </span>
                        {m.player2Id ? (players.find(p => p.id === m.player2Id)?.name || m.player2Id) : 'BYE'}
                      </span>
                      <span style={{
                        background: m.status === 'played' ? 'var(--felt-light)' : m.status === 'bye' ? 'var(--surface-2)' : 'var(--gold-light)',
                        color: m.status === 'played' ? 'var(--felt)' : m.status === 'bye' ? 'var(--text-muted)' : 'var(--gold-dark)',
                        borderRadius: '6px',
                        padding: '2px 10px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                      }}>
                        {m.status}
                      </span>
                      {m.status === 'played' && (
                        <button onClick={() => overrideMatchup(m.id, 'status', 'pending')}
                          style={{ ...btnGhost, padding: '3px 10px', fontSize: '0.72rem' }}>
                          Reopen
                        </button>
                      )}
                      <button onClick={() => startEditMatchup(m)} style={{ ...btnGhost, padding: '3px 10px', fontSize: '0.72rem' }}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── PLAYERS TAB ──────────────────────────────────────────────────── */}
        {tab === 'players' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button onClick={handleSeed} disabled={seeded} style={{ ...btnGhost, opacity: seeded ? 0.5 : 1 }}>
                {seeded ? '✓ Seeded' : '🌱 Seed Initial Players'}
              </button>
              <button onClick={exportStandingsCSV} style={btnGhost}>⬇ Export Standings CSV</button>
            </div>

            {/* Add Player Form */}
            <form onSubmit={handleAddPlayer} style={card}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--felt-dark)', marginBottom: '14px', letterSpacing: '0.06em' }}>ADD NEW PLAYER</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={labelSt}>NAME *</label>
                  <input value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                    placeholder="Marcus" required style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>PHONE</label>
                  <input value={newPlayer.phone} onChange={e => setNewPlayer(p => ({ ...p, phone: e.target.value }))}
                    placeholder="314-555-0100" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>PIN (4 digits)</label>
                  <input value={newPlayer.pin} onChange={e => setNewPlayer(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="1234" maxLength={4} style={{ ...inputSt, letterSpacing: '0.2em' }} />
                </div>
                <div>
                  <label style={labelSt}>EMAIL</label>
                  <input type="email" value={newPlayer.email} onChange={e => setNewPlayer(p => ({ ...p, email: e.target.value }))}
                    placeholder="player@email.com" style={inputSt} />
                </div>
              </div>
              <button type="submit" disabled={addingPlayer || !newPlayer.name.trim()}
                style={{ ...btnGreen, opacity: addingPlayer ? 0.5 : 1 }}>
                {addingPlayer ? 'Adding…' : '+ Add Player'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map(p => (
                <div key={p.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  opacity: p.active ? 1 : 0.55,
                }}>
                  <span style={{ flex: 1, fontWeight: '700', color: 'var(--text)', minWidth: '100px' }}>
                    {p.name} {!p.active && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '400' }}>(inactive)</span>}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>avg {p.average?.toFixed(2)} · hcp {p.handicap}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ ...labelSt, marginBottom: 0 }}>PIN:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinEdits[p.id]?.value ?? p.pin ?? ''}
                      onChange={e => setPinEdits(prev => ({ ...prev, [p.id]: { value: e.target.value.replace(/\D/g, '').slice(0, 4), saved: false } }))}
                      style={{ ...inputSt, width: '64px', letterSpacing: '0.15em', padding: '5px 8px', textAlign: 'center' }}
                    />
                    <button
                      onClick={() => savePin(p.id)}
                      disabled={!pinEdits[p.id]?.value || pinEdits[p.id]?.value === String(p.pin)}
                      style={{
                        ...btnGreen,
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        background: pinEdits[p.id]?.saved ? 'var(--felt-mid)' : 'var(--felt)',
                        opacity: (!pinEdits[p.id]?.value || pinEdits[p.id]?.value === String(p.pin)) ? 0.4 : 1,
                      }}
                    >
                      {pinEdits[p.id]?.saved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label style={{ ...labelSt, marginBottom: 0 }}>Email:</label>
                    <input type="email" defaultValue={p.email || ''}
                      onBlur={e => updatePlayerField(p.id, 'email', e.target.value)}
                      placeholder="email@ex.com"
                      style={{ ...inputSt, width: '185px', padding: '5px 8px', fontSize: '0.82rem' }} />
                  </div>
                  <button onClick={() => togglePlayerActive(p.id, p.active)} style={{ ...btnGhost, padding: '4px 12px', fontSize: '0.75rem' }}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RESULTS TAB ──────────────────────────────────────────────────── */}
        {tab === 'results' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <button onClick={exportResultsCSV} style={btnGhost}>⬇ Export Results CSV</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No results yet.</p>}
              {[...results].sort((a, b) => b.week - a.week).map(r => {
                const p1Name = players.find(p => p.id === r.player1Id)?.name || r.player1Id
                const p2Name = players.find(p => p.id === r.player2Id)?.name || r.player2Id
                const isEditing = editingResultId === r.id
                return (
                  <div key={r.id} style={{ ...card, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Week {r.week}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          by: {players.find(p => p.id === r.submittedBy)?.name || r.submittedBy}
                        </span>
                        {!isEditing && (
                          <>
                            <button onClick={() => startEditResult(r)} style={{ ...btnGhost, padding: '2px 10px', fontSize: '0.72rem' }}>Edit</button>
                            <button onClick={() => resetResult(r)} style={{ ...btnGhost, padding: '2px 10px', fontSize: '0.72rem', color: 'var(--ball-red)', borderColor: 'var(--ball-red)' }}>Reset</button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--felt-dark)' }}>{p1Name}</span>
                          <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--felt-dark)' }}>{p2Name}</span>
                        </div>
                        {editGames.map((g, gi) => {
                          const err = g.p1 !== '' && g.p2 !== '' ? getEditGameError(g) : null
                          return (
                            <div key={gi} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '44px' }}>Game {gi + 1}</span>
                              <input type="number" min="0" max="9" value={g.p1}
                                onChange={e => setEditGames(prev => prev.map((x, i) => i === gi ? { ...x, p1: e.target.value } : x))}
                                style={{ ...inputSt, width: '56px', textAlign: 'center', padding: '5px' }} />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>–</span>
                              <input type="number" min="0" max="9" value={g.p2}
                                onChange={e => setEditGames(prev => prev.map((x, i) => i === gi ? { ...x, p2: e.target.value } : x))}
                                style={{ ...inputSt, width: '56px', textAlign: 'center', padding: '5px' }} />
                              {err && <span style={{ fontSize: '0.72rem', color: 'var(--ball-red)' }}>{err}</span>}
                            </div>
                          )
                        })}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button onClick={() => saveResultEdit(r)}
                            disabled={editGames.some(g => getEditGameError(g))}
                            style={{ ...btnGreen, padding: '6px 16px', fontSize: '0.8rem', opacity: editGames.some(g => getEditGameError(g)) ? 0.4 : 1 }}>
                            Save
                          </button>
                          <button onClick={() => setEditingResultId(null)} style={{ ...btnGhost, padding: '6px 12px', fontSize: '0.8rem' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: r.games?.length ? '8px' : 0 }}>
                          <span style={{ fontWeight: '800', color: r.winner === r.player1Id ? 'var(--felt)' : 'var(--text)', fontSize: '1rem' }}>
                            {p1Name}: {r.player1Total}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>vs</span>
                          <span style={{ fontWeight: '800', color: r.winner === r.player2Id ? 'var(--felt)' : 'var(--text)', fontSize: '1rem' }}>
                            {p2Name}: {r.player2Total}
                          </span>
                          {r.winner === 'tie' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIE</span>}
                        </div>
                        {r.games?.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {r.games.map((g, gi) => (
                              <span key={gi} style={{ background: 'var(--surface-2)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                G{gi + 1}: {g.player1Score}–{g.player2Score}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── TOURNAMENT TAB ────────────────────────────────────────────────── */}
        {tab === 'tournament' && <TournamentTab rosterPlayers={players} />}

        {/* ─── ARCHIVES TAB ─────────────────────────────────────────────────── */}
        {tab === 'archives' && (
          <div>
            <div style={card}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '12px' }}>
                Snapshot the current standings as a permanent end-of-round record.
              </p>
              <button onClick={archiveStandings} style={btnGold}>📦 Archive Current Standings</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {archives.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No archives yet.</p>}
              {[...archives].sort((a, b) => (b.archivedAt?.seconds || 0) - (a.archivedAt?.seconds || 0)).map(a => (
                <div key={a.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--felt-dark)', letterSpacing: '0.06em' }}>
                      {a.label || `Round ${a.round}`}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {a.archivedAt?.toDate ? a.archivedAt.toDate().toLocaleDateString() : ''}
                    </span>
                  </div>
                  <ol style={{ paddingLeft: '20px', color: 'var(--text)', fontSize: '0.875rem' }}>
                    {(a.standings || []).slice(0, 11).map(s => (
                      <li key={s.id} style={{ marginBottom: '3px' }}>
                        <span style={{ fontWeight: '700' }}>{s.name}</span>
                        {' — '}
                        <span style={{ color: 'var(--felt)', fontWeight: '700' }}>{s.average?.toFixed(2)}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> ({s.gameRecord?.[0]}-{s.gameRecord?.[1]})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SETUP TAB ────────────────────────────────────────────────────── */}
        {tab === 'setup' && (
          <div>
            <div style={card}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: 'var(--felt-dark)', marginBottom: '8px', letterSpacing: '0.06em' }}>SEED ROUND 1 DATA</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Loads all Round 1 matchups and results from the historical data. Run once after seeding players.
              </p>
              <button onClick={handleSeedSchedule} disabled={scheduledSeeded}
                style={{ ...(scheduledSeeded ? btnGhost : btnGold), opacity: scheduledSeeded ? 0.5 : 1 }}>
                {scheduledSeeded ? '✓ Schedule Seeded' : '📅 Seed Round 1 Schedule'}
              </button>
            </div>

            {/* New Season */}
            <div style={{ ...card, border: '2px solid var(--ball-red)' }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: 'var(--ball-red)', marginBottom: '8px', letterSpacing: '0.06em' }}>🚨 START NEW SEASON</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                Archives current standings, deletes all matchups &amp; results, and resets every player's stats to zero. <strong>Cannot be undone.</strong>
              </p>
              {!newSeasonConfirm ? (
                <button onClick={() => setNewSeasonConfirm(true)}
                  style={{ background: 'var(--ball-red)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif' }}>
                  Start New Season…
                </button>
              ) : (
                <div style={{ background: '#fff5f5', border: '1px solid var(--ball-red)', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ color: 'var(--ball-red)', fontWeight: '800', marginBottom: '12px', fontSize: '0.9rem' }}>
                    Are you sure? This will permanently clear all match data.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setNewSeasonConfirm(false)} style={btnGhost}>Cancel</button>
                    <button onClick={startNewSeason} disabled={newSeasonBusy}
                      style={{ background: 'var(--ball-red)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Nunito, sans-serif', opacity: newSeasonBusy ? 0.6 : 1 }}>
                      {newSeasonBusy ? 'Resetting…' : 'Yes, Reset Everything'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={card}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', color: 'var(--felt-dark)', marginBottom: '8px', letterSpacing: '0.06em' }}>ADMIN EMAIL</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Locked to: <strong style={{ color: 'var(--text)' }}>{ADMIN_EMAILS.join(', ')}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                To change, update ADMIN_EMAILS in src/pages/Admin.jsx and redeploy.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
