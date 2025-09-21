// Simple shared experience store using localStorage
// Tracks coarse biases to nudge AI ordering over time based on wins/losses in training mode.

const EXPERIENCE_STORAGE_KEY = 'sm_experience_v1';

class ExperienceStore {
    constructor() {
        this.data = {
            centerBuckets: Array(51).fill(0), // Chebyshev distance 0..50
            proximityBuckets: Array(11).fill(0), // nearest-own distance 0..10+
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0
        };
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(EXPERIENCE_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.centerBuckets && parsed.proximityBuckets) {
                    this.data = parsed;
                }
            }
        } catch (_) {}
    }

    save() {
        try {
            localStorage.setItem(EXPERIENCE_STORAGE_KEY, JSON.stringify(this.data));
        } catch (_) {}
    }

    // Compute bias for a move (x,y) for `player` on given board
    biasForMove(board, x, y, player, boardSize) {
        const cx = boardSize / 2;
        const cy = boardSize / 2;
        const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        const dBucket = Math.max(0, Math.min(50, Math.floor(dist)));

        // nearest own distance
        let nearest = 99;
        for (let yy = 0; yy < boardSize; yy++) {
            for (let xx = 0; xx < boardSize; xx++) {
                if (board[yy][xx] === player) {
                    const d = Math.max(Math.abs(xx - x), Math.abs(yy - y));
                    if (d < nearest) nearest = d;
                }
            }
        }
        const pBucket = Math.max(0, Math.min(10, nearest === 99 ? 10 : nearest));

        const bCenter = this.data.centerBuckets[dBucket] || 0;
        const bProx = this.data.proximityBuckets[pBucket] || 0;

        return bCenter * 0.5 + bProx * 0.7; // weights tuned lightly
    }

    // Update experience given a game history and result
    // history: array of {x,y,player}; winner: player id or null
    updateFromGame(history, winner, boardSize) {
        this.data.totalGames++;
        if (winner) {
            if (winner === 2) this.data.totalWins++; else this.data.totalLosses++;
        }
        // Reward winning player's moves, penalize losing player's moves (small increments)
        const reward = +1.0;
        const penalty = -0.7;
        for (const m of history) {
            const isWinner = winner && m.player === winner;
            const delta = isWinner ? reward : (winner ? penalty : 0);
            const cx = boardSize / 2; const cy = boardSize / 2;
            const dist = Math.max(Math.abs(m.x - cx), Math.abs(m.y - cy));
            const dBucket = Math.max(0, Math.min(50, Math.floor(dist)));
            // nearest own distance at time of move is hard to recompute; approximate with 1 (favor connected play)
            const pBucket = 1;
            this.data.centerBuckets[dBucket] = (this.data.centerBuckets[dBucket] || 0) + delta;
            this.data.proximityBuckets[pBucket] = (this.data.proximityBuckets[pBucket] || 0) + delta;
        }
        this.save();
    }
}

// Singleton
window.SuperMorpionExperience = new ExperienceStore();
