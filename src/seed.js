import { db } from './firebase'
import { doc, writeBatch } from 'firebase/firestore'

// ─── PLAYERS ────────────────────────────────────────────────────────────────

export const PLAYERS = [
  { id: 'johnny',  name: 'Johnny',  phone: '618-791-7242', pin: '1111', email: '', fillIn: false },
  { id: 'derek',   name: 'Derek',   phone: '901-550-6996', pin: '2222', email: '', fillIn: false },
  { id: 'mike',    name: 'Mike',    phone: '636-515-4685', pin: '3333', email: '', fillIn: false },
  { id: 'eddie',   name: 'Eddie',   phone: '504-701-8574', pin: '4444', email: '', fillIn: false },
  { id: 'terence', name: 'Terence', phone: '314-749-7906', pin: '5555', email: '', fillIn: false },
  { id: 'jason',   name: 'Jason',   phone: '314-660-2890', pin: '6666', email: '', fillIn: false },
  { id: 'matt',    name: 'Matt',    phone: '618-910-7979', pin: '7777', email: '', fillIn: false },
  { id: 'joshua',  name: 'Joshua',  phone: '573-200-4741', pin: '8888', email: '', fillIn: false },
  { id: 'kyle',    name: 'Kyle',    phone: '901-697-8473', pin: '9999', email: '', fillIn: false },
  { id: 'lavoris', name: 'Lavoris', phone: '618-791-5258', pin: '0000', email: '', fillIn: false },
  { id: 'xavier',  name: 'Xavier',  phone: '862-216-7853', pin: '1234', email: '', fillIn: false },
  // Fill-in players (active: false — won't appear in schedule generation)
  { id: 'fahad',   name: 'Fahad',   phone: '', pin: 'F000', email: '', fillIn: true },
  { id: 'corey',   name: 'Corey',   phone: '', pin: 'C000', email: '', fillIn: true },
]

// Final Round 1 standings
export const INITIAL_STATS = {
  johnny:  { gamesPlayed: 30, totalPoints: 245, gameRecord: [24, 6],  matchRecord: [7, 2, 1] },
  derek:   { gamesPlayed: 30, totalPoints: 232, gameRecord: [21, 9],  matchRecord: [4, 4, 2] },
  mike:    { gamesPlayed: 24, totalPoints: 183, gameRecord: [16, 8],  matchRecord: [5, 3, 0] },
  eddie:   { gamesPlayed: 24, totalPoints: 180, gameRecord: [15, 9],  matchRecord: [5, 3, 0] },
  terence: { gamesPlayed: 30, totalPoints: 216, gameRecord: [16, 14], matchRecord: [6, 4, 0] },
  jason:   { gamesPlayed: 30, totalPoints: 213, gameRecord: [16, 14], matchRecord: [5, 5, 0] },
  matt:    { gamesPlayed: 30, totalPoints: 198, gameRecord: [13, 17], matchRecord: [4, 6, 0] },
  joshua:  { gamesPlayed: 30, totalPoints: 192, gameRecord: [12, 18], matchRecord: [5, 4, 1] },
  kyle:    { gamesPlayed: 30, totalPoints: 171, gameRecord: [14, 16], matchRecord: [3, 6, 1] },
  lavoris: { gamesPlayed: 30, totalPoints: 158, gameRecord: [8, 22],  matchRecord: [5, 5, 0] },
  xavier:  { gamesPlayed: 30, totalPoints: 142, gameRecord: [7, 23],  matchRecord: [1, 9, 0] },
  fahad:   { gamesPlayed: 15, totalPoints: 95,  gameRecord: [5, 10],  matchRecord: [1, 3, 1] },
  corey:   { gamesPlayed: 3,  totalPoints: 14,  gameRecord: [0, 3],   matchRecord: [0, 1, 0] },
}

// ─── ROUND 1 SCHEDULE ───────────────────────────────────────────────────────
// id, week, p1, p2 (null = BYE), lr (lowerRankedId), hcp, g (games array or null)
// All scores are raw (p1s = player1 score per game, p2s = player2 score per game).
// Handicap is added to lowerRankedId's total during result computation.

const R1 = [
  // ── Week 2 ──────────────────────────────────────────────────────────────
  { id: 'r1w2-terence-bye',    week: 2, p1: 'terence', p2: null,      lr: null,      hcp: 0, g: null },
  { id: 'r1w2-johnny-matt',    week: 2, p1: 'johnny',  p2: 'matt',    lr: null,      hcp: 0, g: [{p1s:4,p2s:9},{p1s:9,p2s:3},{p1s:9,p2s:5}] },
  { id: 'r1w2-xavier-fahad',   week: 2, p1: 'xavier',  p2: 'fahad',   lr: null,      hcp: 0, g: [{p1s:6,p2s:9},{p1s:1,p2s:9},{p1s:9,p2s:7}] },
  { id: 'r1w2-derek-kyle',     week: 2, p1: 'derek',   p2: 'kyle',    lr: null,      hcp: 0, g: [{p1s:9,p2s:3},{p1s:9,p2s:4},{p1s:9,p2s:0}] },
  { id: 'r1w2-eddie-corey',    week: 2, p1: 'eddie',   p2: 'corey',   lr: null,      hcp: 0, g: [{p1s:9,p2s:4},{p1s:9,p2s:4},{p1s:9,p2s:6}] },
  { id: 'r1w2-lavoris-joshua', week: 2, p1: 'lavoris', p2: 'joshua',  lr: null,      hcp: 0, g: [{p1s:9,p2s:1},{p1s:9,p2s:0},{p1s:0,p2s:9}] },
  { id: 'r1w2-jason-mike',     week: 2, p1: 'jason',   p2: 'mike',    lr: null,      hcp: 0, g: [{p1s:9,p2s:5},{p1s:9,p2s:5},{p1s:3,p2s:9}] },

  // ── Week 3 ──────────────────────────────────────────────────────────────
  { id: 'r1w3-johnny-derek',   week: 3, p1: 'johnny',  p2: 'derek',   lr: 'johnny',  hcp: 3, g: [{p1s:9,p2s:6},{p1s:5,p2s:9},{p1s:7,p2s:9}] },
  { id: 'r1w3-kyle-terence',   week: 3, p1: 'kyle',    p2: 'terence', lr: 'kyle',    hcp: 3, g: [{p1s:9,p2s:4},{p1s:6,p2s:9},{p1s:2,p2s:9}] },
  { id: 'r1w3-matt-jason',     week: 3, p1: 'matt',    p2: 'jason',   lr: 'matt',    hcp: 3, g: [{p1s:9,p2s:6},{p1s:7,p2s:9},{p1s:3,p2s:9}] },
  { id: 'r1w3-fahad-eddie',    week: 3, p1: 'fahad',   p2: 'eddie',   lr: 'fahad',   hcp: 3, g: [{p1s:5,p2s:9},{p1s:5,p2s:9},{p1s:7,p2s:9}] },
  { id: 'r1w3-mike-lavoris',   week: 3, p1: 'mike',    p2: 'lavoris', lr: 'lavoris', hcp: 9, g: [{p1s:9,p2s:5},{p1s:9,p2s:6},{p1s:9,p2s:0}] },
  { id: 'r1w3-xavier-joshua',  week: 3, p1: 'xavier',  p2: 'joshua',  lr: 'joshua',  hcp: 3, g: [{p1s:6,p2s:9},{p1s:3,p2s:9},{p1s:9,p2s:3}] },

  // ── Week 4 ──────────────────────────────────────────────────────────────
  { id: 'r1w4-johnny-terence', week: 4, p1: 'johnny',  p2: 'terence', lr: 'terence', hcp: 3, g: [{p1s:9,p2s:3},{p1s:9,p2s:5},{p1s:0,p2s:9}] },
  { id: 'r1w4-derek-jason',    week: 4, p1: 'derek',   p2: 'jason',   lr: 'jason',   hcp: 3, g: [{p1s:9,p2s:4},{p1s:9,p2s:6},{p1s:7,p2s:9}] },
  { id: 'r1w4-eddie-matt',     week: 4, p1: 'eddie',   p2: 'matt',    lr: 'matt',    hcp: 6, g: [{p1s:9,p2s:3},{p1s:6,p2s:9},{p1s:3,p2s:9}] },
  { id: 'r1w4-kyle-mike',      week: 4, p1: 'kyle',    p2: 'mike',    lr: 'kyle',    hcp: 6, g: [{p1s:5,p2s:9},{p1s:0,p2s:9},{p1s:9,p2s:7}] },
  { id: 'r1w4-xavier-lavoris', week: 4, p1: 'xavier',  p2: 'lavoris', lr: 'lavoris', hcp: 3, g: [{p1s:2,p2s:9},{p1s:2,p2s:9},{p1s:9,p2s:3}] },
  { id: 'r1w4-joshua-fahad',   week: 4, p1: 'joshua',  p2: 'fahad',   lr: 'joshua',  hcp: 3, g: [{p1s:7,p2s:9},{p1s:9,p2s:4},{p1s:9,p2s:6}] },

  // ── Week 5 ──────────────────────────────────────────────────────────────
  { id: 'r1w5-derek-eddie',    week: 5, p1: 'derek',   p2: 'eddie',   lr: 'eddie',   hcp: 3, g: [{p1s:9,p2s:5},{p1s:1,p2s:9},{p1s:6,p2s:9}] },
  { id: 'r1w5-johnny-jason',   week: 5, p1: 'johnny',  p2: 'jason',   lr: null,      hcp: 0, g: [{p1s:9,p2s:3},{p1s:9,p2s:5},{p1s:9,p2s:7}] },
  { id: 'r1w5-xavier-kyle',    week: 5, p1: 'xavier',  p2: 'kyle',    lr: null,      hcp: 0, g: [{p1s:3,p2s:9},{p1s:9,p2s:2},{p1s:2,p2s:9}] },
  { id: 'r1w5-fahad-mike',     week: 5, p1: 'fahad',   p2: 'mike',    lr: 'fahad',   hcp: 6, g: [{p1s:2,p2s:9},{p1s:2,p2s:9},{p1s:9,p2s:5}] },
  { id: 'r1w5-terence-joshua', week: 5, p1: 'terence', p2: 'joshua',  lr: 'joshua',  hcp: 3, g: [{p1s:9,p2s:6},{p1s:7,p2s:9},{p1s:3,p2s:9}] },
  { id: 'r1w5-matt-lavoris',   week: 5, p1: 'matt',    p2: 'lavoris', lr: 'lavoris', hcp: 3, g: [{p1s:9,p2s:6},{p1s:9,p2s:6},{p1s:0,p2s:9}] },

  // ── Week 6 ──────────────────────────────────────────────────────────────
  { id: 'r1w6-johnny-mike',     week: 6, p1: 'johnny',  p2: 'mike',    lr: null,      hcp: 0, g: [{p1s:9,p2s:5},{p1s:7,p2s:9},{p1s:6,p2s:9}] },
  { id: 'r1w6-derek-joshua',    week: 6, p1: 'derek',   p2: 'joshua',  lr: 'joshua',  hcp: 6, g: [{p1s:9,p2s:5},{p1s:7,p2s:9},{p1s:9,p2s:5}] },
  { id: 'r1w6-eddie-jason',     week: 6, p1: 'eddie',   p2: 'jason',   lr: null,      hcp: 0, g: [{p1s:9,p2s:7},{p1s:5,p2s:9},{p1s:9,p2s:6}] },
  { id: 'r1w6-xavier-matt',     week: 6, p1: 'xavier',  p2: 'matt',    lr: 'xavier',  hcp: 3, g: [{p1s:4,p2s:9},{p1s:9,p2s:7},{p1s:6,p2s:9}] },
  { id: 'r1w6-kyle-fahad',      week: 6, p1: 'kyle',    p2: 'fahad',   lr: null,      hcp: 0, g: [{p1s:3,p2s:9},{p1s:9,p2s:6},{p1s:9,p2s:6}] },
  { id: 'r1w6-lavoris-terence', week: 6, p1: 'lavoris', p2: 'terence', lr: 'lavoris', hcp: 6, g: [{p1s:6,p2s:9},{p1s:6,p2s:9},{p1s:9,p2s:7}] },

  // ── Week 7 ──────────────────────────────────────────────────────────────
  { id: 'r1w7-mike-bye',       week: 7, p1: 'mike',    p2: null,      lr: null,      hcp: 0, g: null },
  { id: 'r1w7-xavier-jason',   week: 7, p1: 'xavier',  p2: 'jason',   lr: 'xavier',  hcp: 6, g: [{p1s:0,p2s:9},{p1s:5,p2s:9},{p1s:6,p2s:9}] },
  { id: 'r1w7-eddie-lavoris',  week: 7, p1: 'eddie',   p2: 'lavoris', lr: 'lavoris', hcp: 6, g: [{p1s:9,p2s:4},{p1s:9,p2s:1},{p1s:9,p2s:6}] },
  { id: 'r1w7-derek-terence',  week: 7, p1: 'derek',   p2: 'terence', lr: 'terence', hcp: 3, g: [{p1s:9,p2s:7},{p1s:4,p2s:9},{p1s:9,p2s:7}] },
  { id: 'r1w7-matt-kyle',      week: 7, p1: 'matt',    p2: 'kyle',    lr: null,      hcp: 0, g: [{p1s:9,p2s:4},{p1s:6,p2s:9},{p1s:6,p2s:9}] },
  { id: 'r1w7-johnny-joshua',  week: 7, p1: 'johnny',  p2: 'joshua',  lr: 'joshua',  hcp: 6, g: [{p1s:9,p2s:0},{p1s:9,p2s:5},{p1s:9,p2s:5}] },

  // ── Week 8 ──────────────────────────────────────────────────────────────
  { id: 'r1w8-mike-bye',       week: 8, p1: 'mike',    p2: null,      lr: null,      hcp: 0, g: null },
  { id: 'r1w8-derek-matt',     week: 8, p1: 'derek',   p2: 'matt',    lr: 'matt',    hcp: 3, g: [{p1s:9,p2s:7},{p1s:9,p2s:6},{p1s:9,p2s:1}] },
  { id: 'r1w8-johnny-xavier',  week: 8, p1: 'johnny',  p2: 'xavier',  lr: 'xavier',  hcp: 9, g: [{p1s:9,p2s:0},{p1s:9,p2s:5},{p1s:9,p2s:6}] },
  { id: 'r1w8-terence-eddie',  week: 8, p1: 'terence', p2: 'eddie',   lr: 'terence', hcp: 3, g: [{p1s:2,p2s:9},{p1s:9,p2s:3},{p1s:9,p2s:6}] },
  { id: 'r1w8-jason-lavoris',  week: 8, p1: 'jason',   p2: 'lavoris', lr: 'lavoris', hcp: 6, g: [{p1s:9,p2s:6},{p1s:9,p2s:4},{p1s:5,p2s:9}] },
  { id: 'r1w8-kyle-joshua',    week: 8, p1: 'kyle',    p2: 'joshua',  lr: null,      hcp: 0, g: [{p1s:9,p2s:7},{p1s:0,p2s:9},{p1s:9,p2s:7}] },

  // ── Week 9 ──────────────────────────────────────────────────────────────
  { id: 'r1w9-eddie-bye',      week: 9, p1: 'eddie',   p2: null,      lr: null,      hcp: 0, g: null },
  { id: 'r1w9-johnny-kyle',    week: 9, p1: 'johnny',  p2: 'kyle',    lr: 'kyle',    hcp: 6, g: [{p1s:9,p2s:4},{p1s:9,p2s:4},{p1s:9,p2s:0}] },
  { id: 'r1w9-derek-lavoris',  week: 9, p1: 'derek',   p2: 'lavoris', lr: 'lavoris', hcp: 9, g: [{p1s:9,p2s:3},{p1s:3,p2s:9},{p1s:9,p2s:6}] },
  { id: 'r1w9-jason-joshua',   week: 9, p1: 'jason',   p2: 'joshua',  lr: 'joshua',  hcp: 3, g: [{p1s:3,p2s:9},{p1s:7,p2s:9},{p1s:9,p2s:6}] },
  { id: 'r1w9-terence-xavier', week: 9, p1: 'terence', p2: 'xavier',  lr: 'xavier',  hcp: 6, g: [{p1s:9,p2s:0},{p1s:9,p2s:2},{p1s:9,p2s:6}] },
  { id: 'r1w9-mike-matt',      week: 9, p1: 'mike',    p2: 'matt',    lr: 'matt',    hcp: 6, g: [{p1s:9,p2s:7},{p1s:9,p2s:7},{p1s:2,p2s:9}] },
]

// ─── SEED FUNCTIONS ─────────────────────────────────────────────────────────

/** Seed all player documents with Round 1 final stats */
export async function seedDatabase() {
  const batch = writeBatch(db)

  for (const player of PLAYERS) {
    const stats = INITIAL_STATS[player.id]
    const avg = stats.totalPoints / stats.gamesPlayed
    const handicap = avg >= 7.5 ? 8 : avg >= 6.5 ? 7 : avg >= 5.5 ? 6 : 5

    batch.set(doc(db, 'players', player.id), {
      name: player.name,
      phone: player.phone,
      pin: player.pin,
      email: player.email,
      fillIn: player.fillIn || false,
      active: !player.fillIn,
      ...stats,
      average: parseFloat(avg.toFixed(5)),
      handicap,
      createdAt: new Date(),
    })
  }

  await batch.commit()
  console.log('Players seeded.')
}

/** Seed all Round 1 matchups + result docs */
export async function seedSchedule() {
  const batch = writeBatch(db)

  for (const m of R1) {
    const isBye = !m.p2

    let p1Total = 0, p2Total = 0
    if (!isBye && m.g) {
      m.g.forEach(g => { p1Total += g.p1s; p2Total += g.p2s })
      if (m.lr === m.p1) p1Total += m.hcp
      if (m.lr === m.p2) p2Total += m.hcp
    }

    const winner = (!isBye && m.g)
      ? (p1Total > p2Total ? m.p1 : p2Total > p1Total ? m.p2 : 'tie')
      : null

    batch.set(doc(db, 'matchups', m.id), {
      round: 1,
      week: m.week,
      player1Id: m.p1,
      player2Id: m.p2 || null,
      lowerRankedId: m.lr || null,
      handicap: m.hcp,
      status: isBye ? 'bye' : 'played',
    })

    if (!isBye && m.g) {
      batch.set(doc(db, 'results', `result-${m.id}`), {
        matchupId: m.id,
        round: 1,
        week: m.week,
        player1Id: m.p1,
        player2Id: m.p2,
        games: m.g.map(g => ({ player1Score: g.p1s, player2Score: g.p2s })),
        player1Total: p1Total,
        player2Total: p2Total,
        winner,
        handicapApplied: m.hcp,
        lowerRankedId: m.lr || null,
        submittedBy: 'seed',
        submittedAt: new Date(),
        pendingAdminReview: false,
      })
    }
  }

  await batch.commit()
  console.log('Round 1 schedule seeded.')
}
