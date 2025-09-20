/**
 * IA Elite - Algorithme Minimax avec élagage Alpha-Beta
 */
class AIElite extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);
        this.maxDepth = 3; // Réduit pour plus de rapidité
        this.transpositionTable = new Map(); // Table de transposition pour optimiser
    }
    
    /**
     * Retourne le meilleur mouvement calculé avec minimax
     * @returns {Object} {x, y} - Position du coup à jouer
     */
    getMove() {
        console.log("🧠 IA Elite - Analyse PRIORITÉS CORRIGÉES...");
        
        // PRIORITÉ ABSOLUE 1 : Nos coups gagnants
        const winMove = this.findWinningMove(this.PLAYERS.AI);
        if (winMove) {
            console.log("⚡ Coup gagnant trouvé !", winMove);
            return winMove;
        }
        
        // PRIORITÉ ABSOLUE 2 : Menaces immédiates adverses (4 en ligne)
        console.log("🔍 Détection des menaces immédiates...");
        const immediateThreats = this.findWinningThreats(this.PLAYERS.HUMAN);
        if (immediateThreats.length > 0) {
            console.log("🛡️ MENACE IMMÉDIATE à bloquer !", immediateThreats[0]);
            return immediateThreats[0];
        }
        
        // PRIORITÉ CRITIQUE 3 : Menaces de 3 (deviennent 4 au prochain coup)
        console.log("🚨 Détection des menaces de 3 immédiates...");
        const immediateThreeThreats = this.findImmediateThreeThreats(this.PLAYERS.HUMAN);
        if (immediateThreeThreats.length > 0) {
            const mostUrgent = immediateThreeThreats[0];
            console.log("🚨 MENACE DE 3 IMMÉDIATE détectée !", mostUrgent);
            console.log(`   Urgence: ${mostUrgent.urgency} - Type: ${mostUrgent.threat}`);
            return mostUrgent;
        }
        
        // PRIORITÉ 4 : Blocages critiques (séquences de 4+)
        const blockingPositions = this.findBlockingPositions(this.PLAYERS.HUMAN);
        const criticalBlocks = blockingPositions.filter(pos => pos.urgency === 'critical');
        
        if (criticalBlocks.length > 0) {
            console.log("🚨 BLOCAGE CRITIQUE nécessaire !", criticalBlocks[0]);
            console.log(`   Menace: ${criticalBlocks[0].threat}`);
            return criticalBlocks[0];
        }
        
        // PRIORITÉ 5 : Empêcher les doubles lignes de 3 (APRÈS avoir géré les 3 immédiats)
        console.log("🔍 Détection des futures doubles menaces...");
        const doubleThreatCreators = this.findDoubleThreatCreators(this.PLAYERS.HUMAN);
        if (doubleThreatCreators.length > 0) {
            console.log("⚠️ FUTURE DOUBLE MENACE détectée :", doubleThreatCreators[0]);
            console.log(`   Ce coup créerait ${doubleThreatCreators[0].linesCreated} lignes de 3`);
            return doubleThreatCreators[0];
        }
        
        // PRIORITÉ 6 : Patterns avec trous critiques
        console.log("🕵️ Détection des patterns avec trous...");
        const gapThreats = this.findGapPatternThreats(this.PLAYERS.HUMAN);
        const criticalGaps = gapThreats.filter(threat => threat.priority >= 90);
        
        if (criticalGaps.length > 0) {
            console.log("⚠️ PATTERN AVEC TROU CRITIQUE détecté !", criticalGaps[0]);
            console.log(`   Pattern: ${criticalGaps[0].type} - Trou en:`, criticalGaps[0].gapPosition);
            return criticalGaps[0].gapPosition;
        }
        
        // PRIORITÉ 7 : Nos opportunités offensives
        console.log("⚔️ Recherche d'opportunités offensives...");
        const ourOpportunities = this.findOffensiveOpportunities();
        if (ourOpportunities.length > 0) {
            console.log("⚡ OPPORTUNITÉ OFFENSIVE trouvée :", ourOpportunities[0]);
            return ourOpportunities[0];
        }
        
        // PRIORITÉ 8 : Autres blocages importants
        const highPriorityBlocks = blockingPositions.filter(pos => pos.urgency === 'high');
        if (highPriorityBlocks.length > 0) {
            console.log("⚠️ BLOCAGE IMPORTANT nécessaire :", highPriorityBlocks[0]);
            return highPriorityBlocks[0];
        }
        
        // PRIORITÉ 9 : Menaces critiques classiques (3 + 2 libres)
        const criticalThreats = this.findCriticalThreats(this.PLAYERS.HUMAN);
        if (criticalThreats.length > 0) {
            console.log("🚨 MENACE CRITIQUE détectée ! Double menace à bloquer :", criticalThreats[0]);
            return criticalThreats[0];
        }
        
        // PRIORITÉ 10 : Patterns avec trous en développement
        const developingGaps = gapThreats.filter(threat => threat.priority >= 60);
        if (developingGaps.length > 0) {
            console.log("⚠️ Pattern avec trou en développement détecté :", developingGaps[0]);
            return developingGaps[0].gapPosition;
        }
        
        // PRIORITÉ 11 : Prévision tactique futures
        console.log("🔮 Analyse des menaces futures...");
        const futureThreats = this.anticipateThreats(this.PLAYERS.HUMAN, 3);
        
        if (futureThreats.length > 0 && futureThreats[0].level > 50) {
            console.log("⚠️ MENACE FUTURE détectée !", futureThreats[0]);
            console.log("   Raisons:", futureThreats[0].reasons);
            
            const counterMove = this.findCounterMove(futureThreats[0]);
            if (counterMove) {
                console.log("🛡️ Coup préventif choisi :", counterMove);
                return counterMove;
            }
        }
        
        console.log("🔍 Recherche minimax en profondeur", this.maxDepth);
        const startTime = performance.now();
        
        // Recherche minimax complète
        const result = this.minimax(this.maxDepth, -Infinity, Infinity, true);
        
        const endTime = performance.now();
        console.log(`⏱️ Temps de calcul: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Score évalué: ${result.score}`);
        console.log(`🎯 Coup choisi:`, result.move);
        
        return result.move || { 
            x: Math.floor(this.BOARD_SIZE / 2), 
            y: Math.floor(this.BOARD_SIZE / 2) 
        };
    }
    
    /**
     * Algorithme Minimax avec élagage Alpha-Beta
     * @param {number} depth - Profondeur restante
     * @param {number} alpha - Valeur alpha pour l'élagage
     * @param {number} beta - Valeur beta pour l'élagage
     * @param {boolean} isMaximizing - True si c'est le tour de l'IA
     * @returns {Object} {score, move} - Meilleur score et mouvement
     */
    minimax(depth, alpha, beta, isMaximizing) {
        // Conditions d'arrêt
        if (depth === 0) {
            return { score: this.evaluateBoard(), move: null };
        }
        
        const boardHash = this.getBoardHash();
        const tableKey = `${boardHash}-${depth}-${isMaximizing}`;
        
        if (this.transpositionTable.has(tableKey)) {
            return this.transpositionTable.get(tableKey);
        }
        
        const moves = this.getOrderedMoves();
        if (moves.length === 0) {
            return { score: 0, move: null };
        }
        
        let bestMove = null;
        
        if (isMaximizing) {
            let maxScore = -Infinity;
            
            for (const move of moves) {
                this.board[move.y][move.x] = this.PLAYERS.AI;
                
                // Vérifier victoire immédiate
                if (this.checkWinner(move.x, move.y) === this.PLAYERS.AI) {
                    this.board[move.y][move.x] = 0;
                    const result = { score: 10000 - (this.maxDepth - depth), move };
                    this.transpositionTable.set(tableKey, result);
                    return result;
                }
                
                const result = this.minimax(depth - 1, alpha, beta, false);
                this.board[move.y][move.x] = 0;
                
                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) {
                    break; // Élagage Beta
                }
            }
            
            const result = { score: maxScore, move: bestMove };
            this.transpositionTable.set(tableKey, result);
            return result;
            
        } else {
            let minScore = Infinity;
            
            for (const move of moves) {
                this.board[move.y][move.x] = this.PLAYERS.HUMAN;
                
                // Vérifier victoire immédiate de l'adversaire
                if (this.checkWinner(move.x, move.y) === this.PLAYERS.HUMAN) {
                    this.board[move.y][move.x] = 0;
                    const result = { score: -10000 + (this.maxDepth - depth), move };
                    this.transpositionTable.set(tableKey, result);
                    return result;
                }
                
                const result = this.minimax(depth - 1, alpha, beta, true);
                this.board[move.y][move.x] = 0;
                
                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                
                beta = Math.min(beta, result.score);
                if (beta <= alpha) {
                    break; // Élagage Alpha
                }
            }
            
            const result = { score: minScore, move: bestMove };
            this.transpositionTable.set(tableKey, result);
            return result;
        }
    }
    
    /**
     * Retourne les mouvements ordonnés par priorité pour optimiser l'élagage
     * @returns {Array} Liste des mouvements ordonnés
     */
    getOrderedMoves() {
        const moves = this.getPossibleMoves(10); // Réduit de 15 à 10 pour plus de rapidité
        
        // Évalue rapidement chaque mouvement pour l'ordre
        const evaluatedMoves = moves.map(move => ({
            ...move,
            priority: this.quickEvaluate(move.x, move.y)
        }));
        
        // Trie par priorité décroissante
        evaluatedMoves.sort((a, b) => b.priority - a.priority);
        
        return evaluatedMoves;
    }
    
    /**
     * Évaluation rapide d'un mouvement pour l'ordonnancement
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score de priorité
     */
    quickEvaluate(x, y) {
        let score = 0;
        
        // PRIORITÉ 1 : Test coup gagnant pour l'IA (simple et rapide)
        this.board[y][x] = this.PLAYERS.AI;
        if (this.checkWinner(x, y) === this.PLAYERS.AI) {
            this.board[y][x] = 0;
            return 50000; // Priorité absolue
        }
        this.board[y][x] = 0;
        
        // PRIORITÉ 2 : Test coup bloquant une victoire adverse
        this.board[y][x] = this.PLAYERS.HUMAN;
        if (this.checkWinner(x, y) === this.PLAYERS.HUMAN) {
            this.board[y][x] = 0;
            return 45000; // Très haute priorité
        }
        this.board[y][x] = 0;
        
        // PRIORITÉ 3 : Évaluation positionnelle simple (pas de calculs coûteux)
        score += this.evaluatePosition(x, y, this.PLAYERS.AI);
        score += this.calculateProximityBonus(x, y);
        
        // PRIORITÉ 4 : Bonus centre (simple)
        const centerDistance = this.distanceFromCenter(x, y);
        score += Math.max(0, 20 - centerDistance);
        
        return score;
    }
    
    /**
     * Évalue l'état complet du plateau (version optimisée)
     * @returns {number} Score du plateau
     */
    evaluateBoard() {
        let score = 0;
        
        // PRIORITÉ 1 : Menaces immédiates seulement si vraiment nécessaire
        // (Évite les calculs coûteux à chaque évaluation)
        
        // PRIORITÉ 2 : Évaluation positionnelle rapide
        score += this.evaluateAllLines(this.PLAYERS.AI) - this.evaluateAllLines(this.PLAYERS.HUMAN);
        
        // PRIORITÉ 3 : Bonus stratégiques légers
        score += this.evaluateCenterControl() * 0.3;
        
        // Mobilité simple
        const mobility = this.getPossibleMoves(20).length;
        score += mobility * 1;
        
        return score;
    }
    
    /**
     * Trouve les menaces de victoire immédiate (4 en ligne avec 1 case vide)
     * @param {number} player - Le joueur
     * @returns {Array} Liste des positions gagnantes
     */
    findWinningThreats(player) {
        const threats = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        // Scan complet du plateau pour toutes les menaces
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === 0) {
                    // Teste si jouer ici créerait une victoire
                    this.board[y][x] = player;
                    
                    // Vérifie TOUTES les directions depuis cette position
                    let wouldWin = false;
                    for (const [dx, dy] of directions) {
                        const count = this.countConsecutiveInDirection(x, y, dx, dy, player);
                        if (count >= this.WIN_LENGTH) {
                            wouldWin = true;
                            break;
                        }
                    }
                    
                    if (wouldWin) {
                        threats.push({ x, y });
                    }
                    
                    this.board[y][x] = 0;
                }
            }
        }
        
        return threats;
    }
    
    /**
     * CORRECTION CRITIQUE: Trouve spécifiquement les positions de blocage
     * @param {number} player - Le joueur à bloquer
     * @returns {Array} Liste des positions qui bloquent les menaces
     */
    findBlockingPositions(player) {
        const blockingPositions = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        // Cherche toutes les séquences de 3+ pions du joueur
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    
                    for (const [dx, dy] of directions) {
                        const blockingMoves = this.findBlockingMovesInDirection(x, y, dx, dy, player);
                        blockingPositions.push(...blockingMoves);
                    }
                }
            }
        }
        
        // Supprime les doublons
        const uniqueBlocks = [];
        const seen = new Set();
        
        for (const pos of blockingPositions) {
            const key = `${pos.x},${pos.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueBlocks.push(pos);
            }
        }
        
        return uniqueBlocks;
    }
    
    /**
     * Trouve les coups de blocage dans une direction spécifique
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur à bloquer
     * @returns {Array} Positions de blocage
     */
    findBlockingMovesInDirection(x, y, dx, dy, player) {
        const blockingMoves = [];
        
        // Compte les pions consécutifs dans cette direction
        let consecutivePositions = [{ x, y }];
        
        // Direction positive
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutivePositions.push({ x: nx, y: ny });
                } else {
                    break;
                }
            }
        }
        
        // Direction négative
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutivePositions.unshift({ x: nx, y: ny });
                } else {
                    break;
                }
            }
        }
        
        // Si on a 3+ pions consécutifs, trouve les positions de blocage
        if (consecutivePositions.length >= 3) {
            const firstPos = consecutivePositions[0];
            const lastPos = consecutivePositions[consecutivePositions.length - 1];
            
            // Position avant la séquence
            const beforeX = firstPos.x - dx;
            const beforeY = firstPos.y - dy;
            if (beforeX >= 0 && beforeX < this.BOARD_SIZE && 
                beforeY >= 0 && beforeY < this.BOARD_SIZE &&
                this.board[beforeY][beforeX] === 0) {
                blockingMoves.push({ 
                    x: beforeX, 
                    y: beforeY, 
                    threat: `block-${consecutivePositions.length}-before`,
                    urgency: consecutivePositions.length >= 4 ? 'critical' : 'high'
                });
            }
            
            // Position après la séquence
            const afterX = lastPos.x + dx;
            const afterY = lastPos.y + dy;
            if (afterX >= 0 && afterX < this.BOARD_SIZE && 
                afterY >= 0 && afterY < this.BOARD_SIZE &&
                this.board[afterY][afterX] === 0) {
                blockingMoves.push({ 
                    x: afterX, 
                    y: afterY, 
                    threat: `block-${consecutivePositions.length}-after`,
                    urgency: consecutivePositions.length >= 4 ? 'critical' : 'high'
                });
            }
        }
        
        return blockingMoves;
    }
    
    /**
     * PRIORITÉ CRITIQUE: Détecte les séquences de 3 avec 1 ou 2 espaces libres
     * Ces menaces sont plus urgentes que les futures doubles menaces !
     * @param {number} player - Le joueur à analyser
     * @returns {Array} Menaces de 3 immédiates à bloquer
     */
    findImmediateThreeThreats(player) {
        const immediateThreats = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    
                    for (const [dx, dy] of directions) {
                        const threat = this.analyzeImmediateThreeThreat(x, y, dx, dy, player);
                        if (threat) {
                            immediateThreats.push(threat);
                        }
                    }
                }
            }
        }
        
        // Supprime les doublons et trie par urgence
        const uniqueThreats = this.removeDuplicateThreats(immediateThreats);
        uniqueThreats.sort((a, b) => b.urgency - a.urgency);
        
        return uniqueThreats;
    }
    
    /**
     * Analyse une menace de 3 immédiate dans une direction
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Object|null} Menace trouvée ou null
     */
    analyzeImmediateThreeThreat(x, y, dx, dy, player) {
        // Compte les pions consécutifs du joueur
        let consecutivePositions = [{ x, y }];
        
        // Direction positive
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutivePositions.push({ x: nx, y: ny });
                } else {
                    break;
                }
            }
        }
        
        // Direction négative
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutivePositions.unshift({ x: nx, y: ny });
                } else {
                    break;
                }
            }
        }
        
        // Si on a exactement 3 pions consécutifs
        if (consecutivePositions.length === 3) {
            const firstPos = consecutivePositions[0];
            const lastPos = consecutivePositions[2];
            
            const criticalPositions = [];
            
            // Position avant (pour faire 4)
            const beforeX = firstPos.x - dx;
            const beforeY = firstPos.y - dy;
            if (beforeX >= 0 && beforeX < this.BOARD_SIZE && 
                beforeY >= 0 && beforeY < this.BOARD_SIZE &&
                this.board[beforeY][beforeX] === 0) {
                
                criticalPositions.push({ 
                    x: beforeX, 
                    y: beforeY,
                    urgency: 100, // URGENCE MAXIMALE
                    threat: '3-to-4-before'
                });
            }
            
            // Position après (pour faire 4)
            const afterX = lastPos.x + dx;
            const afterY = lastPos.y + dy;
            if (afterX >= 0 && afterX < this.BOARD_SIZE && 
                afterY >= 0 && afterY < this.BOARD_SIZE &&
                this.board[afterY][afterX] === 0) {
                
                criticalPositions.push({ 
                    x: afterX, 
                    y: afterY,
                    urgency: 100, // URGENCE MAXIMALE
                    threat: '3-to-4-after'
                });
            }
            
            if (criticalPositions.length > 0) {
                return criticalPositions;
            }
        }
        
        // Aussi détecter 2 pions + espace + 1 pion (menace cachée)
        if (consecutivePositions.length === 2) {
            return this.detectHiddenThreePattern(consecutivePositions, dx, dy, player);
        }
        
        return null;
    }
    
    /**
     * Détecte les patterns cachés de type 2+espace+1
     * @param {Array} positions - Positions des 2 pions consécutifs
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Array|null} Positions critiques ou null
     */
    detectHiddenThreePattern(positions, dx, dy, player) {
        const firstPos = positions[0];
        const lastPos = positions[1];
        
        // Cherche un troisième pion à distance 2 (avec 1 espace)
        const gapX = lastPos.x + dx;
        const gapY = lastPos.y + dy;
        const thirdX = lastPos.x + 2 * dx;
        const thirdY = lastPos.y + 2 * dy;
        
        if (thirdX >= 0 && thirdX < this.BOARD_SIZE && 
            thirdY >= 0 && thirdY < this.BOARD_SIZE &&
            gapX >= 0 && gapX < this.BOARD_SIZE && 
            gapY >= 0 && gapY < this.BOARD_SIZE) {
            
            // Pattern: X-X-espace-X
            if (this.board[thirdY][thirdX] === player && 
                this.board[gapY][gapX] === 0) {
                
                return [{
                    x: gapX,
                    y: gapY,
                    urgency: 95, // TRÈS URGENT
                    threat: '2-gap-1-pattern'
                }];
            }
        }
        
        return null;
    }
    
    /**
     * Supprime les menaces dupliquées
     * @param {Array} threats - Liste des menaces
     * @returns {Array} Menaces uniques
     */
    removeDuplicateThreats(threats) {
        const unique = [];
        const seen = new Set();
        
        for (const threatGroup of threats) {
            if (Array.isArray(threatGroup)) {
                for (const threat of threatGroup) {
                    const key = `${threat.x},${threat.y}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(threat);
                    }
                }
            }
        }
        
        return unique;
    }
    
    /**
     * Trouve les menaces à 1 coup (3 en ligne avec 2 cases libres)
     * @param {number} player - Le joueur
     * @returns {Array} Liste des menaces potentielles
     */
    findNearWinThreats(player) {
        const threats = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    for (const [dx, dy] of directions) {
                        const threat = this.analyzeLineForThreat(x, y, dx, dy, player);
                        if (threat) {
                            threats.push(threat);
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Analyse une ligne pour détecter une menace potentielle
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {object|null} Objet décrivant la menace ou null
     */
    analyzeLineForThreat(x, y, dx, dy, player) {
        let playerCount = 0;
        let emptySpaces = [];
        let line = [];
        
        // Examine la ligne dans les deux directions
        for (let i = -(this.WIN_LENGTH - 1); i < this.WIN_LENGTH; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                const cell = this.board[ny][nx];
                line.push({ x: nx, y: ny, value: cell });
                
                if (cell === player) {
                    playerCount++;
                } else if (cell === 0) {
                    emptySpaces.push({ x: nx, y: ny });
                }
            }
        }
        
        // Cherche 3 pions + 2 espaces libres dans une fenêtre de 5
        if (playerCount >= 3 && emptySpaces.length >= 2) {
            return { 
                positions: emptySpaces,
                strength: playerCount,
                type: 'near-win'
            };
        }
        
        return null;
    }
    
    /**
     * Trouve un coup gagnant immédiat pour un joueur
     * @param {number} player - Le joueur
     * @returns {Object|null} Position gagnante ou null
     */
    findWinningMove(player) {
        const threats = this.findWinningThreats(player);
        return threats.length > 0 ? threats[0] : null;
    }
    
    /**
     * Détecte les menaces critiques : 3 pions alignés avec 2 extrémités libres
     * @param {number} player - Le joueur à analyser
     * @returns {Array} Liste des positions critiques à bloquer
     */
    findCriticalThreats(player) {
        const criticalMoves = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    
                    for (const [dx, dy] of directions) {
                        const threat = this.checkCriticalThreatInDirection(x, y, dx, dy, player);
                        if (threat) {
                            criticalMoves.push(...threat);
                        }
                    }
                }
            }
        }
        
        // Supprime les doublons
        const uniqueMoves = [];
        const seen = new Set();
        
        for (const move of criticalMoves) {
            const key = `${move.x},${move.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMoves.push(move);
            }
        }
        
        return uniqueMoves;
    }
    
    /**
     * Vérifie une menace critique dans une direction
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ  
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Array|null} Positions à bloquer ou null
     */
    checkCriticalThreatInDirection(x, y, dx, dy, player) {
        // Analyse étendue pour détecter les patterns dispersés
        const maxRange = 8; // Augmente la portée de détection
        let playerPositions = [];
        
        // Scan dans les deux directions sur une large plage
        for (let i = -maxRange; i <= maxRange; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    playerPositions.push({ x: nx, y: ny, index: i });
                }
            }
        }
        
        // Cherche des patterns de 3+ pions avec des espaces
        if (playerPositions.length >= 3) {
            const threats = this.analyzeScatteredPattern(playerPositions, dx, dy, player);
            if (threats.length > 0) {
                return threats;
            }
        }
        
        // Analyse traditionnelle pour les séquences consécutives
        let consecutiveCount = 1;
        let positions = [{ x, y }];
        
        // Vérifie dans la direction positive
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutiveCount++;
                    positions.push({ x: nx, y: ny });
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        // Vérifie dans la direction négative
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutiveCount++;
                    positions.unshift({ x: nx, y: ny });
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        // Si on a exactement 3 pions consécutifs
        if (consecutiveCount === 3) {
            const firstPion = positions[0];
            const lastPion = positions[positions.length - 1];
            
            // Vérifie les extrémités
            const beforeX = firstPion.x - dx;
            const beforeY = firstPion.y - dy;
            const afterX = lastPion.x + dx;
            const afterY = lastPion.y + dy;
            
            const moves = [];
            
            // Vérifie si les deux extrémités sont libres
            if (beforeX >= 0 && beforeX < this.BOARD_SIZE && beforeY >= 0 && beforeY < this.BOARD_SIZE) {
                if (this.board[beforeY][beforeX] === 0) {
                    moves.push({ x: beforeX, y: beforeY });
                }
            }
            
            if (afterX >= 0 && afterX < this.BOARD_SIZE && afterY >= 0 && afterY < this.BOARD_SIZE) {
                if (this.board[afterY][afterX] === 0) {
                    moves.push({ x: afterX, y: afterY });
                }
            }
            
            // Double menace = les 2 extrémités sont libres
            if (moves.length === 2) {
                return moves;
            }
        }
        
        return null;
    }
    
    /**
     * Analyse les patterns dispersés pour détecter les menaces cachées
     * @param {Array} positions - Positions des pions du joueur
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Array} Positions critiques à bloquer
     */
    analyzeScatteredPattern(positions, dx, dy, player) {
        const threats = [];
        
        // Cherche des fenêtres de 5 cases qui contiennent 3+ pions
        for (let i = 0; i < positions.length - 2; i++) {
            for (let j = i + 1; j < positions.length - 1; j++) {
                for (let k = j + 1; k < positions.length; k++) {
                    const pos1 = positions[i];
                    const pos2 = positions[j];
                    const pos3 = positions[k];
                    
                    // Vérifie si ces 3 pions peuvent former une ligne de 5
                    const span = Math.abs(pos3.index - pos1.index);
                    
                    if (span <= 4) { // Dans une fenêtre de 5 cases
                        // Trouve les positions vides qui complèteraient la ligne
                        const emptyPositions = this.findEmptyPositionsInSpan(pos1, pos3, dx, dy);
                        
                        if (emptyPositions.length >= 2) {
                            // Pattern dangereux détecté !
                            threats.push(...emptyPositions.slice(0, 2));
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Trouve les positions vides dans un span de positions
     * @param {Object} start - Position de début
     * @param {Object} end - Position de fin
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {Array} Positions vides
     */
    findEmptyPositionsInSpan(start, end, dx, dy) {
        const emptyPositions = [];
        const minIndex = Math.min(start.index, end.index);
        const maxIndex = Math.max(start.index, end.index);
        
        for (let i = minIndex; i <= maxIndex; i++) {
            const nx = start.x + (i - start.index) * dx;
            const ny = start.y + (i - start.index) * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === 0) {
                    emptyPositions.push({ x: nx, y: ny });
                }
            }
        }
        
        return emptyPositions;
    }
    
    /**
     * Prévision tactique : détecte les menaces qui peuvent se développer en 2-3 coups
     * @param {number} player - Le joueur à analyser
     * @param {number} depth - Profondeur de prévision (2 ou 3)
     * @returns {Array} Liste des positions critiques à surveiller
     */
    anticipateThreats(player, depth = 2) {
        const criticalPositions = [];
        
        // Simule tous les coups possibles du joueur
        const playerMoves = this.getPossibleMoves(15);
        
        for (const move of playerMoves) {
            // Simule le coup du joueur
            this.board[move.y][move.x] = player;
            
            // Vérifie si ce coup crée des menaces futures
            const threatAnalysis = this.analyzePositionForFutureThreats(player, depth - 1);
            
            if (threatAnalysis.criticalLevel > 0) {
                criticalPositions.push({
                    position: move,
                    level: threatAnalysis.criticalLevel,
                    reasons: threatAnalysis.reasons
                });
            }
            
            // Annule le coup simulé
            this.board[move.y][move.x] = 0;
        }
        
        // Trie par niveau de criticité
        criticalPositions.sort((a, b) => b.level - a.level);
        
        return criticalPositions;
    }
    
    /**
     * Analyse une position pour détecter les menaces futures
     * @param {number} player - Le joueur
     * @param {number} remainingDepth - Profondeur restante
     * @returns {Object} Analyse des menaces
     */
    analyzePositionForFutureThreats(player, remainingDepth) {
        let criticalLevel = 0;
        const reasons = [];
        
        // Vérifie les menaces immédiates après ce coup
        const immediateThreats = this.findWinningThreats(player);
        if (immediateThreats.length > 0) {
            criticalLevel += 100;
            reasons.push("Menace de victoire immédiate");
        }
        
        // Vérifie les doubles menaces
        const criticalThreats = this.findCriticalThreats(player);
        if (criticalThreats.length > 0) {
            criticalLevel += 80;
            reasons.push("Double menace (3+2 libres)");
        }
        
        // Vérifie les menaces à développement (2 pions avec espace)
        const developingThreats = this.findDevelopingThreats(player);
        if (developingThreats.length > 0) {
            criticalLevel += 30;
            reasons.push("Menace en développement");
        }
        
        // Si on a encore de la profondeur, continue la simulation
        if (remainingDepth > 0) {
            const futureAnalysis = this.simulateOpponentResponse(player, remainingDepth);
            criticalLevel += futureAnalysis.maxThreat * 0.5; // Réduit l'impact des menaces lointaines
        }
        
        return { criticalLevel, reasons };
    }
    
    /**
     * Trouve les menaces en développement (2 pions avec potentiel d'extension)
     * @param {number} player - Le joueur
     * @returns {Array} Liste des menaces en développement
     */
    findDevelopingThreats(player) {
        const threats = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        // Collecte toutes les positions du joueur
        const playerPositions = [];
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    playerPositions.push({ x, y });
                }
            }
        }
        
        // Analyse les patterns dispersés dans chaque direction
        for (const [dx, dy] of directions) {
            const directionThreats = this.findScatteredThreatsInDirection(playerPositions, dx, dy, player);
            threats.push(...directionThreats);
        }
        
        // Analyse traditionnelle pour les séquences consécutives
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    
                    for (const [dx, dy] of directions) {
                        const threat = this.checkDevelopingThreatInDirection(x, y, dx, dy, player);
                        if (threat) {
                            threats.push(threat);
                        }
                    }
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Trouve les menaces dispersées dans une direction spécifique
     * @param {Array} playerPositions - Toutes les positions du joueur
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Array} Menaces trouvées
     */
    findScatteredThreatsInDirection(playerPositions, dx, dy, player) {
        const threats = [];
        
        // Groupe les positions par ligne (même direction)
        const lines = new Map();
        
        for (const pos of playerPositions) {
            // Calcule la "ligne" à laquelle appartient cette position
            const lineKey = this.getLineKey(pos.x, pos.y, dx, dy);
            
            if (!lines.has(lineKey)) {
                lines.set(lineKey, []);
            }
            lines.get(lineKey).push(pos);
        }
        
        // Analyse chaque ligne pour des patterns dangereux
        for (const [lineKey, positions] of lines) {
            if (positions.length >= 2) {
                const threat = this.analyzeLineForScatteredThreat(positions, dx, dy, player);
                if (threat) {
                    threats.push(threat);
                }
            }
        }
        
        return threats;
    }
    
    /**
     * Génère une clé unique pour identifier une ligne dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {string} Clé de ligne
     */
    getLineKey(x, y, dx, dy) {
        // Calcule l'intercept de la ligne passant par (x,y) dans la direction (dx,dy)
        if (dx === 0) {
            return `v_${x}`; // Ligne verticale
        } else if (dy === 0) {
            return `h_${y}`; // Ligne horizontale
        } else {
            // Pour les diagonales : y - (dy/dx) * x = constante
            const slope = dy / dx;
            const intercept = y - slope * x;
            return `d_${slope}_${Math.round(intercept * 1000)}`; // Arrondi pour éviter les erreurs de float
        }
    }
    
    /**
     * Analyse une ligne pour des menaces dispersées
     * @param {Array} positions - Positions du joueur sur cette ligne
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Object|null} Menace trouvée ou null
     */
    analyzeLineForScatteredThreat(positions, dx, dy, player) {
        // Trie les positions par ordre dans la direction
        positions.sort((a, b) => {
            const aProj = a.x * dx + a.y * dy;
            const bProj = b.x * dx + b.y * dy;
            return aProj - bProj;
        });
        
        // Cherche des patterns comme : X . X . . ou X . . X avec assez d'espace
        for (let i = 0; i < positions.length - 1; i++) {
            const pos1 = positions[i];
            const pos2 = positions[i + 1];
            
            // Calcule la distance entre les deux pions
            const distX = Math.abs(pos2.x - pos1.x);
            const distY = Math.abs(pos2.y - pos1.y);
            const distance = Math.max(distX, distY);
            
            // Si les pions sont dans une fenêtre de 5 cases
            if (distance <= 4) {
                // Vérifie l'espace disponible avant et après
                const spaceBefore = this.countEmptySpaceInDirection(pos1.x, pos1.y, -dx, -dy, 5);
                const spaceAfter = this.countEmptySpaceInDirection(pos2.x, pos2.y, dx, dy, 5);
                const spaceBetween = distance - 1;
                
                const totalSpace = spaceBefore + spaceAfter + spaceBetween;
                
                if (totalSpace >= 3) { // Assez d'espace pour compléter à 5
                    return {
                        positions: [pos1, pos2],
                        spaceAvailable: totalSpace,
                        potential: "scattered-high",
                        pattern: `distance_${distance}_space_${totalSpace}`
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Compte l'espace vide dans une direction (amélioration de hasSpaceInDirection)
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} maxCheck - Distance max à vérifier
     * @returns {number} Nombre de cases libres
     */
    countEmptySpaceInDirection(x, y, dx, dy, maxCheck) {
        let space = 0;
        
        for (let i = 1; i <= maxCheck; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === 0) {
                    space++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        return space;
    }
    
    /**
     * Vérifie une menace en développement dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Object|null} Menace trouvée ou null
     */
    checkDevelopingThreatInDirection(x, y, dx, dy, player) {
        // Cherche 2 pions consécutifs avec de l'espace pour se développer
        let consecutiveCount = 1;
        let positions = [{ x, y }];
        
        // Direction positive
        for (let i = 1; i < 3; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    consecutiveCount++;
                    positions.push({ x: nx, y: ny });
                } else {
                    break;
                }
            }
        }
        
        // Si on a 2 pions consécutifs, vérifie l'espace autour
        if (consecutiveCount === 2) {
            const firstPion = positions[0];
            const lastPion = positions[1];
            
            // Vérifie l'espace avant et après
            const spaceBefore = this.hasSpaceInDirection(firstPion.x, firstPion.y, -dx, -dy, 3);
            const spaceAfter = this.hasSpaceInDirection(lastPion.x, lastPion.y, dx, dy, 3);
            
            if (spaceBefore + spaceAfter >= 3) { // Assez d'espace pour faire 5
                return {
                    positions: positions,
                    spaceAvailable: spaceBefore + spaceAfter,
                    potential: "high"
                };
            }
        }
        
        return null;
    }
    
    /**
     * Vérifie l'espace disponible dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} maxCheck - Distance max à vérifier
     * @returns {number} Nombre de cases libres
     */
    hasSpaceInDirection(x, y, dx, dy, maxCheck) {
        let space = 0;
        
        for (let i = 1; i <= maxCheck; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === 0) {
                    space++;
                } else {
                    break; // Bloqué par un pion
                }
            } else {
                break; // Hors du plateau
            }
        }
        
        return space;
    }
    
    /**
     * Simule la réponse de l'adversaire pour évaluer les menaces futures
     * @param {number} player - Le joueur actuel
     * @param {number} depth - Profondeur restante
     * @returns {Object} Analyse des menaces après réponse
     */
    simulateOpponentResponse(player, depth) {
        const opponent = player === this.PLAYERS.AI ? this.PLAYERS.HUMAN : this.PLAYERS.AI;
        let maxThreat = 0;
        
        // Simule quelques coups de l'adversaire
        const opponentMoves = this.getPossibleMoves(8);
        
        for (const move of opponentMoves.slice(0, 5)) { // Limite à 5 coups pour la performance
            this.board[move.y][move.x] = opponent;
            
            // Réanalyse les menaces du joueur original
            const newThreats = this.findWinningThreats(player);
            const newCritical = this.findCriticalThreats(player);
            
            let threatLevel = newThreats.length * 50 + newCritical.length * 30;
            maxThreat = Math.max(maxThreat, threatLevel);
            
            this.board[move.y][move.x] = 0;
        }
        
        return { maxThreat };
    }
    
    /**
     * Trouve le meilleur coup pour contrer une menace future
     * @param {Object} threat - Menace à contrer
     * @returns {Object|null} Position pour contrer ou null
     */
    findCounterMove(threat) {
        const threatenedPosition = threat.position;
        
        // Stratégie 1 : Bloquer directement la position menaçante
        if (this.board[threatenedPosition.y][threatenedPosition.x] === 0) {
            return threatenedPosition;
        }
        
        // Stratégie 2 : Chercher les positions adjacentes stratégiques
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
        
        for (const [dx, dy] of directions) {
            const counterX = threatenedPosition.x + dx;
            const counterY = threatenedPosition.y + dy;
            
            if (counterX >= 0 && counterX < this.BOARD_SIZE && 
                counterY >= 0 && counterY < this.BOARD_SIZE &&
                this.board[counterY][counterX] === 0) {
                
                // Teste si cette position perturbe la menace
                this.board[counterY][counterX] = this.PLAYERS.AI;
                
                const newThreats = this.anticipateThreats(this.PLAYERS.HUMAN, 2);
                const maxNewThreat = newThreats.length > 0 ? newThreats[0].level : 0;
                
                this.board[counterY][counterX] = 0;
                
                // Si cette position réduit la menace, c'est un bon coup
                if (maxNewThreat < threat.level * 0.7) {
                    return { x: counterX, y: counterY };
                }
            }
        }
        
        return null;
    }
    
    /**
     * CONTRE-STRATÉGIE 1: Détecte les coups qui créent DEUX lignes de 3 simultanément
     * @param {number} player - Le joueur à analyser
     * @returns {Array} Positions qui créent des doubles menaces fatales
     */
    findDoubleThreatCreators(player) {
        const dangerousPositions = [];
        
        // Teste chaque position vide
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === 0) {
                    
                    // Simule le coup
                    this.board[y][x] = player;
                    
                    // Compte combien de lignes de 3 ce coup crée
                    const linesOf3 = this.countLinesOfThree(x, y, player);
                    
                    // Si ce coup crée 2+ lignes de 3 = DANGER MORTEL
                    if (linesOf3 >= 2) {
                        dangerousPositions.push({
                            x, y,
                            linesCreated: linesOf3,
                            threat: 'double-line-of-3'
                        });
                    }
                    
                    // Annule la simulation
                    this.board[y][x] = 0;
                }
            }
        }
        
        // Trie par nombre de lignes créées (plus dangereux en premier)
        dangerousPositions.sort((a, b) => b.linesCreated - a.linesCreated);
        
        return dangerousPositions;
    }
    
    /**
     * Compte le nombre de lignes de 3 que crée un coup à une position
     * @param {number} x - Position X du coup
     * @param {number} y - Position Y du coup
     * @param {number} player - Le joueur
     * @returns {number} Nombre de lignes de 3 créées
     */
    countLinesOfThree(x, y, player) {
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        let linesOf3 = 0;
        
        for (const [dx, dy] of directions) {
            const lineCount = this.countConsecutiveInDirection(x, y, dx, dy, player);
            
            // Si on a exactement 3 pions consécutifs dans cette direction
            if (lineCount === 3) {
                linesOf3++;
            }
        }
        
        return linesOf3;
    }
    
    /**
     * Compte les pions consécutifs dans une direction
     * @param {number} x - Position X centrale
     * @param {number} y - Position Y centrale
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {number} Nombre total de pions consécutifs
     */
    countConsecutiveInDirection(x, y, dx, dy, player) {
        let count = 1; // Compte le pion central
        
        // Compte dans la direction positive
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        // Compte dans la direction négative
        for (let i = 1; i < this.WIN_LENGTH; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        return count;
    }
    
    /**
     * CONTRE-STRATÉGIE 2: Détecte le pattern X-X-espace-X (2 + trou + 1)
     * @param {number} player - Le joueur à analyser
     * @returns {Array} Positions des trous dangereux à surveiller
     */
    findGapPatternThreats(player) {
        const dangerousGaps = [];
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === player) {
                    
                    for (const [dx, dy] of directions) {
                        const gapThreat = this.analyzeGapPattern(x, y, dx, dy, player);
                        if (gapThreat) {
                            dangerousGaps.push(gapThreat);
                        }
                    }
                }
            }
        }
        
        return dangerousGaps;
    }
    
    /**
     * Analyse un pattern avec trou dans une direction
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {Object|null} Pattern dangereux trouvé ou null
     */
    analyzeGapPattern(x, y, dx, dy, player) {
        // Cherche le pattern : X-X-espace-X ou X-espace-X-X
        const positions = [];
        const maxScan = 6; // Scan sur 6 cases pour détecter les patterns avec trous
        
        // Scan dans la direction positive
        for (let i = 0; i < maxScan; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                positions.push({
                    x: nx, y: ny,
                    value: this.board[ny][nx],
                    index: i
                });
            }
        }
        
        // Cherche les patterns dangereux
        return this.detectDangerousGapPattern(positions, player, dx, dy);
    }
    
    /**
     * Détecte les patterns dangereux avec trous
     * @param {Array} positions - Positions scannées
     * @param {number} player - Le joueur
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {Object|null} Pattern dangereux ou null
     */
    detectDangerousGapPattern(positions, player, dx, dy) {
        // Pattern 1: X-X-vide-X (2 consécutifs + trou + 1)
        for (let i = 0; i < positions.length - 3; i++) {
            const p1 = positions[i];
            const p2 = positions[i + 1];
            const gap = positions[i + 2];
            const p3 = positions[i + 3];
            
            if (p1.value === player && p2.value === player && 
                gap.value === 0 && p3.value === player) {
                
                return {
                    type: 'XX_X',
                    gapPosition: { x: gap.x, y: gap.y },
                    threat: 'gap-pattern-fatal',
                    priority: 90
                };
            }
        }
        
        // Pattern 2: X-vide-X-X (1 + trou + 2 consécutifs)
        for (let i = 0; i < positions.length - 3; i++) {
            const p1 = positions[i];
            const gap = positions[i + 1];
            const p2 = positions[i + 2];
            const p3 = positions[i + 3];
            
            if (p1.value === player && gap.value === 0 && 
                p2.value === player && p3.value === player) {
                
                return {
                    type: 'X_XX',
                    gapPosition: { x: gap.x, y: gap.y },
                    threat: 'gap-pattern-fatal',
                    priority: 90
                };
            }
        }
        
        // Pattern 3: X-vide-vide-X-X (détection précoce)
        for (let i = 0; i < positions.length - 4; i++) {
            const p1 = positions[i];
            const gap1 = positions[i + 1];
            const gap2 = positions[i + 2];
            const p2 = positions[i + 3];
            const p3 = positions[i + 4];
            
            if (p1.value === player && gap1.value === 0 && gap2.value === 0 &&
                p2.value === player && p3.value === player) {
                
                return {
                    type: 'X__XX',
                    gapPosition: { x: gap1.x, y: gap1.y }, // Première position critique
                    threat: 'gap-pattern-developing',
                    priority: 60
                };
            }
        }
        
        return null;
    }
    
    /**
     * NOUVELLE FONCTION: Trouve les opportunités offensives de l'IA
     * @returns {Array} Positions offensives prometteuses
     */
    findOffensiveOpportunities() {
        const opportunities = [];
        
        // Cherche nos propres menaces à développer
        const ourThreats = this.findWinningThreats(this.PLAYERS.AI);
        if (ourThreats.length > 0) {
            opportunities.push({
                ...ourThreats[0],
                type: 'winning-move',
                priority: 100
            });
        }
        
        // Cherche nos propres doubles menaces potentielles
        const ourDoubleThreats = this.findDoubleThreatCreators(this.PLAYERS.AI);
        if (ourDoubleThreats.length > 0) {
            opportunities.push({
                ...ourDoubleThreats[0],
                type: 'double-threat-creation',
                priority: 95
            });
        }
        
        // Cherche nos patterns avec trous à compléter
        const ourGapPatterns = this.findGapPatternThreats(this.PLAYERS.AI);
        const ourCriticalGaps = ourGapPatterns.filter(threat => threat.priority >= 70);
        
        for (const gap of ourCriticalGaps) {
            opportunities.push({
                ...gap.gapPosition,
                type: 'gap-completion',
                priority: 85,
                pattern: gap.type
            });
        }
        
        // Cherche les positions qui créent des menaces multiples
        const multiThreatPositions = this.findMultiThreatPositions(this.PLAYERS.AI);
        opportunities.push(...multiThreatPositions);
        
        // Trie par priorité décroissante
        opportunities.sort((a, b) => b.priority - a.priority);
        
        return opportunities;
    }
    
    /**
     * Trouve les positions qui créent plusieurs menaces pour nous
     * @param {number} player - Notre joueur (IA)
     * @returns {Array} Positions multi-menaces
     */
    findMultiThreatPositions(player) {
        const multiThreats = [];
        
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] === 0) {
                    
                    // Simule notre coup
                    this.board[y][x] = player;
                    
                    // Compte combien de menaces ce coup crée
                    let threatCount = 0;
                    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
                    
                    for (const [dx, dy] of directions) {
                        const lineCount = this.countConsecutiveInDirection(x, y, dx, dy, player);
                        
                        // Compte les lignes de 2+ comme menaces potentielles
                        if (lineCount >= 2) {
                            const spaceAvailable = this.hasSpaceForExtension(x, y, dx, dy, player);
                            if (spaceAvailable >= 3) { // Assez d'espace pour faire 5
                                threatCount++;
                            }
                        }
                    }
                    
                    // Annule la simulation
                    this.board[y][x] = 0;
                    
                    if (threatCount >= 2) {
                        multiThreats.push({
                            x, y,
                            type: 'multi-threat-creation',
                            priority: 80,
                            threatCount: threatCount
                        });
                    }
                }
            }
        }
        
        return multiThreats;
    }
    
    /**
     * Vérifie si une position a assez d'espace pour s'étendre
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {number} Espace disponible total
     */
    hasSpaceForExtension(x, y, dx, dy, player) {
        let totalSpace = 0;
        
        // Compte l'espace dans la direction positive
        for (let i = 1; i <= 4; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === 0 || this.board[ny][nx] === player) {
                    totalSpace++;
                } else {
                    break;
                }
            }
        }
        
        // Compte l'espace dans la direction négative
        for (let i = 1; i <= 4; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                if (this.board[ny][nx] === 0 || this.board[ny][nx] === player) {
                    totalSpace++;
                } else {
                    break;
                }
            }
        }
        
        return totalSpace;
    }

    /**
     * Évalue toutes les lignes possibles pour un joueur
     * @param {number} player - Le joueur à évaluer
     * @returns {number} Score total des lignes
     */
    evaluateAllLines(player) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        // Évalue seulement dans les zones actives pour optimiser
        const activeCells = this.getActiveCells();
        
        for (const cell of activeCells) {
            for (const [dx, dy] of directions) {
                score += this.evaluateLineFromPosition(cell.x, cell.y, dx, dy, player);
            }
        }
        
        return score;
    }
    
    /**
     * Retourne les cellules dans les zones actives du jeu
     * @returns {Array} Liste des cellules actives
     */
    getActiveCells() {
        const activeCells = [];
        const occupiedCells = [];
        
        // Trouve toutes les cellules occupées
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] !== 0) {
                    occupiedCells.push({ x, y });
                }
            }
        }
        
        // Ajoute une zone autour de chaque cellule occupée
        const activeSet = new Set();
        
        for (const cell of occupiedCells) {
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const x = cell.x + dx;
                    const y = cell.y + dy;
                    
                    if (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE) {
                        activeSet.add(`${x},${y}`);
                    }
                }
            }
        }
        
        // Convertit en tableau
        for (const pos of activeSet) {
            const [x, y] = pos.split(',').map(Number);
            activeCells.push({ x, y });
        }
        
        return activeCells;
    }
    
    /**
     * Évalue une ligne depuis une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Joueur
     * @returns {number} Score de la ligne
     */
    evaluateLineFromPosition(x, y, dx, dy, player) {
        let score = 0;
        
        // Évalue différentes longueurs de lignes
        for (let length = 2; length <= this.WIN_LENGTH; length++) {
            const lineScore = this.evaluateSpecificLine(x, y, dx, dy, length, player);
            score += lineScore;
        }
        
        return score;
    }
    
    /**
     * Évalue une ligne de longueur spécifique
     * @param {number} x - Position X de départ
     * @param {number} y - Position Y de départ
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} length - Longueur de la ligne
     * @param {number} player - Joueur
     * @returns {number} Score de cette ligne
     */
    evaluateSpecificLine(x, y, dx, dy, length, player) {
        let maxScore = 0;
        
        // Teste toutes les positions possibles de la ligne
        for (let start = 0; start < length; start++) {
            let playerCount = 0;
            let emptyCount = 0;
            let opponentCount = 0;
            let validLine = true;
            
            // Analyse la ligne
            for (let i = 0; i < length; i++) {
                const nx = x + (i - start) * dx;
                const ny = y + (i - start) * dy;
                
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) {
                    validLine = false;
                    break;
                }
                
                const cell = this.board[ny][nx];
                if (cell === player) {
                    playerCount++;
                } else if (cell === 0) {
                    emptyCount++;
                } else {
                    opponentCount++;
                }
            }
            
            // Une ligne n'est utile que si elle n'est pas bloquée par l'adversaire
            if (!validLine || opponentCount > 0) {
                continue;
            }
            
            // Ne compte que les lignes avec au moins un pion du joueur
            if (playerCount === 0) {
                continue;
            }
            
            // Calcul du score basé sur le potentiel réel
            let score = 0;
            
            if (playerCount === length) {
                // Victoire !
                score = 100000;
            } else if (playerCount === length - 1 && emptyCount === 1) {
                // Menace de victoire directe
                score = 10000;
            } else if (playerCount === length - 2 && emptyCount === 2) {
                // Menace à 1 coup
                score = 1000;
            } else if (playerCount >= 2) {
                // Séquence prometteuse
                score = Math.pow(10, playerCount) * emptyCount;
            } else {
                // Un seul pion, score minimal
                score = emptyCount * 2;
            }
            
            maxScore = Math.max(maxScore, score);
        }
        
        return maxScore;
    }
    
    /**
     * Évalue le contrôle du centre du plateau
     * @returns {number} Score de contrôle du centre
     */
    evaluateCenterControl() {
        let score = 0;
        const center = Math.floor(this.BOARD_SIZE / 2);
        
        // Évalue une zone autour du centre
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const x = center + dx;
                const y = center + dy;
                
                if (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const weight = Math.max(0, 6 - distance);
                    
                    if (this.board[y][x] === this.PLAYERS.AI) {
                        score += weight * 5;
                    } else if (this.board[y][x] === this.PLAYERS.HUMAN) {
                        score -= weight * 5;
                    }
                }
            }
        }
        
        return score;
    }
    
    /**
     * Génère un hash du plateau pour la table de transposition
     * @returns {string} Hash du plateau
     */
    getBoardHash() {
        let hash = '';
        
        // Hash seulement la zone active pour optimiser
        const activeCells = this.getActiveCells();
        
        // Trie les cellules pour avoir un hash cohérent
        activeCells.sort((a, b) => a.y * this.BOARD_SIZE + a.x - (b.y * this.BOARD_SIZE + b.x));
        
        for (const cell of activeCells) {
            hash += `${cell.x},${cell.y}:${this.board[cell.y][cell.x]};`;
        }
        
        return hash;
    }
    
    /**
     * Nettoie la table de transposition si elle devient trop grande
     */
    cleanTranspositionTable() {
        if (this.transpositionTable.size > 10000) {
            this.transpositionTable.clear();
        }
    }
}