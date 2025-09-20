/**
 * Classe de base pour toutes les intelligences artificielles
 * Contient les méthodes communes et utilitaires partagées
 */
class AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        this.board = board;
        this.BOARD_SIZE = boardSize;
        this.WIN_LENGTH = winLength;
        this.CELL_SIZE = cellSize;
        this.PLAYERS = players;
    }
    
    /**
     * Méthode abstraite à implémenter par chaque IA
     * @returns {Object} {x, y} - Position du coup à jouer
     */
    getMove() {
        throw new Error('getMove() doit être implémentée par la classe dérivée');
    }
    
    /**
     * Trouve toutes les cases vides près des cases occupées
     * @param {number} maxMoves - Nombre maximum de mouvements à retourner
     * @returns {Array} Liste des mouvements possibles
     */
    getPossibleMoves(maxMoves = 20) {
        const moves = [];
        const occupiedCells = [];
        
        // Trouve toutes les cases occupées
        for (let y = 0; y < this.BOARD_SIZE; y++) {
            for (let x = 0; x < this.BOARD_SIZE; x++) {
                if (this.board[y][x] !== 0) {
                    occupiedCells.push({ x, y });
                }
            }
        }
        
        // Si aucune case n'est occupée, commence au centre
        if (occupiedCells.length === 0) {
            return [{ x: Math.floor(this.BOARD_SIZE / 2), y: Math.floor(this.BOARD_SIZE / 2) }];
        }
        
        // Trouve les cases vides près des cases occupées
        const nearbyMoves = new Set();
        
        for (const cell of occupiedCells) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const x = cell.x + dx;
                    const y = cell.y + dy;
                    
                    if (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE && this.board[y][x] === 0) {
                        nearbyMoves.add(`${x},${y}`);
                    }
                }
            }
        }
        
        // Convertit en tableau et limite le nombre de mouvements
        return Array.from(nearbyMoves).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return { x, y };
        }).slice(0, maxMoves);
    }
    
    /**
     * Vérifie si un mouvement est valide
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean} True si le mouvement est valide
     */
    isValidMove(x, y) {
        return x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE && this.board[y][x] === 0;
    }
    
    /**
     * Vérifie s'il y a un gagnant à la position donnée
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number|null} Le joueur gagnant ou null
     */
    checkWinner(x, y) {
        const player = this.board[y][x];
        if (player === 0) return null;
        
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            let count = 1;
            
            // Compte dans une direction
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x + i * dx;
                const ny = y + i * dy;
                if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE && this.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // Compte dans l'autre direction
            for (let i = 1; i < this.WIN_LENGTH; i++) {
                const nx = x - i * dx;
                const ny = y - i * dy;
                if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE && this.board[ny][nx] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= this.WIN_LENGTH) {
                return player;
            }
        }
        
        return null;
    }
    
    /**
     * Trouve un coup gagnant immédiat pour un joueur
     * @param {number} player - Le joueur (PLAYERS.AI ou PLAYERS.HUMAN)
     * @returns {Object|null} Position du coup gagnant ou null
     */
    findWinningMove(player) {
        const moves = this.getPossibleMoves(30);
        
        for (const move of moves) {
            this.board[move.y][move.x] = player;
            if (this.checkWinner(move.x, move.y) === player) {
                this.board[move.y][move.x] = 0;
                return move;
            }
            this.board[move.y][move.x] = 0;
        }
        
        return null;
    }
    
    /**
     * Évalue une position pour un joueur donné
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} player - Le joueur
     * @returns {number} Score de la position
     */
    evaluatePosition(x, y, player) {
        let score = 0;
        
        // Évalue dans toutes les directions
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];
        
        for (const [dx, dy] of directions) {
            score += this.evaluateDirection(x, y, dx, dy, player);
        }
        
        return score;
    }
    
    /**
     * Évalue une direction spécifique pour un joueur
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} player - Le joueur
     * @returns {number} Score pour cette direction
     */
    evaluateDirection(x, y, dx, dy, player) {
        let score = 0;
        
        // Évalue différentes longueurs de séquences
        for (let length = 2; length <= this.WIN_LENGTH; length++) {
            const sequences = this.findSequencesInDirection(x, y, dx, dy, length);
            
            for (const seq of sequences) {
                let playerCount = 0;
                let opponentCount = 0;
                let emptyCount = 0;
                
                for (const pos of seq) {
                    if (pos.x < 0 || pos.x >= this.BOARD_SIZE || pos.y < 0 || pos.y >= this.BOARD_SIZE) {
                        break; // Séquence sort du plateau
                    }
                    
                    const cell = this.board[pos.y][pos.x];
                    if (cell === player) {
                        playerCount++;
                    } else if (cell === 0) {
                        emptyCount++;
                    } else {
                        opponentCount++;
                        break; // Séquence bloquée par l'adversaire
                    }
                }
                
                // Score basé sur le nombre de pions du joueur et d'espaces libres
                if (opponentCount === 0 && playerCount + emptyCount === length) {
                    score += Math.pow(10, playerCount) * length;
                    
                    // Bonus spécial pour les séquences près de la victoire
                    if (playerCount === length - 1) {
                        score += 1000; // Presque gagné !
                    } else if (playerCount === length - 2) {
                        score += 100; // Bon potentiel
                    }
                }
            }
        }
        
        return score;
    }
    
    /**
     * Trouve toutes les séquences possibles dans une direction
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} dx - Direction X
     * @param {number} dy - Direction Y
     * @param {number} length - Longueur de la séquence
     * @returns {Array} Liste des séquences
     */
    findSequencesInDirection(x, y, dx, dy, length) {
        const sequences = [];
        
        // Génère toutes les séquences possibles de la longueur donnée
        // qui incluent la position (x, y)
        for (let start = 0; start < length; start++) {
            const sequence = [];
            for (let i = 0; i < length; i++) {
                const pos = {
                    x: x + (i - start) * dx,
                    y: y + (i - start) * dy
                };
                sequence.push(pos);
            }
            sequences.push(sequence);
        }
        
        return sequences;
    }
    
    /**
     * Calcule un bonus de proximité pour une position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Bonus de proximité
     */
    calculateProximityBonus(x, y) {
        let bonus = 0;
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.BOARD_SIZE && ny >= 0 && ny < this.BOARD_SIZE && this.board[ny][nx] !== 0) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    bonus += Math.max(0, 10 - distance * 2);
                }
            }
        }
        
        return bonus;
    }
    
    /**
     * Calcule la distance depuis le centre du plateau
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {number} Distance du centre
     */
    distanceFromCenter(x, y) {
        const centerX = this.BOARD_SIZE / 2;
        const centerY = this.BOARD_SIZE / 2;
        return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    }
}