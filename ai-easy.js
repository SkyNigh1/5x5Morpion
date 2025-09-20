/**
 * IA Facile - Mouvements aléatoires avec une préférence pour les zones actives
 */
class AIEasy extends AIBase {
    constructor(board, boardSize, winLength, cellSize, players) {
        super(board, boardSize, winLength, cellSize, players);
    }
    
    /**
     * Retourne un mouvement aléatoire près des pions existants
     * @returns {Object} {x, y} - Position du coup à jouer
     */
    getMove() {
        const possibleMoves = this.getPossibleMoves(15);
        
        if (possibleMoves.length === 0) {
            // Si aucun mouvement n'est disponible, jouer au centre
            return { 
                x: Math.floor(this.BOARD_SIZE / 2), 
                y: Math.floor(this.BOARD_SIZE / 2) 
            };
        }
        
        // Sélectionne un mouvement aléatoire parmi les possibilités
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        return possibleMoves[randomIndex];
    }
}