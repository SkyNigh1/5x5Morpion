/**
 * IA Moyenne - Stratégies tactiques avancées avec 5 niveaux de décision
 */
class AIMedium extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);
    }
    
    /**
     * Retourne le meilleur mouvement basé sur une analyse tactique
     * @returns {Object} {x, y} - Position du coup à jouer
     */
    getMove() {
        // Niveau 1: Gagner immédiatement si possible
        const winMove = this.findWinningMove(this.PLAYERS.AI);
        if (winMove) {
            return winMove;
        }
        
        // Niveau 2: Bloquer le joueur s'il peut gagner
        const blockMove = this.findWinningMove(this.PLAYERS.HUMAN);
        if (blockMove) {
            return blockMove;
        }
        
        // Niveau 3: Créer une menace de victoire (4 en ligne avec une extrémité libre)
        const threatMove = this.createThreat();
        if (threatMove) {
            return threatMove;
        }
        
        // Niveau 4: Construire des séquences stratégiques
        const buildMove = this.buildSequence();
        if (buildMove) {
            return buildMove;
        }
        
        // Niveau 5: Mouvement tactique optimal
        return this.getBestTacticalMove();
    }
    
    /**
     * Tente de créer une menace de victoire
     * @returns {Object|null} Position de la menace ou null
     */
    createThreat() {
        const moves = this.getPossibleMoves(25);
        
        for (const move of moves) {
            this.board[move.y][move.x] = this.PLAYERS.AI;
            
            // Vérifie si ce mouvement crée une menace de victoire
            if (this.createsThreat(move.x, move.y)) {
                this.board[move.y][move.x] = 0;
                return move;
            }
            
            this.board[move.y][move.x] = 0;
        }
        
        return null;
    }
    
    /**
     * Vérifie si une position crée une menace de victoire
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean} True si cela crée une menace
     */
    createsThreat(x, y) {
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            if (this.checkThreatInDirection(x, y, dx, dy)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Vérifie une menace dans une direction spécifique
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {boolean} True s'il y a une menace
     */
    checkThreatInDirection(x, y, dx, dy) {
        let count = 1;
        let openEnds = 0;
        
        // Compte dans la direction positive
        let i = 1;
        while (true) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            
            if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
            
            if (this.board[ny][nx] === this.PLAYERS.AI) {
                count++;
                i++;
            } else if (this.board[ny][nx] === 0) {
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Compte dans la direction négative
        i = 1;
        while (true) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            
            if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
            
            if (this.board[ny][nx] === this.PLAYERS.AI) {
                count++;
                i++;
            } else if (this.board[ny][nx] === 0) {
                openEnds++;
                break;
            } else {
                break;
            }
        }
        
        // Une menace est créée si on a 4 pions alignés avec au moins une extrémité libre
        return count >= 4 && openEnds >= 1;
    }
    
    /**
     * Construit des séquences stratégiques
     * @returns {Object|null} Meilleur mouvement de construction ou null
     */
    buildSequence() {
        const moves = this.getPossibleMoves(20);
        let bestMove = null;
        let bestScore = -1;
        
        for (const move of moves) {
            const score = this.evaluateSequenceBuilding(move.x, move.y);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestScore > 50 ? bestMove : null;
    }
    
    /**
     * Évalue la qualité de construction de séquence d'un mouvement
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score de construction
     */
    evaluateSequenceBuilding(x, y) {
        this.board[y][x] = this.PLAYERS.AI;
        
        let score = 0;
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            score += this.evaluateSequenceInDirection(x, y, dx, dy);
        }
        
        this.board[y][x] = 0;
        return score;
    }
    
    /**
     * Évalue une séquence dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {number} Score de la séquence
     */
    evaluateSequenceInDirection(x, y, dx, dy) {
        let score = 0;
        
        // Évalue différentes longueurs de séquences possibles
        for (let length = 3; length <= this.WIN_LENGTH; length++) {
            const sequences = this.findSequencesInDirection(x, y, dx, dy, length);
            
            for (const seq of sequences) {
                let aiCount = 0;
                let humanCount = 0;
                let emptyCount = 0;
                
                for (const pos of seq) {
                    if (pos.x < 0 || pos.x >= this.BOARD_SIZE || pos.y < 0 || pos.y >= this.BOARD_SIZE) {
                        break;
                    }
                    
                    const cell = this.board[pos.y][pos.x];
                    if (cell === this.PLAYERS.AI) {
                        aiCount++;
                    } else if (cell === this.PLAYERS.HUMAN) {
                        humanCount++;
                    } else {
                        emptyCount++;
                    }
                }
                
                // Score seulement si la séquence n'est pas bloquée par l'humain
                if (humanCount === 0 && aiCount > 0) {
                    score += Math.pow(aiCount, 3) * (length - aiCount + 1);
                    
                    // Bonus pour les séquences avec plusieurs espaces libres
                    if (emptyCount >= 2) {
                        score += emptyCount * 5;
                    }
                }
            }
        }
        
        return score;
    }
    
    /**
     * Retourne le meilleur mouvement tactique
     * @returns {Object} Position du meilleur mouvement
     */
    getBestTacticalMove() {
        const moves = this.getPossibleMoves(20);
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            let score = this.evaluatePosition(move.x, move.y, this.PLAYERS.AI);
            
            // Bonus pour la proximité avec d'autres pions
            score += this.calculateProximityBonus(move.x, move.y);
            
            // Malus léger pour s'éloigner du centre
            const centerDistance = this.distanceFromCenter(move.x, move.y);
            score -= centerDistance * 0.5;
            
            // Bonus pour les positions défensives
            score += this.evaluateDefensiveValue(move.x, move.y);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove || { 
            x: Math.floor(this.BOARD_SIZE / 2), 
            y: Math.floor(this.BOARD_SIZE / 2) 
        };
    }
    
    /**
     * Évalue la valeur défensive d'une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score défensif
     */
    evaluateDefensiveValue(x, y) {
        this.board[y][x] = this.PLAYERS.AI;
        
        let defensiveScore = 0;
        const moves = this.getPossibleMoves(10);
        
        for (const move of moves) {
            // Vérifie si ce mouvement empêche l'adversaire de créer des menaces
            this.board[move.y][move.x] = this.PLAYERS.HUMAN;
            
            if (this.createsThreat(move.x, move.y)) {
                defensiveScore += 30; // Bonus pour bloquer une menace potentielle
            }
            
            this.board[move.y][move.x] = 0;
        }
        
        this.board[y][x] = 0;
        return defensiveScore;
    }
}