/**
 * IA Elite – Négamax + Alpha-Bêta avec approfondissement itératif et table de transposition
 * Objectif: jouer de façon quasi-imbattable en détectant victoires/menaces et en recherchant en profondeur.
 */
class AIElite extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);

        // Temps alloué par coup (ms)
    this.TIME_LIMIT_MS = 700;
        // Profondeur max de sécurité; l'approfondissement itératif s'arrêtera avant si le temps est écoulé
        this.MAX_DEPTH = 6;

        // Table de transposition: hash -> { depth, flag, score, move }
        this.tt = new Map();

        // Zobrist hashing pour plateau jusqu'à BOARD_SIZE x BOARD_SIZE et 2 joueurs
        this.zobrist = this.initZobrist();
        this.currentHash = this.computeHash();

        // Historique minimal pour undo rapide
        this.history = [];
    }

    // Entrée principale: choisit le coup à jouer
    getMove() {
        const start = Date.now();

    // 1) Victoire immédiate (scan robuste sur boîte englobante)
    const winNow = this.findImmediateWinFull(this.PLAYERS.AI, 6);
        if (winNow) return winNow;

    // 2) Blocage immédiat (scan robuste)
    const blockNow = this.findImmediateWinFull(this.PLAYERS.HUMAN, 6);
        if (blockNow) return blockNow;

    // 2a) Empêcher l'adversaire de créer, en un seul coup, deux victoires immédiates au tour suivant (double-immédiate imblocable)
    const blockDualImmediate = this.findOpponentCreatesDualImmediate(this.PLAYERS.HUMAN, 6);
    if (blockDualImmediate) return blockDualImmediate;

    // 2bis) Si plusieurs coups ennemis peuvent créer une (semi-)quatre immédiatement, neutraliser globalement
    const neutralize = this.neutralizeMultipleFourThreats(this.PLAYERS.HUMAN, 6);
    if (neutralize) return neutralize;

    // 3) Empêcher l'adversaire de créer une séquence de 4 (open ou fermée d'un côté) au prochain coup
    const blockFourThreat = this.findOpponentCreatesFourThreat(this.PLAYERS.HUMAN, 6);
    if (blockFourThreat) return blockFourThreat;

    // 3bis) Empêcher l'adversaire de créer un "open four" au prochain coup (cas particulier)
    const blockOpenFour = this.findOpponentCreatesOpenFour(this.PLAYERS.HUMAN, 6);
    if (blockOpenFour) return blockOpenFour;

    // 4) Empêcher l'adversaire de créer une double-menace "open three" (imblocable au coup suivant)
    const blockDoubleThree = this.findOpponentCreatesDoubleThree(this.PLAYERS.HUMAN, 6);
    if (blockDoubleThree) return blockDoubleThree;

    // 5) (Offensive) Si possible, créer nous-mêmes une double "open three"
    const createDoubleThree = this.findCreateDoubleThree(this.PLAYERS.AI, 6);
    if (createDoubleThree) return createDoubleThree;

        // 3) Recherche avec approfondissement itératif sous contrainte de temps
        const deadline = start + this.TIME_LIMIT_MS;
        let bestMove = null;
        let bestScore = -Infinity;
        let pvMove = null; // Principal variation move pour l'ordre des coups

        for (let depth = 1; depth <= this.MAX_DEPTH; depth++) {
            const res = this.search(depth, deadline, pvMove);
            if (!res) break; // Temps dépassé
            bestMove = res.move || bestMove;
            bestScore = res.score;
            pvMove = res.move || pvMove;

            // Si déjà une victoire forcée détectée
            if (bestScore > 1e8) break;
        }

        // 4) Fallback: si rien trouvé (rare), jouer un bon coup positionnel
        if (!bestMove) {
            const fallback = this.getPossibleMoves(20);
            bestMove = fallback.length ? this.pickBestHeuristic(fallback) : { x: Math.floor(this.BOARD_SIZE / 2), y: Math.floor(this.BOARD_SIZE / 2) };
        }

        return bestMove;
    }

    // Détecte un coup gagnant immédiat pour `player` en scannant une boîte englobante (plus fiable que la liste tronquée)
    findImmediateWinFull(player, margin = 2) {
        const bounds = this.getBoardBounds(margin); // marge configurable
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const win = this.isWinAt(x, y, player);
                this.board[y][x] = 0;
                if (win) return { x, y };
            }
        }
        return null;
    }

    // Calcule la boîte englobante de toutes les pierres, étendue d'une marge; renvoie null si plateau vide
    getBoardBounds(margin = 0) {
        let minX = this.BOARD_SIZE, minY = this.BOARD_SIZE, maxX = -1, maxY = -1;
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] !== 0) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return null; // plateau vide
        const x0 = Math.max(0, minX - margin);
        const y0 = Math.max(0, minY - margin);
        const x1 = Math.min(this.BOARD_SIZE - 1, maxX + margin);
        const y1 = Math.min(this.BOARD_SIZE - 1, maxY + margin);
        return { x0, y0, x1, y1 };
    }

    // Parcourt les cases vides: si l'adversaire joue là, crée-t-il un "open four" ? Si oui, jouer nous-mêmes ici pour bloquer.
    findOpponentCreatesOpenFour(opponent, margin = 3) {
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                // Simuler l'adversaire
                this.board[y][x] = opponent;
                const isLethal = this.isOpenFourAt(x, y, opponent);
                this.board[y][x] = 0;
                if (isLethal) return { x, y };
            }
        }
        return null;
    }

    // Parcourt les cases vides: si l'adversaire joue là, crée-t-il une séquence de 4 (au moins un bout libre) ? Si oui, bloquer.
    findOpponentCreatesFourThreat(opponent, margin = 4) {
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                // Simuler l'adversaire
                this.board[y][x] = opponent;
                const isThreat = this.isFourThreatAt(x, y, opponent);
                this.board[y][x] = 0;
                if (isThreat) return { x, y };
            }
        }
        return null;
    }

    // Détecte si en (x,y) il existe une séquence de 4 alignés du joueur avec les deux extrémités libres (open four)
    isOpenFourAt(x, y, player) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx, dy] of dirs) {
            let cnt = 1;
            let lx = x, ly = y, rx = x, ry = y;

            // étendre côté +
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; rx = nx; ry = ny; } else break;
            }
            // étendre côté -
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; lx = nx; ly = ny; } else break;
            }

            if (cnt === 4) {
                const beforeX = lx - dx, beforeY = ly - dy;
                const afterX = rx + dx, afterY = ry + dy;
                const beforeEmpty = beforeX >= 0 && beforeX < this.BOARD_SIZE && beforeY >= 0 && beforeY < this.BOARD_SIZE && this.board[beforeY][beforeX] === 0;
                const afterEmpty = afterX >= 0 && afterX < this.BOARD_SIZE && afterY >= 0 && afterY < this.BOARD_SIZE && this.board[afterY][afterX] === 0;
                if (beforeEmpty && afterEmpty) return true;
            }
        }
        return false;
    }

    // Détecte une menace de 4 (open ou fermé d'un côté) en (x,y)
    isFourThreatAt(x, y, player) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx, dy] of dirs) {
            let cnt = 1;
            let lx = x, ly = y, rx = x, ry = y;

            // étendre côté +
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; rx = nx; ry = ny; } else break;
            }
            // étendre côté -
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; lx = nx; ly = ny; } else break;
            }

            if (cnt >= 4 && cnt < 5) {
                const beforeX = lx - dx, beforeY = ly - dy;
                const afterX = rx + dx, afterY = ry + dy;
                const beforeEmpty = beforeX >= 0 && beforeX < this.BOARD_SIZE && beforeY >= 0 && beforeY < this.BOARD_SIZE && this.board[beforeY][beforeX] === 0;
                const afterEmpty = afterX >= 0 && afterX < this.BOARD_SIZE && afterY >= 0 && afterY < this.BOARD_SIZE && this.board[afterY][afterX] === 0;
                if (beforeEmpty || afterEmpty) return true;
            }
        }
        return false;
    }

    // Compte le nombre d'"open three" autour de (x,y) pour `player` via motifs (_XXX_, _XX_X_, _X_XX) après simulation
    countOpenThreesAfterPlacing(x, y, player) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        let total = 0;
        this.board[y][x] = player;
        for (const [dx, dy] of dirs) {
            const pat = this.extractPattern(x, y, dx, dy, player);
            total += this.countOpenThreeInPattern(pat);
        }
        this.board[y][x] = 0;
        return total;
    }

    countOpenThreeInPattern(pattern) {
        // Motifs d'open three (5 et 6 de long)
        const targets5 = ['_XXX_'];
        const targets6 = ['_XX_X_', '_X_XX_'];
        const targets7 = ['__XXX__'];
        let c = 0;
        // Fenêtres de 5
        for (let i = 0; i <= pattern.length - 5; i++) {
            const sub5 = pattern.slice(i, i + 5);
            if (sub5.includes('O') || sub5.includes('W')) continue;
            if (targets5.includes(sub5)) c++;
        }
        // Fenêtres de 6
        for (let i = 0; i <= pattern.length - 6; i++) {
            const sub6 = pattern.slice(i, i + 6);
            if (sub6.includes('O') || sub6.includes('W')) continue;
            if (targets6.includes(sub6)) c++;
        }
        // Fenêtres de 7
        for (let i = 0; i <= pattern.length - 7; i++) {
            const sub7 = pattern.slice(i, i + 7);
            if (sub7.includes('O') || sub7.includes('W')) continue;
            if (targets7.includes(sub7)) c++;
        }
        return c;
    }

    // Parcourt les cases vides: si l'adversaire joue là, crée-t-il une double open-three ? Si oui, bloquer.
    findOpponentCreatesDoubleThree(opponent, margin = 3) {
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                const cnt = this.countOpenThreesAfterPlacing(x, y, opponent);
                if (cnt >= 2) return { x, y };
            }
        }
        return null;
    }

    // Cherche un coup qui crée une double open-three pour l'IA
    findCreateDoubleThree(player, margin = 3) {
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;
        let best = null, bestCnt = 0;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                const cnt = this.countOpenThreesAfterPlacing(x, y, player);
                if (cnt > bestCnt) { bestCnt = cnt; best = { x, y }; }
            }
        }
        return bestCnt >= 2 ? best : null;
    }

    // Recherche négamax avec alpha-bêta et TT
    search(maxDepth, deadline, pvMove) {
        const ai = this.PLAYERS.AI;
        const color = 1; // maximisant pour l'IA
        let bestMove = null;
        let alpha = -Infinity;
        let beta = Infinity;

        // Génération + ordering
        let moves = this.orderedMoves(ai, pvMove);
        if (moves.length === 0) return { move: null, score: 0 };

        let bestScore = -Infinity;
        for (const m of moves) {
            if (Date.now() > deadline) return null;
            this.doMove(m.x, m.y, ai);

            const terminal = this.isWinAt(m.x, m.y, ai);
            let score;
            if (terminal) {
                // Victoire rapide (avantage profondeur)
                score = 1e9 - this.history.length;
            } else {
                score = -this.negamax(maxDepth - 1, -beta, -alpha, this.PLAYERS.HUMAN, -color, deadline);
            }

            this.undoMove();

            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }

            if (score > alpha) alpha = score;
            if (alpha >= beta) break; // Coupure
        }

        return { move: bestMove, score: bestScore };
    }

    negamax(depth, alpha, beta, player, color, deadline) {
        // Arrêt temps
        if (Date.now() > deadline) return 0;

        // Feuille ou profondeur max
        if (depth === 0) return color * this.evaluateState();

        // Probe TT
        const ttKey = this.hashWithTurn(player);
        const ttEntry = this.tt.get(ttKey);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'EXACT') return ttEntry.score;
            if (ttEntry.flag === 'LOWER' && ttEntry.score > alpha) alpha = ttEntry.score;
            else if (ttEntry.flag === 'UPPER' && ttEntry.score < beta) beta = ttEntry.score;
            if (alpha >= beta) return ttEntry.score;
        }

        const opponent = player === this.PLAYERS.AI ? this.PLAYERS.HUMAN : this.PLAYERS.AI;

        // Générer et trier les coups (PV d'abord si présent)
        const pvMove = ttEntry?.move;
        let moves = this.orderedMoves(player, pvMove);
        if (moves.length === 0) return 0;

        let bestScore = -Infinity;
        let bestMove = null;
        let originalAlpha = alpha;

        for (const m of moves) {
            if (Date.now() > deadline) break;
            this.doMove(m.x, m.y, player);

            // Victoire immédiate
            if (this.isWinAt(m.x, m.y, player)) {
                const winScore = color * (1e9 - this.history.length);
                this.undoMove();
                this.storeTT(ttKey, depth, 'EXACT', winScore, m);
                return winScore;
            }

            const score = -this.negamax(depth - 1, -beta, -alpha, opponent, -color, deadline);
            this.undoMove();

            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }
            if (bestScore > alpha) alpha = bestScore;
            if (alpha >= beta) break; // Coupure beta
        }

        // Stocker TT
        let flag = 'EXACT';
        if (bestScore <= originalAlpha) flag = 'UPPER';
        else if (bestScore >= beta) flag = 'LOWER';
        this.storeTT(ttKey, depth, flag, bestScore, bestMove);

        return bestScore;
    }

    // Retourne toutes les cases où l'adversaire, en jouant, crée un open four
    findAllOpponentCreatesOpenFour(opponent, margin = 4) {
        const res = [];
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return res;
        const { x0, y0, x1, y1 } = bounds;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = opponent;
                const ok = this.isOpenFourAt(x, y, opponent);
                this.board[y][x] = 0;
                if (ok) res.push({ x, y });
            }
        }
        return res;
    }

    // Retourne toutes les cases où l'adversaire, en jouant, crée une (semi-)quatre
    findAllOpponentCreatesFourThreat(opponent, margin = 4) {
        const res = [];
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return res;
        const { x0, y0, x1, y1 } = bounds;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = opponent;
                const ok = this.isFourThreatAt(x, y, opponent);
                this.board[y][x] = 0;
                if (ok) res.push({ x, y });
            }
        }
        return res;
    }

    // Si plusieurs menaces de (semi-)quatre existent au prochain coup adverse, choisir un coup qui en minimise le nombre
    neutralizeMultipleFourThreats(opponent, margin = 6) {
        const openFours = this.findAllOpponentCreatesOpenFour(opponent, margin);
        const semiFours = this.findAllOpponentCreatesFourThreat(opponent, margin);
        // Fusionner et dédupliquer
        const key = p => `${p.x},${p.y}`;
        const uniqMap = new Map();
        for (const p of [...openFours, ...semiFours]) uniqMap.set(key(p), p);
        const threats = Array.from(uniqMap.values());
        if (threats.length <= 1) return null;

        // Générer candidats: menaces elles-mêmes + leurs voisins + quelques meilleurs coups génériques
        const candMap = new Map();
        const addCand = (x, y) => {
            if (x < 0 || x >= this.BOARD_SIZE || y < 0 || y >= this.BOARD_SIZE) return;
            if (this.board[y][x] !== 0) return;
            const k = `${x},${y}`;
            if (!candMap.has(k)) candMap.set(k, { x, y });
        };
        for (const t of threats) {
            addCand(t.x, t.y);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    addCand(t.x + dx, t.y + dy);
                }
            }
        }
        // Ajouter une poignée de coups proposés par l'heuristique
        for (const m of this.orderedMoves(this.PLAYERS.AI, null).slice(0, 16)) addCand(m.x, m.y);

        // Évaluer chaque candidat en minimisant d'abord les open-four restants, puis les (semi-)quatre
        let best = null;
        let bestOpen = Infinity;
        let bestSemi = Infinity;
        let bestScore = -Infinity;
        for (const cand of candMap.values()) {
            this.board[cand.y][cand.x] = this.PLAYERS.AI;
            const afterOpen = this.findAllOpponentCreatesOpenFour(opponent, margin).length;
            const afterAllFour = this.findAllOpponentCreatesFourThreat(opponent, margin).length;
            const afterSemi = Math.max(0, afterAllFour - afterOpen);
            this.board[cand.y][cand.x] = 0;
            const s = this.quickScore(cand.x, cand.y, this.PLAYERS.AI);
            if (
                afterOpen < bestOpen ||
                (afterOpen === bestOpen && afterSemi < bestSemi) ||
                (afterOpen === bestOpen && afterSemi === bestSemi && s > bestScore)
            ) {
                bestOpen = afterOpen;
                bestSemi = afterSemi;
                bestScore = s;
                best = cand;
            }
        }
        return best;
    }

    // Énumère toutes les cases gagnantes immédiates pour `player` dans une boîte englobante
    listAllImmediateWins(player, margin = 2) {
        const res = [];
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return res;
        const { x0, y0, x1, y1 } = bounds;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const win = this.isWinAt(x, y, player);
                this.board[y][x] = 0;
                if (win) res.push({ x, y });
            }
        }
        return res;
    }

    // Détecte un coup où l'adversaire, s'il jouait maintenant, créerait deux (ou plus) victoires immédiates au tour suivant
    findOpponentCreatesDualImmediate(opponent, margin = 6) {
        const bounds = this.getBoardBounds(margin);
        if (!bounds) return null;
        const { x0, y0, x1, y1 } = bounds;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (this.board[y][x] !== 0) continue;
                // Simuler l'adversaire
                this.board[y][x] = opponent;
                const wins = this.listAllImmediateWins(opponent, margin);
                this.board[y][x] = 0;
                if (wins.length >= 2) return { x, y };
            }
        }
        return null;
    }

    // Génère les coups et les trie par heuristique (PV et TT en tête)
    orderedMoves(player, pvMove) {
        let moves = this.getPossibleMoves(36);

        // Injecter PV move en tête si encore valide
        if (pvMove && this.isValidMove(pvMove.x, pvMove.y)) {
            moves = [pvMove, ...moves.filter(m => m.x !== pvMove.x || m.y !== pvMove.y)];
        }

        // Tri par score heuristique rapide (attaque + défense)
        const scored = moves.map(m => ({
            ...m,
            s: this.quickScore(m.x, m.y, player)
        }));
    scored.sort((a, b) => b.s - a.s);

        // Limiter pour performance
        return scored.slice(0, 28).map(s => ({ x: s.x, y: s.y }));
    }

    // Heuristique rapide pour l'ordre: évalue attaque et défense locales
    quickScore(x, y, player) {
        let score = 0;
        // Offensive locale
        this.board[y][x] = player;
        score += this.localPatternScore(x, y, player) * 3;
        score += this.evaluatePosition(x, y, player) * 2;
        this.board[y][x] = 0;

    // Défense locale (bloquer menace adverse)
        const opp = player === this.PLAYERS.AI ? this.PLAYERS.HUMAN : this.PLAYERS.AI;
        this.board[y][x] = opp;
    score += this.localPatternScore(x, y, opp) * 3.5;
    score += this.evaluatePosition(x, y, opp) * 2.0;
        this.board[y][x] = 0;

        // Centre (plateau 100x100 typique)
        const cx = this.BOARD_SIZE / 2;
        const cy = this.BOARD_SIZE / 2;
        const centerDist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        score += Math.max(0, 20 - centerDist);
        return score;
    }

    // Score de motif simple autour de (x,y)
    localPatternScore(x, y, player) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        let s = 0;
        for (const [dx, dy] of dirs) {
            const pattern = this.extractPattern(x, y, dx, dy, player);
            s += this.scorePattern(pattern);
        }
        return s;
    }

    // Extraction d'une fenêtre de 9 autour d'une ligne passant par (x,y)
    extractPattern(x, y, dx, dy, player) {
        let out = '';
        for (let i = -4; i <= 4; i++) {
            const nx = x + i * dx, ny = y + i * dy;
            if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) out += 'W';
            else if (this.board[ny][nx] === player) out += 'X';
            else if (this.board[ny][nx] === 0) out += '_';
            else out += 'O';
        }
        return out;
    }

    // Barème de motifs (Gomoku-like)
    scorePattern(p) {
        if (p.includes('XXXXX')) return 1000000;
        if (p.includes('_XXXX_')) return 100000;
        if (p.includes('XXXX_') || p.includes('_XXXX')) return 60000;
        if (p.includes('_XXX_')) return 15000;
        if (p.includes('X_XX') || p.includes('XX_X')) return 8000;
        if (p.includes('_XX_X_') || p.includes('_X_XX_')) return 7000;
        if (p.includes('__XXX') || p.includes('XXX__')) return 5000;
        if (p.includes('_XX__') || p.includes('__XX_')) return 1200;
        if (p.includes('X_X_X')) return 4000; // split three
        return 0;
    }

    // Évaluation de l'état (rapide mais expressive): différence d'opportunités locales
    evaluateState() {
    const moves = this.getPossibleMoves(24);
        if (moves.length === 0) return 0;
        let score = 0;
        for (const m of moves) {
            // IA
            this.board[m.y][m.x] = this.PLAYERS.AI;
            const sAI = this.localPatternScore(m.x, m.y, this.PLAYERS.AI) * 3 + this.evaluatePosition(m.x, m.y, this.PLAYERS.AI) * 2;
            this.board[m.y][m.x] = 0;

            // HUMAIN
            this.board[m.y][m.x] = this.PLAYERS.HUMAN;
            const sH = this.localPatternScore(m.x, m.y, this.PLAYERS.HUMAN) * 3 + this.evaluatePosition(m.x, m.y, this.PLAYERS.HUMAN) * 2;
            this.board[m.y][m.x] = 0;

            score += (sAI - sH);
        }
        return score / moves.length;
    }

    // Détection victoire rapide pour un coup joué
    isWinAt(x, y, player) {
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx, dy] of dirs) {
            let count = 1;
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) count++; else break;
            }
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy;
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) count++; else break;
            }
            if (count >= this.WIN_LENGTH) return true;
        }
        return false;
    }

    // Heuristique de secours: choisir le meilleur selon quickScore pour l'IA
    pickBestHeuristic(moves) {
        let best = moves[0];
        let bestS = -Infinity;
        for (const m of moves) {
            const s = this.quickScore(m.x, m.y, this.PLAYERS.AI);
            if (s > bestS) { bestS = s; best = m; }
        }
        return best;
    }

    // Moteur de jeu interne (do/undo) + Zobrist
    doMove(x, y, player) {
        this.board[y][x] = player;
        const pIdx = player === this.PLAYERS.AI ? 1 : 0;
        this.currentHash ^= this.zobrist[pIdx][y][x];
        this.history.push({ x, y, player });
    }

    undoMove() {
        const last = this.history.pop();
        if (!last) return;
        const { x, y, player } = last;
        const pIdx = player === this.PLAYERS.AI ? 1 : 0;
        this.currentHash ^= this.zobrist[pIdx][y][x];
        this.board[y][x] = 0;
    }

    initZobrist() {
        const rand32 = () => Math.floor(Math.random() * 0xFFFFFFFF);
        const table = [[], []]; // [playerIndex][y][x]
        for (let p = 0; p < 2; p++) {
            table[p] = new Array(this.BOARD_SIZE).fill(null).map(() => new Array(this.BOARD_SIZE).fill(0));
            for (let y = 0; y < this.BOARD_SIZE; y++) {
                for (let x = 0; x < this.BOARD_SIZE; x++) {
                    table[p][y][x] = rand32();
                }
            }
        }
        return table;
    }

    computeHash() {
        let h = 0;
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                const cell = this.board[y][x];
                if (cell === 0) continue;
                const pIdx = cell === this.PLAYERS.AI ? 1 : 0;
                h ^= this.zobrist[pIdx][y][x];
            }
        }
        return h;
    }

    hashWithTurn(player) {
        // Inclure le joueur au trait dans la clé TT
        return this.currentHash ^ (player === this.PLAYERS.AI ? 0x9e3779b9 : 0x7f4a7c15);
    }

    storeTT(key, depth, flag, score, move) {
        this.tt.set(key, { depth, flag, score, move });
    }
}