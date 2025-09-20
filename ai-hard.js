/**
 * IA Difficile - Évaluation de position avancée avec analyse stratégique
 */
class AIHard extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);
    }
    
    /**
     * Retourne le meilleur mouvement basé sur une évaluation de position avancée
     * @returns {Object} {x, y} - Position du coup à jouer
     */
    getMove() {
        // Vérifier d'abord les coups critiques
        const winMove = this.findWinningMove(this.PLAYERS.AI);
        if (winMove) return winMove;
        
        const blockMove = this.findWinningMove(this.PLAYERS.HUMAN);
        if (blockMove) return blockMove;
        
        // Analyse complète des positions
        return this.findBestPosition();
    }
    
    /**
     * Trouve la meilleure position en évaluant toutes les possibilités
     * @returns {Object} Position optimale
     */
    findBestPosition() {
        const moves = this.getPossibleMoves(25);
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            const score = this.evaluateMove(move.x, move.y);
            
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
     * Évalue un mouvement de manière complète
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score total du mouvement
     */
    evaluateMove(x, y) {
        this.board[y][x] = this.PLAYERS.AI;
        
        let score = 0;
        
        // 1. Évaluation offensive
        score += this.evaluateOffensive(x, y) * 1.2;
        
        // 2. Évaluation défensive
        score += this.evaluateDefensive(x, y) * 1.0;
        
        // 3. Contrôle territorial
        score += this.evaluateTerritorialControl(x, y) * 0.8;
        
        // 4. Potentiel futur
        score += this.evaluateFuturePotential(x, y) * 0.6;
        
        // 5. Position stratégique
        score += this.evaluateStrategicPosition(x, y) * 0.4;
        
        this.board[y][x] = 0;
        return score;
    }
    
    /**
     * Évalue le potentiel offensif d'une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score offensif
     */
    evaluateOffensive(x, y) {
        let score = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            score += this.evaluateDirectionOffensive(x, y, dx, dy);
        }
        
        // Bonus pour les positions qui créent plusieurs menaces
        const threats = this.countThreats(x, y, this.PLAYERS.AI);
        if (threats >= 2) {
            score += threats * 500; // Double menace = très fort
        }
        
        return score;
    }
    
    /**
     * Évalue l'offensive dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {number} Score directionnel offensif
     */
    evaluateDirectionOffensive(x, y, dx, dy) {
        let score = 0;
        
        for (let length = 2; length <= this.WIN_LENGTH; length++) {
            const patterns = this.analyzePatterns(x, y, dx, dy, length, this.PLAYERS.AI);
            
            for (const pattern of patterns) {
                if (pattern.blocked === 0) { // Pas bloqué par l'adversaire
                    const multiplier = Math.pow(4, pattern.friendlyCount);
                    score += multiplier * pattern.openSpaces;
                    
                    // Bonus spécial pour les séquences presque gagnantes
                    if (pattern.friendlyCount === length - 1) {
                        score += 2000;
                    } else if (pattern.friendlyCount === length - 2) {
                        score += 400;
                    }
                }
            }
        }
        
        return score;
    }
    
    /**
     * Évalue le potentiel défensif d'une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score défensif
     */
    evaluateDefensive(x, y) {
        let score = 0;
        
        // Simule le coup de l'adversaire pour voir ce qu'on bloque
        this.board[y][x] = this.PLAYERS.HUMAN;
        
        const humanThreats = this.countThreats(x, y, this.PLAYERS.HUMAN);
        score += humanThreats * 300; // Bonus pour bloquer des menaces
        
        // Analyse les séquences de l'adversaire qu'on interrompt
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            score += this.evaluateDefensiveDirection(x, y, dx, dy);
        }
        
        this.board[y][x] = this.PLAYERS.AI; // Remet notre pion
        return score;
    }
    
    /**
     * Évalue la défense dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {number} Score défensif directionnel
     */
    evaluateDefensiveDirection(x, y, dx, dy) {
        let score = 0;
        
        for (let length = 3; length <= this.WIN_LENGTH; length++) {
            const patterns = this.analyzePatterns(x, y, dx, dy, length, this.PLAYERS.HUMAN);
            
            for (const pattern of patterns) {
                if (pattern.friendlyCount >= 2) {
                    // On bloque une séquence de l'adversaire
                    score += pattern.friendlyCount * 150;
                    
                    if (pattern.friendlyCount === length - 1) {
                        score += 1000; // Bloque une victoire imminente
                    }
                }
            }
        }
        
        return score;
    }
    
    /**
     * Évalue le contrôle territorial
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score territorial
     */
    evaluateTerritorialControl(x, y) {
        let score = 0;
        
        // Compte le nombre de cases contrôlées dans un rayon
        for (let radius = 1; radius <= 3; radius++) {
            let controlledCells = 0;
            let totalCells = 0;
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                        totalCells++;
                        if (this.board[ny][nx] === this.PLAYERS.AI) {
                            controlledCells++;
                        }
                    }
                }
            }
            
            if (totalCells > 0) {
                const controlRatio = controlledCells / totalCells;
                score += controlRatio * 50 / radius;
            }
        }
        
        return score;
    }
    
    /**
     * Évalue le potentiel futur d'une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score de potentiel
     */
    evaluateFuturePotential(x, y) {
        let score = 0;
        
        // Analyse combien de lignes de victoire potentielles passent par cette case
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            score += this.countPotentialWinLines(x, y, dx, dy);
        }
        
        // Bonus pour les positions qui ouvrent plusieurs possibilités
        const openDirections = this.countOpenDirections(x, y);
        score += openDirections * 20;
        
        return score;
    }
    
    /**
     * Compte les lignes de victoire potentielles dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @returns {number} Nombre de lignes potentielles
     */
    countPotentialWinLines(x, y, dx, dy) {
        let count = 0;
        
        // Vérifie toutes les positions possibles d'une ligne de victoire
        // qui passerait par cette case
        for (let start = 0; start < this.WIN_LENGTH; start++) {
            let valid = true;
            let hasSpace = false;
            
            for (let i = 0; i < this.WIN_LENGTH; i++) {
                const nx = x + (i - start) * dx;
                const ny = y + (i - start) * dy;
                
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) {
                    valid = false;
                    break;
                }
                
                const cell = this.board[ny][nx];
                if (cell === this.PLAYERS.HUMAN) {
                    valid = false;
                    break;
                }
                
                if (cell === 0) {
                    hasSpace = true;
                }
            }
            
            if (valid && hasSpace) {
                count++;
            }
        }
        
        return count * 25;
    }
    
    /**
     * Compte le nombre de directions ouvertes depuis une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Nombre de directions ouvertes
     */
    countOpenDirections(x, y) {
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        let openCount = 0;
        
        for (const [dx, dy] of directions) {
            let openInDirection = false;
            
            // Vérifie dans les deux sens
            for (const multiplier of [1, -1]) {
                for (let i = 1; i <= 3; i++) {
                    const nx = x + i * dx * multiplier;
                    const ny = y + i * dy * multiplier;
                    
                    if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                        if (this.board[ny][nx] === 0) {
                            openInDirection = true;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            
            if (openInDirection) {
                openCount++;
            }
        }
        
        return openCount;
    }
    
    /**
     * Évalue la position stratégique
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Score stratégique
     */
    evaluateStrategicPosition(x, y) {
        let score = 0;
        
        // Bonus pour le centre du plateau
        const centerDistance = this.distanceFromCenter(x, y);
        score += Math.max(0, 50 - centerDistance);
        
        // Bonus pour la connectivité
        score += this.calculateProximityBonus(x, y);
        
        // Malus pour les positions isolées
        if (this.isIsolated(x, y)) {
            score -= 100;
        }
        
        return score;
    }
    
    /**
     * Vérifie si une position est isolée
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean} True si isolée
     */
    isIsolated(x, y) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE) {
                    if (this.board[ny][nx] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    /**
     * Analyse les motifs dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} length - Longueur à analyser
     * @param {number} player - Joueur à analyser
     * @returns {Array} Liste des motifs trouvés
     */
    analyzePatterns(x, y, dx, dy, length, player) {
        const patterns = [];
        
        for (let start = 0; start < length; start++) {
            let friendlyCount = 0;
            let openSpaces = 0;
            let blocked = 0;
            
            for (let i = 0; i < length; i++) {
                const nx = x + (i - start) * dx;
                const ny = y + (i - start) * dy;
                
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) {
                    blocked++;
                    continue;
                }
                
                const cell = this.board[ny][nx];
                if (cell === player) {
                    friendlyCount++;
                } else if (cell === 0) {
                    openSpaces++;
                } else {
                    blocked++;
                }
            }
            
            patterns.push({
                friendlyCount,
                openSpaces,
                blocked
            });
        }
        
        return patterns;
    }
    
    /**
     * Compte le nombre de menaces créées par une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} player - Joueur
     * @returns {number} Nombre de menaces
     */
    countThreats(x, y, player) {
        let threats = 0;
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        
        for (const [dx, dy] of directions) {
            if (this.isThreatInDirection(x, y, dx, dy, player)) {
                threats++;
            }
        }
        
        return threats;
    }
    
    /**
     * Vérifie s'il y a une menace dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Joueur
     * @returns {boolean} True s'il y a une menace
     */
    isThreatInDirection(x, y, dx, dy, player) {
        let count = 1;
        let openEnds = 0;
        
        // Compte dans les deux directions
        for (const multiplier of [1, -1]) {
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i * dx * multiplier;
                const ny = y + i * dy * multiplier;
                
                if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) break;
                
                if (this.board[ny][nx] === player) {
                    count++;
                } else if (this.board[ny][nx] === 0) {
                    openEnds++;
                    break;
                } else {
                    break;
                }
            }
        }
        
        return count >= 3 && openEnds >= 1;
    }
}