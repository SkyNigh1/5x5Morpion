/**
    Gagner immédiatement.
    Bloquer la victoire 1-coup adverse.
    Double-menace forcée:
    Bloque si l’adversaire peut, en un coup, créer 2 victoires immédiates au tour suivant.
    Bloque si l’adversaire peut, en un coup, créer au moins 2 menaces de quatre (semi-open-four) sur des directions différentes.
    Si humain a un open-four: tenter de gagner; sinon créer notre open-four ou une double-immédiate; sinon maximiser OOO.
    Si IA a un open-three et que l’humain n’a pas de 1-coup pour gagner: étendre pour créer un open-four.
    Menaces combinées (intersections): empêcher les coups adverses qui créent des intersections entre plusieurs lignes de 3+ (même non immédiates).
    Si humain a open-three: bloquer un bout, sauf si IA gagne ou crée open-four.
    Bloquer les 4 avec un seul bout libre.
    Motifs “XX_X” ou “XX_X”: jouer la case manquante (XXOX / XXOX).
    Prévenir la création en un coup d’une double open-three.
    Contrôle des intersections critiques lors de notre choix: parmi nos candidats, choisir celui qui minimise le potentiel d’intersections 3+ de l’adversaire après notre coup (avec tie-break sur nos OOO).
    Sinon, maximiser “OOO”.
 */
class AILegendary extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);
    }

    getMove() {
        const AI = this.PLAYERS.AI;
        const H = this.PLAYERS.HUMAN;

        // 1) Gagner immédiatement
        const winNow = this.findImmediateWinFull(AI, 4);
        if (winNow) return winNow;

        // 2) Bloquer victoire immédiate humaine
        const blockNow = this.findImmediateWinFull(H, 4);
        if (blockNow) return blockNow;

        // 3) Double-menace forcée : si l'humain, en un coup, peut créer 2 menaces de victoire simultanées
        const blockDualImmediate = this.blockOpponentCreatesDualImmediate(H, 5);
        if (blockDualImmediate) return blockDualImmediate;
        const blockDualFour = this.findOpponentCreatesDualFourThreat(H, 5);
        if (blockDualFour) return blockDualFour;

        // 3) Humain a open-four ?
        const humanOpenFour = this.findAnyOpenFour(H, 5);
        if (humanOpenFour) {
            // Essayer de gagner maintenant (déjà testé), sinon créer une victoire forcée
            const createOurOpenFour = this.findCreateOpenFour(AI, 5);
            if (createOurOpenFour) return createOurOpenFour;
            const createDualImmediate = this.findCreateDualImmediate(AI, 5);
            if (createDualImmediate) return createDualImmediate;
            // Sinon, maximiser OOO
            return this.findMaximizeOOO(AI);
        }

        // 4) IA a open-three (XXX avec deux bouts libres) ET humain n'a pas de win 1-coup
        const humanWinSquares = this.listAllImmediateWins(H, 4);
        if (humanWinSquares.length === 0) {
            const extendToOpenFour = this.extendFromOpenThreeToOpenFour(AI, 5);
            if (extendToOpenFour) return extendToOpenFour;
        }

        // 6) Menaces combinées (intersections de 3+ multiples) à prévenir
        const blockCombined = this.blockCombinedThreats(H, 5);
        if (blockCombined) return blockCombined;

        // 5) Humain a open-three: bloquer un bout sauf si IA peut gagner ou créer open-four
        const createOurOpenFour2 = this.findCreateOpenFour(AI, 5);
        const humanOpenThreeBlock = this.blockHumanOpenThreeOrPreferWin(H, createOurOpenFour2);
        if (humanOpenThreeBlock) return humanOpenThreeBlock;

        // 6) Humain a quatre avec un seul bout libre -> bloquer (sauf gain immédiat déjà couvert)
        const blockSemiFour = this.blockHumanSemiFour(H, 5);
        if (blockSemiFour) return blockSemiFour;

        // 7) Motif humain XX_X (et variante _XX_X_) -> jouer au centre pour XXOX / _XXOX_
        const playPatternGap = this.playOnPatternXX_X(H) || this.playOnPatternGap(H, '_XX_X_');
        if (playPatternGap) return playPatternGap;

        // 8) Empêcher création double open-three en un coup
        const blockDoubleThree = this.blockHumanCreatesDoubleThree(H, 5);
        if (blockDoubleThree) return blockDoubleThree;

        // 11) Contrôle intersections critiques: choisir un coup qui minimise la capacité adverse à créer intersections de 3+
        const safeIntersection = this.minimizeCriticalIntersections(AI, H, 5);
        if (safeIntersection) return safeIntersection;

        // 12) Sinon: maximiser _OOO_
        return this.findMaximizeOOO(AI);
    }

    // ==== Utils communs ====
    getDirs() { return [[1,0],[0,1],[1,1],[1,-1]]; }

    getBoardBounds(margin = 0) {
        let minX = this.BOARD_SIZE, minY = this.BOARD_SIZE, maxX = -1, maxY = -1;
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] !== 0) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return null;
        return {
            x0: Math.max(0, minX - margin), y0: Math.max(0, minY - margin),
            x1: Math.min(this.BOARD_SIZE - 1, maxX + margin), y1: Math.min(this.BOARD_SIZE - 1, maxY + margin)
        };
    }

    isWinAt(x, y, player) {
        for (const [dx, dy] of this.getDirs()) {
            let count = 1;
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) count++; else break;
            }
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) count++; else break;
            }
            if (count >= this.WIN_LENGTH) return true;
        }
        return false;
    }

    findImmediateWinFull(player, margin = 3) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const w = this.isWinAt(x, y, player);
                this.board[y][x] = 0;
                if (w) return { x, y };
            }
        }
        return null;
    }

    listAllImmediateWins(player, margin = 3) {
        const res = [];
        const b = this.getBoardBounds(margin);
        if (!b) return res;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const w = this.isWinAt(x, y, player);
                this.board[y][x] = 0;
                if (w) res.push({ x, y });
            }
        }
        return res;
    }

    isOpenFourAt(x, y, player) {
        for (const [dx, dy] of this.getDirs()) {
            let cnt = 1; let lx = x, ly = y, rx = x, ry = y;
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; rx = nx; ry = ny; } else break;
            }
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; lx = nx; ly = ny; } else break;
            }
            if (cnt === 4) {
                const bx = lx - dx, by = ly - dy; const ax = rx + dx, ay = ry + dy;
                const bEmpty = bx>=0&&by>=0&&bx<this.BOARD_SIZE&&by<this.BOARD_SIZE && this.board[by][bx]===0;
                const aEmpty = ax>=0&&ay>=0&&ax<this.BOARD_SIZE&&ay<this.BOARD_SIZE && this.board[ay][ax]===0;
                if (bEmpty && aEmpty) return true;
            }
        }
        return false;
    }

    // Menace de quatre (semi-open-four) détectée en (x,y) pour player
    isFourThreatAt(x, y, player) {
        for (const [dx, dy] of this.getDirs()) {
            let cnt = 1; let lx = x, ly = y, rx = x, ry = y;
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; rx = nx; ry = ny; } else break;
            }
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { cnt++; lx = nx; ly = ny; } else break;
            }
            if (cnt >= 4 && cnt < 5) {
                const bx = lx - dx, by = ly - dy; const ax = rx + dx, ay = ry + dy;
                const bEmpty = bx>=0&&by>=0&&bx<this.BOARD_SIZE&&by<this.BOARD_SIZE && this.board[by][bx]===0;
                const aEmpty = ax>=0&&ay>=0&&ax<this.BOARD_SIZE&&ay<this.BOARD_SIZE && this.board[ay][ax]===0;
                if (bEmpty || aEmpty) return true;
            }
        }
        return false;
    }

    // Toute case qui, jouée par `player`, crée un open four
    findCreateOpenFour(player, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const ok = this.isOpenFourAt(x, y, player);
                this.board[y][x] = 0;
                if (ok) return { x, y };
            }
        }
        return null;
    }

    // Existe-t-il déjà un open four pour `player` après un coup joué
    findAnyOpenFour(player, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== player) continue;
                if (this.isOpenFourAt(x, y, player)) return { x, y };
            }
        }
        return null;
    }

    // Étend un open-three IA (XXX avec deux bouts libres) vers un open-four si possible
    extendFromOpenThreeToOpenFour(player, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== player) continue;
                for (const [dx, dy] of this.getDirs()) {
                    // Cherche une séquence continue de 3 centrée autour x,y
                    let left = 0, right = 0;
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x - i*dx, ny = y - i*dy;
                        if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === player) left++; else break;
                    }
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x + i*dx, ny = y + i*dy;
                        if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === player) right++; else break;
                    }
                    const cnt = left + 1 + right;
                    if (cnt === 3) {
                        const lx = x - left*dx, ly = y - left*dy;
                        const rx = x + right*dx, ry = y + right*dy;
                        const beforeX = lx - dx, beforeY = ly - dy;
                        const afterX = rx + dx, afterY = ry + dy;
                        const beforeEmpty = beforeX>=0&&beforeY>=0&&beforeX<this.BOARD_SIZE&&beforeY<this.BOARD_SIZE && this.board[beforeY][beforeX]===0;
                        const afterEmpty = afterX>=0&&afterY>=0&&afterX<this.BOARD_SIZE&&afterY<this.BOARD_SIZE && this.board[afterY][afterX]===0;
                        if (beforeEmpty && afterEmpty) {
                            // Essayer de jouer sur l'un des deux bouts pour obtenir open four
                            // Essai 1: jouer avant
                            if (this.board[ly - dy]?.[lx - dx] === 0) {
                                const mx = beforeX, my = beforeY;
                                this.board[my][mx] = player;
                                const ok = this.isOpenFourAt(mx, my, player);
                                this.board[my][mx] = 0;
                                if (ok) return { x: mx, y: my };
                            }
                            // Essai 2: jouer après
                            if (this.board[ry + dy]?.[rx + dx] === 0) {
                                const mx = afterX, my = afterY;
                                this.board[my][mx] = player;
                                const ok = this.isOpenFourAt(mx, my, player);
                                this.board[my][mx] = 0;
                                if (ok) return { x: mx, y: my };
                            }
                            // Sinon, étendre à 4 côté quelconque
                            if (beforeEmpty) return { x: beforeX, y: beforeY };
                            if (afterEmpty) return { x: afterX, y: afterY };
                        }
                    }
                }
            }
        }
        return null;
    }

    // Humain a open-three -> bloquer un bout, sauf si on peut créer open-four maintenant
    blockHumanOpenThreeOrPreferWin(H, createOurOpenFourMove) {
        const moveWin = this.findImmediateWinFull(this.PLAYERS.AI, 4);
        if (moveWin) return moveWin;
        if (createOurOpenFourMove) return createOurOpenFourMove;

        const b = this.getBoardBounds(4);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== H) continue;
                for (const [dx, dy] of this.getDirs()) {
                    let left = 0, right = 0;
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === H) left++; else break;
                    }
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === H) right++; else break;
                    }
                    const cnt = left + 1 + right;
                    if (cnt === 3) {
                        const lx = x - left*dx, ly = y - left*dy;
                        const rx = x + right*dx, ry = y + right*dy;
                        const beforeX = lx - dx, beforeY = ly - dy;
                        const afterX = rx + dx, afterY = ry + dy;
                        const beforeEmpty = beforeX>=0&&beforeY>=0&&beforeX<this.BOARD_SIZE&&beforeY<this.BOARD_SIZE && this.board[beforeY][beforeX]===0;
                        const afterEmpty = afterX>=0&&afterY>=0&&afterX<this.BOARD_SIZE&&afterY<this.BOARD_SIZE && this.board[afterY][afterX]===0;
                        if (beforeEmpty && afterEmpty) {
                            // Bloquer un des deux bouts
                            return { x: beforeX, y: beforeY };
                        }
                    }
                }
            }
        }
        return null;
    }

    // Bloque un 4 humain avec un seul bout libre
    blockHumanSemiFour(H, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== H) continue;
                for (const [dx, dy] of this.getDirs()) {
                    let cnt = 1; let lx = x, ly = y, rx = x, ry = y;
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === H) { cnt++; rx = nx; ry = ny; } else break;
                    }
                    for (let i = 1; i < this.WIN_LENGTH; i++) {
                        const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                        if (this.board[ny][nx] === H) { cnt++; lx = nx; ly = ny; } else break;
                    }
                    if (cnt === 4) {
                        const bx = lx - dx, by = ly - dy; const ax = rx + dx, ay = ry + dy;
                        const bEmpty = bx>=0&&by>=0&&bx<this.BOARD_SIZE&&by<this.BOARD_SIZE && this.board[by][bx]===0;
                        const aEmpty = ax>=0&&ay>=0&&ax<this.BOARD_SIZE&&ay<this.BOARD_SIZE && this.board[ay][ax]===0;
                        if (bEmpty !== aEmpty) {
                            // Un seul côté vide -> bloquer celui-ci
                            if (bEmpty) return { x: bx, y: by };
                            if (aEmpty) return { x: ax, y: ay };
                        }
                    }
                }
            }
        }
        return null;
    }

    // Motif _XX_X_ pour HUMAIN -> jouer au centre
    playOnPatternGap(H, pattern = '_XX_X_') {
        const b = this.getBoardBounds(4);
        if (!b) return null;
        const dirs = this.getDirs();
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                for (const [dx, dy] of dirs) {
                    // Fenêtre de 5 centrée sur (x,y)
                    const win = [];
                    for (let i = -2; i <= 2; i++) {
                        const nx = x + i*dx, ny = y + i*dy;
                        if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) { win.push('W'); continue; }
                        const cell = this.board[ny][nx];
                        win.push(cell === 0 ? '_' : (cell === H ? 'X' : 'O'));
                    }
                    const s = win.join('');
                    if (s === pattern && this.board[y][x] === 0) {
                        // centre de la fenêtre est (x,y)
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }

    // Motif "XX_X" (sans underscore aux extrémités) -> jouer la case manquante pour faire "XXOX"
    playOnPatternXX_X(H) {
        const b = this.getBoardBounds(4);
        if (!b) return null;
        const dirs = this.getDirs();
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                for (const [dx, dy] of dirs) {
                    // Fenêtres de 4 et 5 pour capturer XX_X en différents contextes
                    // Fenêtre 4 strictement XX_X
                    let s4 = '';
                    const pos4 = [];
                    for (let i = 0; i < 4; i++) {
                        const nx = x + i*dx, ny = y + i*dy;
                        if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) { s4 += 'W'; pos4.push({nx,ny}); continue; }
                        const cell = this.board[ny][nx];
                        s4 += cell === 0 ? '_' : (cell === H ? 'X' : 'O');
                        pos4.push({ x: nx, y: ny });
                    }
                    if (s4 === 'XX_X') {
                        // Gap index 2 (0-based) -> position pos4[2]
                        const gap = pos4[2];
                        if (gap && gap.x !== undefined && this.board[gap.y][gap.x] === 0) return { x: gap.x, y: gap.y };
                    }
                    // Fenêtre 5: _XX_X ou XX_X_
                    let s5 = '';
                    const pos5 = [];
                    for (let i = 0; i < 5; i++) {
                        const nx = x + i*dx, ny = y + i*dy;
                        if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) { s5 += 'W'; pos5.push({nx,ny}); continue; }
                        const cell = this.board[ny][nx];
                        s5 += cell === 0 ? '_' : (cell === H ? 'X' : 'O');
                        pos5.push({ x: nx, y: ny });
                    }
                    if (s5 === '_XX_X' || s5 === 'XX_X_') {
                        const gapIdx = s5.indexOf('_X'); // locate the single gap at index 2 typically
                        const gapIndex = 2; // In both patterns, the middle (index 2) is the gap
                        const gap = pos5[gapIndex];
                        if (gap && gap.x !== undefined && this.board[gap.y][gap.x] === 0) return { x: gap.x, y: gap.y };
                    }
                }
            }
        }
        return null;
    }

    // Empêche la création d'une double-open-three humaine en un coup
    blockHumanCreatesDoubleThree(H, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        let best = null; let bestVal = -Infinity;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                // Si HUMAIN joue ici, combien d'open-three crée-t-il ?
                this.board[y][x] = H;
                const cnt = this.countOpenThreeAt(x, y, H);
                this.board[y][x] = 0;
                if (cnt >= 2) {
                    // Bloquer ici; si plusieurs, choisir celui qui maximise nos OOO en même temps
                    const ourOOO = this.countOpenThreeIfAIPlays(x, y);
                    const val = ourOOO;
                    if (val > bestVal) { bestVal = val; best = { x, y }; }
                }
            }
        }
        return best;
    }

    findCreateDualImmediate(player, margin = 4) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = player;
                const wins = this.listAllImmediateWins(player, margin);
                this.board[y][x] = 0;
                if (wins.length >= 2) return { x, y };
            }
        }
        return null;
    }

    // Calcule le nombre d'open-three autour d'un (x,y) pour player
    countOpenThreeAt(x, y, player) {
        let c = 0;
        for (const [dx, dy] of this.getDirs()) {
            const p = this.extractPattern(x, y, dx, dy, player);
            c += this.countOpenThreeInPattern(p);
        }
        return c;
    }

    countOpenThreeIfAIPlays(x, y) {
        this.board[y][x] = this.PLAYERS.AI;
        let c = 0;
        for (const [dx, dy] of this.getDirs()) {
            const p = this.extractPattern(x, y, dx, dy, this.PLAYERS.AI);
            c += this.countOpenThreeInPattern(p, 'O');
        }
        this.board[y][x] = 0;
        return c;
    }

    // Nombre de directions produisant un open-three centré sur (x,y)
    countOpenThreeDirectionsAt(x, y, player) {
        let dirsCount = 0;
        for (const [dx, dy] of this.getDirs()) {
            const p = this.extractPattern(x, y, dx, dy, player);
            if (this.countOpenThreeInPattern(p) > 0) dirsCount++;
        }
        return dirsCount;
    }

    // Nombre de directions produisant une menace de quatre depuis (x,y)
    countFourThreatDirectionsAt(x, y, player) {
        let cnt = 0;
        for (const [dx, dy] of this.getDirs()) {
            // Vérifie la menace sur cette direction
            let c = 1; let lx = x, ly = y, rx = x, ry = y;
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i*dx, ny = y + i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { c++; rx = nx; ry = ny; } else break;
            }
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i*dx, ny = y - i*dy; if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) break;
                if (this.board[ny][nx] === player) { c++; lx = nx; ly = ny; } else break;
            }
            if (c >= 4 && c < 5) {
                const bx = lx - dx, by = ly - dy; const ax = rx + dx, ay = ry + dy;
                const bEmpty = bx>=0&&by>=0&&bx<this.BOARD_SIZE&&by<this.BOARD_SIZE && this.board[by][bx]===0;
                const aEmpty = ax>=0&&ay>=0&&ax<this.BOARD_SIZE&&ay<this.BOARD_SIZE && this.board[ay][ax]===0;
                if (bEmpty || aEmpty) cnt++;
            }
        }
        return cnt;
    }

    // Score combiné d'une menace créée en jouant (x,y) pour `player`
    combinedThreatScoreAt(x, y, player) {
        // Supposons que la pierre soit déjà posée
        const d3 = this.countOpenThreeDirectionsAt(x, y, player);
        const f4 = this.countFourThreatDirectionsAt(x, y, player);
        return d3 + 2 * f4;
    }

    // 3a) Bloquer si l'humain peut créer 2 victoires immédiates au prochain tour
    blockOpponentCreatesDualImmediate(H, margin = 5) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = H;
                const wins = this.listAllImmediateWins(H, margin);
                this.board[y][x] = 0;
                if (wins.length >= 2) return { x, y };
            }
        }
        return null;
    }

    // 3b) Bloquer si l'humain peut créer 2 menaces de quatre (même non-immédiates) avec un seul coup
    findOpponentCreatesDualFourThreat(H, margin = 5) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = H;
                const dirs4 = this.countFourThreatDirectionsAt(x, y, H);
                this.board[y][x] = 0;
                if (dirs4 >= 2) return { x, y };
            }
        }
        return null;
    }

    // 6) Menaces combinées: bloquer le coup humain qui créerait intersections 3+ (>=2 directions)
    blockCombinedThreats(H, margin = 5) {
        const b = this.getBoardBounds(margin);
        if (!b) return null;
        let best = null; let bestScore = 2; // seuil minimal: au moins 2 directions de 3+
        for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.board[y][x] !== 0) continue;
                this.board[y][x] = H;
                const score = this.combinedThreatScoreAt(x, y, H);
                this.board[y][x] = 0;
                if (score > bestScore) { bestScore = score; best = { x, y }; }
            }
        }
        return best;
    }

    // 11) Choisir un coup IA qui minimise le potentiel d'intersections 3+ de l'adversaire après notre coup
    minimizeCriticalIntersections(AI, H, margin = 5) {
        const candidates = this.getPossibleMoves(30);
        if (candidates.length === 0) return null;
        const b = this.getBoardBounds(margin) || { x0: 0, y0: 0, x1: this.BOARD_SIZE-1, y1: this.BOARD_SIZE-1 };
        let best = null; let bestWorst = Infinity; let bestOOO = -Infinity;
        for (const m of candidates) {
            if (this.board[m.y][m.x] !== 0) continue;
            this.board[m.y][m.x] = AI;
            let worst = 0;
            for (let y = b.y0; y <= b.y1; y++) {
                for (let x = b.x0; x <= b.x1; x++) {
                    if (this.board[y][x] !== 0) continue;
                    this.board[y][x] = H;
                    const sc = this.combinedThreatScoreAt(x, y, H);
                    this.board[y][x] = 0;
                    if (sc > worst) worst = sc;
                    if (worst >= 4) break; // seuil de coupure
                }
                if (worst >= 4) break;
            }
            // tie-break: maximiser nos OOO en plus
            const ourOOO = this.countOpenThreeIfAIPlays(m.x, m.y);
            this.board[m.y][m.x] = 0;
            if (worst < bestWorst || (worst === bestWorst && ourOOO > bestOOO)) {
                bestWorst = worst; bestOOO = ourOOO; best = { x: m.x, y: m.y };
            }
        }
        return best;
    }

    // Extrait une fenêtre de 9 autour d'une direction
    extractPattern(x, y, dx, dy, player) {
        let out = '';
        for (let i = -4; i <= 4; i++) {
            const nx = x + i*dx, ny = y + i*dy;
            if (nx<0||ny<0||nx>=this.BOARD_SIZE||ny>=this.BOARD_SIZE) out += 'W';
            else if (this.board[ny][nx] === player) out += 'X';
            else if (this.board[ny][nx] === 0) out += '_';
            else out += 'O';
        }
        return out;
    }

    countOpenThreeInPattern(pattern) {
        // Motifs: _XXX_ ainsi que variantes 6-longueurs _XX_X_ et _X_XX_
        const targets5 = ['_XXX_'];
        const targets6 = ['_XX_X_', '_X_XX_'];
        const targets7 = ['__XXX__'];
        let c = 0;
        for (let i = 0; i <= pattern.length - 5; i++) {
            const sub5 = pattern.slice(i, i+5);
            if (sub5.includes('O') || sub5.includes('W')) continue;
            if (targets5.includes(sub5)) c++;
        }
        for (let i = 0; i <= pattern.length - 6; i++) {
            const sub6 = pattern.slice(i, i+6);
            if (sub6.includes('O') || sub6.includes('W')) continue;
            if (targets6.includes(sub6)) c++;
        }
        for (let i = 0; i <= pattern.length - 7; i++) {
            const sub7 = pattern.slice(i, i+7);
            if (sub7.includes('O') || sub7.includes('W')) continue;
            if (targets7.includes(sub7)) c++;
        }
        return c;
    }

    // Dernier recours: maximiser le nombre de _OOO_ créés
    findMaximizeOOO(player) {
        const moves = this.getPossibleMoves(40);
        let best = null, bestScore = -Infinity;
        for (const m of moves) {
            this.board[m.y][m.x] = player;
            let sc = 0;
            for (const [dx, dy] of this.getDirs()) {
                const p = this.extractPattern(m.x, m.y, dx, dy, player);
                // Compte strictement _OOO_ ouverts
                sc += (p.includes('_XXX_') ? 0 : 0); // ne pas compter côté adverse
                sc += (p.includes('_OOO_') ? 1 : 0);
            }
            this.board[m.y][m.x] = 0;
            sc += this.calculateProximityBonus(m.x, m.y);
            if (sc > bestScore) { bestScore = sc; best = m; }
        }
        // Fallback centre
        return best || { x: Math.floor(this.BOARD_SIZE/2), y: Math.floor(this.BOARD_SIZE/2) };
    }
}
