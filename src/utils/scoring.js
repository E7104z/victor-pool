// Calculate handicap from average
// Tiers confirmed against Round 1 final standings:
//   >=7.5 → 8, >=6.5 → 7, >=5.5 → 6, else 5
export function calcHandicap(average) {
  if (average >= 7.5) return 8
  if (average >= 6.5) return 7
  if (average >= 5.5) return 6
  return 5
}

// Calculate average from total points and games played
export function calcAverage(totalPoints, gamesPlayed) {
  if (gamesPlayed === 0) return 0
  return totalPoints / gamesPlayed
}

// Validate a single game score entry
// winner always gets 9. loser gets balls pocketed (0-7).
// scratch on 8ball: loser entered 7 balls but scratched = 7-4 = 3
export function calcLoserScore(ballsPocketed, scratchedOn8) {
  if (scratchedOn8) return Math.max(0, ballsPocketed - 4)
  return ballsPocketed
}

// Calculate match result with handicap
// lowerRankedPlayer receives their handicap added to their match total
export function calcMatchResult(games, player1Id, player2Id, lowerRankedId, handicap) {
  let p1Total = 0
  let p2Total = 0

  games.forEach(game => {
    p1Total += game.player1Score
    p2Total += game.player2Score
  })

  // Apply handicap to lower ranked player
  if (lowerRankedId === player1Id) p1Total += handicap
  if (lowerRankedId === player2Id) p2Total += handicap

  const winner = p1Total > p2Total ? player1Id : p2Total > p1Total ? player2Id : 'tie'
  const isTie = winner === 'tie'

  const p1GameWins = games.filter(g => g.player1Score > g.player2Score).length
  const p2GameWins = games.filter(g => g.player2Score > g.player1Score).length

  return {
    player1Total: p1Total,
    player2Total: p2Total,
    winner,
    player1Result: {
      games: games.map(g => ({ playerScore: g.player1Score })),
      gameWins: p1GameWins,
      gameLosses: games.length - p1GameWins,
      matchWin: winner === player1Id,
      matchLoss: winner === player2Id,
      matchTie: isTie,
    },
    player2Result: {
      games: games.map(g => ({ playerScore: g.player2Score })),
      gameWins: p2GameWins,
      gameLosses: games.length - p2GameWins,
      matchWin: winner === player2Id,
      matchLoss: winner === player1Id,
      matchTie: isTie,
    },
  }
}

// Pool tips rotating array
export const POOL_TIPS = [
  "Bridge length matters. Keep your bridge hand 6–8 inches from the cue ball for control.",
  "Follow through past the cue ball. Your cue tip should travel at least 6 inches after contact.",
  "Aim with your dominant eye directly over the cue stick.",
  "Slow down on power shots. More speed means less accuracy on the cut angle.",
  "Always have a plan for your next shot before you take your current one.",
  "Stay down on the shot. Don't lift your head until after the cue ball makes contact.",
  "The ghost ball method: visualize where the cue ball needs to be at the moment of contact.",
  "Practice the stop shot first. It's the foundation of cue ball control.",
  "Chalk up before every single shot. Make it a habit, not an afterthought.",
  "On the 8 ball — breathe out, slow your stroke, treat it like any other shot.",
  "Low center hits on the cue ball create backspin. High center hits create topspin.",
  "Consistent stance wins games. Find yours and never change it mid-session.",
  "When you're running out, think two shots ahead minimum.",
  "Side pocket cuts are harder than they look. Aim for the near edge of the pocket.",
  "If you're unsure which ball to break out, leave it and come back with better position.",
  "A soft touch on safeties is more valuable than a hard break.",
  "The break: aim for the head ball, hit it hard, and stay center on the cue ball.",
  "Don't rush. The table isn't going anywhere. Take your time and read the layout.",
  "Practice straight in shots until they're automatic. They show up every game.",
  "Rail shots: aim for a point slightly behind the object ball to account for the cushion.",
  "When you scratch, own it. Reset mentally before the next game.",
  "Defense wins matches. A good safety is worth more than a risky runout attempt.",
  "Keep your back elbow at 90 degrees on your backswing for a consistent stroke plane.",
  "The 8 ball is just another ball until it isn't. Don't give it more weight than it deserves.",
  "Watch where the cue ball stops, not where the object ball goes.",
  "Consistency over power. Every time.",
  "Play the shot you have, not the shot you wish you had.",
  "Your best weapon at the table is patience.",
  "Every player has a weakness. Yours is the one you haven't practiced yet.",
  "The pocket doesn't move. Your fundamentals shouldn't either.",
]

export function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return POOL_TIPS[dayOfYear % POOL_TIPS.length]
}
