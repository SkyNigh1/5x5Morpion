// Configuration du jeu
const BOARD_SIZE = 100;
const WIN_LENGTH = 5;
const CELL_SIZE = 30;

// États du jeu
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Joueurs
const PLAYERS = {
    HUMAN: 1,
    AI: 2
};

// Niveaux de difficulté
const DIFFICULTY_LEVELS = {
    easy: { name: 'Facile', searchDepth: 1 },
    medium: { name: 'Moyen', searchDepth: 2 },
    hard: { name: 'Difficile', searchDepth: 3 },
    elite: { name: 'Elite', searchDepth: 4 }
};

class SuperMorpionGame {
    constructor() {
        this.gameState = GAME_STATES.MENU;
        this.currentPlayer = PLAYERS.HUMAN;
        this.difficulty = 'medium';
        this.board = [];
        this.moveCount = 0;
        this.gameStartTime = 0;
        this.gameHistory = [];
        this.gameStats = {
            winner: null,
            totalMoves: 0,
            humanMoves: 0,
            aiMoves: 0,
            gameTime: 0,
            winningSequence: null
        };
        
        // Viewport et caméra (sera recalculé dans resizeCanvas)
        this.viewport = {
            x: 40, // Position centrale au démarrage
            y: 40,
            width: 20, // Valeur temporaire, sera recalculée
            height: 20 // Valeur temporaire, sera recalculée
        };
        
        this.canvas = null;
        this.ctx = null;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        this.initializeBoard();
        this.setupEventListeners();
        this.setupCanvas();
    }
    
    initializeBoard() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
        this.moveCount = 0;
        this.currentPlayer = PLAYERS.HUMAN;
        this.gameHistory = [];
        this.gameStats = {
            winner: null,
            totalMoves: 0,
            humanMoves: 0,
            aiMoves: 0,
            gameTime: 0,
            winningSequence: null
        };
    }
    
    setupEventListeners() {
        // Boutons de difficulté
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.difficulty = e.currentTarget.dataset.level;
                this.startGame();
            });
        });
        
        // Boutons de contrôle
        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.showScreen('menu');
        });
        
        document.getElementById('restart-game').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('play-again').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('change-difficulty').addEventListener('click', () => {
            this.showScreen('menu');
        });
        
        document.getElementById('copy-history').addEventListener('click', () => {
            this.copyGameHistory();
        });
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Événements de souris pour le déplacement
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Prévenir le menu contextuel
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    resizeCanvas() {
        const viewport = document.getElementById('game-viewport');
        this.canvas.width = viewport.clientWidth;
        this.canvas.height = viewport.clientHeight;
        
        // Recalcule le viewport en fonction de la taille réelle du canvas
        this.viewport.width = Math.floor(this.canvas.width / CELL_SIZE);
        this.viewport.height = Math.floor(this.canvas.height / CELL_SIZE);
        
        // S'assure que le viewport ne dépasse pas les limites du plateau
        this.viewport.width = Math.min(this.viewport.width, BOARD_SIZE);
        this.viewport.height = Math.min(this.viewport.height, BOARD_SIZE);
        
        // Ajuste la position si nécessaire
        this.viewport.x = Math.max(0, Math.min(BOARD_SIZE - this.viewport.width, this.viewport.x));
        this.viewport.y = Math.max(0, Math.min(BOARD_SIZE - this.viewport.height, this.viewport.y));
        
        // Debug pour comprendre les dimensions
        console.log('Canvas resize:', {
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            viewportWidth: this.viewport.width,
            viewportHeight: this.viewport.height,
            cellSize: CELL_SIZE
        });
        
        this.draw();
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.lastMousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.isDragging = true;
        document.getElementById('game-viewport').classList.add('dragging');
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const deltaX = (currentPos.x - this.lastMousePos.x) / CELL_SIZE;
        const deltaY = (currentPos.y - this.lastMousePos.y) / CELL_SIZE;
        
        this.viewport.x = Math.max(0, Math.min(BOARD_SIZE - this.viewport.width, this.viewport.x - deltaX));
        this.viewport.y = Math.max(0, Math.min(BOARD_SIZE - this.viewport.height, this.viewport.y - deltaY));
        
        this.lastMousePos = currentPos;
        this.updateViewportDisplay();
        this.draw();
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        document.getElementById('game-viewport').classList.remove('dragging');
    }
    
    onCanvasClick(e) {
        if (this.isDragging || this.currentPlayer !== PLAYERS.HUMAN || this.gameState !== GAME_STATES.PLAYING) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const boardX = Math.floor(this.viewport.x + x / CELL_SIZE);
        const boardY = Math.floor(this.viewport.y + y / CELL_SIZE);
        
        if (this.isValidMove(boardX, boardY)) {
            this.makeMove(boardX, boardY, PLAYERS.HUMAN);
        }
    }
    
    isValidMove(x, y) {
        return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE && this.board[y][x] === 0;
    }
    
    makeMove(x, y, player) {
        const moveTime = Date.now();
        const timeFromStart = moveTime - this.gameStartTime;
        
        // Enregistrer le coup dans l'historique
        this.gameHistory.push({
            move: this.moveCount + 1,
            player: player,
            playerName: player === PLAYERS.HUMAN ? 'Joueur' : 'IA',
            x: x,
            y: y,
            timestamp: moveTime,
            timeFromStart: timeFromStart,
            boardState: this.board.map(row => [...row]) // Copie profonde
        });
        
        this.board[y][x] = player;
        this.moveCount++;
        
        // Mettre à jour les statistiques
        this.gameStats.totalMoves = this.moveCount;
        if (player === PLAYERS.HUMAN) {
            this.gameStats.humanMoves++;
        } else {
            this.gameStats.aiMoves++;
        }
        
        this.draw();
        
        const winResult = this.checkWinnerWithSequence(x, y);
        if (winResult) {
            this.gameStats.winner = winResult.player;
            this.gameStats.gameTime = moveTime - this.gameStartTime;
            
            // Lance l'animation de la ligne gagnante
            this.animateWinningLine(winResult, () => {
                this.endGame(winResult.player);
            });
            return;
        }
        
        // Changer de joueur
        this.currentPlayer = this.currentPlayer === PLAYERS.HUMAN ? PLAYERS.AI : PLAYERS.HUMAN;
        this.updateGameInfo();
        
        // Si c'est le tour de l'IA
        if (this.currentPlayer === PLAYERS.AI) {
            setTimeout(() => this.aiMove(), 500);
        }
    }
    
    aiMove() {
        const move = this.getBestMove();
        if (move) {
            this.makeMove(move.x, move.y, PLAYERS.AI);
        }
    }
    
    getBestMove() {
        // Créer l'instance de l'IA appropriée selon la difficulté
        let ai;
        
        switch (this.difficulty) {
            case 'easy':
                ai = new AIEasy(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
                break;
            case 'medium':
                ai = new AIMedium(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
                break;
            case 'hard':
                ai = new AIHard(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
                break;
            case 'elite':
                ai = new AIElite(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
                break;
            default:
                ai = new AIEasy(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
        }
        
        // Obtenir le meilleur mouvement de l'IA
        return ai.getMove();
    }

    checkWinner(x, y) {
        const result = this.checkWinnerWithSequence(x, y);
        return result ? result.player : null;
    }
    
    checkWinnerWithSequence(x, y) {
        const player = this.board[y][x];
        if (player === 0) return null;
        
        const directions = [
            { dx: 1, dy: 0, name: 'horizontal' },
            { dx: 0, dy: 1, name: 'vertical' },
            { dx: 1, dy: 1, name: 'diagonal-down' },
            { dx: 1, dy: -1, name: 'diagonal-up' }
        ];
        
        for (const direction of directions) {
            const { dx, dy } = direction;
            let count = 1;
            let sequence = [{ x, y }];
            
            // Compte dans une direction et collecte les positions
            for (let i = 1; i < WIN_LENGTH; i++) {
                const nx = x + i * dx;
                const ny = y + i * dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === player) {
                    count++;
                    sequence.push({ x: nx, y: ny });
                } else {
                    break;
                }
            }
            
            // Compte dans l'autre direction et collecte les positions
            for (let i = 1; i < WIN_LENGTH; i++) {
                const nx = x - i * dx;
                const ny = y - i * dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === player) {
                    count++;
                    sequence.unshift({ x: nx, y: ny }); // Ajoute au début
                } else {
                    break;
                }
            }
            
            if (count >= WIN_LENGTH) {
                // Trie la séquence et garde seulement les 5 premiers (au cas où il y en aurait plus)
                sequence.sort((a, b) => {
                    if (dx !== 0) return a.x - b.x;
                    if (dy !== 0) return a.y - b.y;
                    return 0;
                });
                sequence = sequence.slice(0, WIN_LENGTH);
                
                return {
                    player: player,
                    sequence: sequence,
                    direction: direction.name,
                    start: sequence[0],
                    end: sequence[sequence.length - 1]
                };
            }
        }
        
        return null;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessine la grille
        this.drawGrid();
        
        // Dessine les pions
        this.drawPieces();
        
        // Dessine les coordonnées
        this.drawCoordinates();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        
        const startX = Math.floor(this.viewport.x);
        const startY = Math.floor(this.viewport.y);
        const endX = Math.min(BOARD_SIZE, startX + this.viewport.width + 2);
        const endY = Math.min(BOARD_SIZE, startY + this.viewport.height + 2);
        
        // S'assure qu'on a au moins quelques lignes à dessiner
        if (this.viewport.width <= 0 || this.viewport.height <= 0) {
            console.warn('Viewport invalide:', this.viewport);
            return;
        }
        
        // Lignes verticales
        for (let x = startX; x <= endX; x++) {
            const canvasX = (x - this.viewport.x) * CELL_SIZE;
            if (canvasX >= 0 && canvasX <= this.canvas.width) {
                this.ctx.beginPath();
                this.ctx.moveTo(canvasX, 0);
                this.ctx.lineTo(canvasX, this.canvas.height);
                this.ctx.stroke();
            }
        }
        
        // Lignes horizontales
        for (let y = startY; y <= endY; y++) {
            const canvasY = (y - this.viewport.y) * CELL_SIZE;
            if (canvasY >= 0 && canvasY <= this.canvas.height) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, canvasY);
                this.ctx.lineTo(this.canvas.width, canvasY);
                this.ctx.stroke();
            }
        }
    }
    
    drawPieces() {
        const startX = Math.floor(this.viewport.x);
        const startY = Math.floor(this.viewport.y);
        const endX = Math.min(BOARD_SIZE, startX + this.viewport.width + 1);
        const endY = Math.min(BOARD_SIZE, startY + this.viewport.height + 1);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const piece = this.board[y][x];
                if (piece !== 0) {
                    const canvasX = (x - this.viewport.x) * CELL_SIZE + CELL_SIZE / 2;
                    const canvasY = (y - this.viewport.y) * CELL_SIZE + CELL_SIZE / 2;
                    
                    if (piece === PLAYERS.HUMAN) {
                        this.drawX(canvasX, canvasY);
                    } else {
                        this.drawO(canvasX, canvasY);
                    }
                }
            }
        }
    }
    
    drawX(x, y) {
        this.ctx.strokeStyle = '#3182ce';
        this.ctx.lineWidth = 3;
        const size = CELL_SIZE * 0.3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x - size, y - size);
        this.ctx.lineTo(x + size, y + size);
        this.ctx.moveTo(x + size, y - size);
        this.ctx.lineTo(x - size, y + size);
        this.ctx.stroke();
    }
    
    drawO(x, y) {
        this.ctx.strokeStyle = '#e53e3e';
        this.ctx.lineWidth = 3;
        const radius = CELL_SIZE * 0.3;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    drawCoordinates() {
        this.ctx.fillStyle = '#cbd5e0';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        
        const startX = Math.floor(this.viewport.x);
        const startY = Math.floor(this.viewport.y);
        
        // Coordonnées X en haut
        for (let x = startX; x < startX + this.viewport.width && x < BOARD_SIZE; x += 5) {
            const canvasX = (x - this.viewport.x) * CELL_SIZE + CELL_SIZE / 2;
            this.ctx.fillText(x.toString(), canvasX, 12);
        }
        
        // Coordonnées Y à gauche
        this.ctx.textAlign = 'left';
        for (let y = startY; y < startY + this.viewport.height && y < BOARD_SIZE; y += 5) {
            const canvasY = (y - this.viewport.y) * CELL_SIZE + CELL_SIZE / 2;
            this.ctx.fillText(y.toString(), 2, canvasY + 3);
        }
    }
    
    animateWinningLine(winResult, callback) {
        if (!winResult || !winResult.sequence) {
            callback();
            return;
        }
        
        const sequence = winResult.sequence;
        const player = winResult.player;
        
        // Convertit les coordonnées du plateau en coordonnées canvas
        const canvasSequence = sequence.map(pos => ({
            x: (pos.x - this.viewport.x) * CELL_SIZE + CELL_SIZE / 2,
            y: (pos.y - this.viewport.y) * CELL_SIZE + CELL_SIZE / 2
        }));
        
        // Vérifie que la séquence est visible dans le viewport
        const isVisible = canvasSequence.every(pos => 
            pos.x >= 0 && pos.x <= this.canvas.width && 
            pos.y >= 0 && pos.y <= this.canvas.height
        );
        
        if (!isVisible) {
            // Centre le viewport sur la séquence gagnante
            const centerX = sequence.reduce((sum, pos) => sum + pos.x, 0) / sequence.length;
            const centerY = sequence.reduce((sum, pos) => sum + pos.y, 0) / sequence.length;
            
            this.viewport.x = Math.max(0, Math.min(BOARD_SIZE - this.viewport.width, centerX - this.viewport.width / 2));
            this.viewport.y = Math.max(0, Math.min(BOARD_SIZE - this.viewport.height, centerY - this.viewport.height / 2));
            
            this.draw();
            
            // Recalcule les coordonnées canvas après le recentrage
            canvasSequence.forEach((pos, i) => {
                pos.x = (sequence[i].x - this.viewport.x) * CELL_SIZE + CELL_SIZE / 2;
                pos.y = (sequence[i].y - this.viewport.y) * CELL_SIZE + CELL_SIZE / 2;
            });
        }
        
        // Configuration de l'animation
        const animationDuration = 800; // 800ms
        const startTime = Date.now();
        
        // Couleur de la ligne selon le joueur
        const lineColor = player === PLAYERS.HUMAN ? '#3182ce' : '#e53e3e';
        const lineWidth = 6;
        const glowColor = player === PLAYERS.HUMAN ? '#4299e1' : '#f56565';
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            
            // Redessine le plateau
            this.draw();
            
            if (progress > 0) {
                // Calcule la position actuelle de la ligne
                const startPos = canvasSequence[0];
                const endPos = canvasSequence[canvasSequence.length - 1];
                
                const currentEndX = startPos.x + (endPos.x - startPos.x) * progress;
                const currentEndY = startPos.y + (endPos.y - startPos.y) * progress;
                
                // Dessine l'effet de lueur
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.strokeStyle = glowColor;
                this.ctx.lineWidth = lineWidth + 4;
                this.ctx.lineCap = 'round';
                this.ctx.globalAlpha = 0.5;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startPos.x, startPos.y);
                this.ctx.lineTo(currentEndX, currentEndY);
                this.ctx.stroke();
                
                this.ctx.restore();
                
                // Dessine la ligne principale
                this.ctx.save();
                this.ctx.strokeStyle = lineColor;
                this.ctx.lineWidth = lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.shadowColor = lineColor;
                this.ctx.shadowBlur = 10;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startPos.x, startPos.y);
                this.ctx.lineTo(currentEndX, currentEndY);
                this.ctx.stroke();
                
                this.ctx.restore();
                
                // Effet de particules sur les pions gagnants
                if (progress > 0.3) {
                    this.drawWinningPiecesEffect(canvasSequence, progress, player);
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation terminée, ajoute un effet final
                this.drawFinalWinEffect(canvasSequence, player);
                setTimeout(callback, 500);
            }
        };
        
        animate();
    }
    
    drawWinningPiecesEffect(canvasSequence, progress, player) {
        const effectProgress = (progress - 0.3) / 0.7; // Commence après 30% de l'animation
        
        canvasSequence.forEach((pos, index) => {
            if (effectProgress > index / canvasSequence.length) {
                this.ctx.save();
                
                // Effet de pulsation
                const pulseScale = 1 + Math.sin(Date.now() * 0.01 + index) * 0.1;
                const alpha = 0.6 + Math.sin(Date.now() * 0.008 + index) * 0.4;
                
                this.ctx.globalAlpha = alpha;
                this.ctx.translate(pos.x, pos.y);
                this.ctx.scale(pulseScale, pulseScale);
                
                // Cercle lumineux autour du pion
                const glowColor = player === PLAYERS.HUMAN ? '#4299e1' : '#f56565';
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, CELL_SIZE * 0.6);
                gradient.addColorStop(0, glowColor + '80');
                gradient.addColorStop(1, glowColor + '00');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, CELL_SIZE * 0.6, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        });
    }
    
    drawFinalWinEffect(canvasSequence, player) {
        // Effet final avec des étincelles
        const sparkles = 12;
        const color = player === PLAYERS.HUMAN ? '#4299e1' : '#f56565';
        
        for (let i = 0; i < sparkles; i++) {
            const angle = (i / sparkles) * Math.PI * 2;
            const distance = 40 + Math.random() * 20;
            
            canvasSequence.forEach(pos => {
                const sparkleX = pos.x + Math.cos(angle) * distance;
                const sparkleY = pos.y + Math.sin(angle) * distance;
                
                this.ctx.save();
                this.ctx.fillStyle = color;
                this.ctx.globalAlpha = 0.8;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, 2 + Math.random() * 3, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.restore();
            });
        }
    }
    
    updateViewportDisplay() {
        document.getElementById('viewport-coords').textContent = 
            `${Math.floor(this.viewport.x)}, ${Math.floor(this.viewport.y)}`;
    }
    
    updateGameInfo() {
        const playerText = this.currentPlayer === PLAYERS.HUMAN ? 'Tour du joueur' : 'Tour de l\'IA';
        document.getElementById('current-player').textContent = playerText;
        
        const difficultyText = `Difficulté: ${DIFFICULTY_LEVELS[this.difficulty].name}`;
        document.getElementById('difficulty-display').textContent = difficultyText;
    }
    
    startGame() {
        this.gameState = GAME_STATES.PLAYING;
        this.initializeBoard();
        this.gameStartTime = Date.now();
        this.showScreen('game');
        this.updateGameInfo();
        this.updateViewportDisplay();
        
        // Force un redimensionnement correct du canvas
        setTimeout(() => {
            this.resizeCanvas();
        }, 150);
    }
    
    restartGame() {
        this.initializeBoard();
        this.gameStartTime = Date.now();
        this.gameState = GAME_STATES.PLAYING;
        this.showScreen('game');
        this.updateGameInfo();
        this.draw();
    }
    
    endGame(winner) {
        this.gameState = GAME_STATES.GAME_OVER;
        
        const resultElement = document.getElementById('game-result');
        if (winner === PLAYERS.HUMAN) {
            resultElement.textContent = '🎉 Vous avez gagné !';
            resultElement.style.color = '#38a169';
        } else {
            resultElement.textContent = '😔 L\'IA a gagné !';
            resultElement.style.color = '#e53e3e';
        }
        
        // Statistiques
        document.getElementById('moves-count').textContent = this.moveCount;
        const gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        document.getElementById('game-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        setTimeout(() => this.showScreen('gameOver'), 1000);
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screenMap = {
            'menu': 'menu-screen',
            'game': 'game-screen',
            'gameOver': 'game-over-screen'
        };
        
        document.getElementById(screenMap[screenName]).classList.add('active');
        
        if (screenName === 'game') {
            setTimeout(() => this.resizeCanvas(), 100);
        }
    }
    
    generateGameHistoryText() {
        const difficulty = DIFFICULTY_LEVELS[this.difficulty];
        const gameTime = this.gameStats.gameTime;
        const minutes = Math.floor(gameTime / 60000);
        const seconds = Math.floor((gameTime % 60000) / 1000);
        
        let historyText = `🎮 SUPER MORPION - HISTORIQUE DE PARTIE\n`;
        historyText += `═══════════════════════════════════════\n\n`;
        
        // Informations générales
        historyText += `📊 INFORMATIONS GÉNÉRALES\n`;
        historyText += `─────────────────────────\n`;
        historyText += `Date: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
        historyText += `Niveau IA: ${difficulty.name} (Profondeur: ${difficulty.searchDepth})\n`;
        historyText += `Gagnant: ${this.gameStats.winner === PLAYERS.HUMAN ? '🏆 Joueur' : '🤖 IA'}\n`;
        historyText += `Durée de partie: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
        historyText += `Total des coups: ${this.gameStats.totalMoves}\n`;
        historyText += `Coups du joueur: ${this.gameStats.humanMoves}\n`;
        historyText += `Coups de l'IA: ${this.gameStats.aiMoves}\n\n`;
        
        // Statistiques détaillées
        historyText += `📈 STATISTIQUES DÉTAILLÉES\n`;
        historyText += `─────────────────────────\n`;
        if (this.gameHistory.length > 0) {
            const avgTimePerMove = gameTime / this.gameHistory.length;
            historyText += `Temps moyen par coup: ${(avgTimePerMove / 1000).toFixed(2)}s\n`;
            
            const humanMoves = this.gameHistory.filter(move => move.player === PLAYERS.HUMAN);
            const aiMoves = this.gameHistory.filter(move => move.player === PLAYERS.AI);
            
            if (humanMoves.length > 1) {
                const avgHumanTime = humanMoves.slice(1).reduce((sum, move, index) => {
                    return sum + (move.timeFromStart - humanMoves[index].timeFromStart);
                }, 0) / (humanMoves.length - 1);
                historyText += `Temps moyen joueur: ${(avgHumanTime / 1000).toFixed(2)}s\n`;
            }
            
            if (aiMoves.length > 0) {
                historyText += `Temps de réflexion IA: ~0.5s (constant)\n`;
            }
        }
        
        // Répartition des coups par zones
        const zones = this.analyzeMovesDistribution();
        historyText += `Répartition par zones:\n`;
        historyText += `  Centre (40-60): ${zones.center} coups\n`;
        historyText += `  Bords (0-20, 80-100): ${zones.edges} coups\n`;
        historyText += `  Milieu (20-40, 60-80): ${zones.middle} coups\n\n`;
        
        // Historique détaillé des coups
        historyText += `🎯 HISTORIQUE DÉTAILLÉ DES COUPS\n`;
        historyText += `─────────────────────────────────\n`;
        historyText += `N°  | Joueur | Position | Temps   | Cumul\n`;
        historyText += `────┼────────┼──────────┼─────────┼───────\n`;
        
        this.gameHistory.forEach((move, index) => {
            const playerIcon = move.player === PLAYERS.HUMAN ? '👤' : '🤖';
            const timeSeconds = (move.timeFromStart / 1000).toFixed(1);
            const position = `${move.x.toString().padStart(2, '0')},${move.y.toString().padStart(2, '0')}`;
            
            historyText += `${move.move.toString().padStart(3, ' ')} | ${playerIcon} ${move.playerName.padEnd(5, ' ')} | ${position.padEnd(8, ' ')} | ${timeSeconds.padStart(6, ' ')}s | ${timeSeconds.padStart(6, ' ')}s\n`;
        });
        
        historyText += `\n`;
        
        // Analyse stratégique
        historyText += `🧠 ANALYSE STRATÉGIQUE\n`;
        historyText += `──────────────────────\n`;
        const analysis = this.analyzeGameStrategy();
        historyText += analysis;
        
        historyText += `\n📋 Copié le ${new Date().toLocaleString('fr-FR')}\n`;
        historyText += `🔗 Super Morpion 100x100 - Alignez 5 pions\n`;
        
        return historyText;
    }
    
    analyzeMovesDistribution() {
        const zones = { center: 0, edges: 0, middle: 0 };
        
        this.gameHistory.forEach(move => {
            if (move.x >= 40 && move.x <= 60 && move.y >= 40 && move.y <= 60) {
                zones.center++;
            } else if (move.x <= 20 || move.x >= 80 || move.y <= 20 || move.y >= 80) {
                zones.edges++;
            } else {
                zones.middle++;
            }
        });
        
        return zones;
    }
    
    analyzeGameStrategy() {
        let analysis = '';
        
        const humanMoves = this.gameHistory.filter(move => move.player === PLAYERS.HUMAN);
        const aiMoves = this.gameHistory.filter(move => move.player === PLAYERS.AI);
        
        // Analyse des premiers coups
        if (this.gameHistory.length > 0) {
            const firstMove = this.gameHistory[0];
            analysis += `Premier coup: ${firstMove.playerName} en (${firstMove.x}, ${firstMove.y})\n`;
            
            if (firstMove.x >= 45 && firstMove.x <= 55 && firstMove.y >= 45 && firstMove.y <= 55) {
                analysis += `✓ Stratégie centrale adoptée\n`;
            } else {
                analysis += `⚠ Début excentré, stratégie risquée\n`;
            }
        }
        
        // Analyse de l'agressivité améliorée
        let humanConsecutive = 0;
        let aiConsecutive = 0;
        let totalProximity = 0;
        
        // Analyse des coups consécutifs du même joueur
        for (let i = 1; i < humanMoves.length; i++) {
            const current = humanMoves[i];
            const previous = humanMoves[i - 1];
            const distance = Math.sqrt(Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2));
            
            if (distance <= 3) {
                humanConsecutive++;
            }
            totalProximity += distance;
        }
        
        for (let i = 1; i < aiMoves.length; i++) {
            const current = aiMoves[i];
            const previous = aiMoves[i - 1];
            const distance = Math.sqrt(Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2));
            
            if (distance <= 3) {
                aiConsecutive++;
            }
        }
        
        // Calcul de l'agressivité basé sur la proximité des coups
        const humanAggressiveness = humanMoves.length > 1 ? (humanConsecutive / (humanMoves.length - 1)) * 100 : 0;
        const aiAggressiveness = aiMoves.length > 1 ? (aiConsecutive / (aiMoves.length - 1)) * 100 : 0;
        const avgDistance = humanMoves.length > 1 ? totalProximity / (humanMoves.length - 1) : 0;
        
        analysis += `Niveau d'agressivité joueur: ${humanAggressiveness.toFixed(1)}% (coups consécutifs proches)\n`;
        analysis += `Niveau d'agressivité IA: ${aiAggressiveness.toFixed(1)}%\n`;
        analysis += `Distance moyenne entre vos coups: ${avgDistance.toFixed(1)} cases\n`;
        
        // Analyse des patterns de jeu
        const playerPattern = this.analyzePlayerPattern(humanMoves);
        analysis += `\nPattern de jeu détecté: ${playerPattern.type}\n`;
        analysis += `${playerPattern.description}\n`;
        
        // Analyse de la séquence gagnante
        if (this.gameStats.winner) {
            const winningMove = this.gameHistory[this.gameHistory.length - 1];
            analysis += `\nCoup gagnant: ${winningMove.playerName} en (${winningMove.x}, ${winningMove.y})\n`;
            
            // Trouve la séquence gagnante
            const winResult = this.checkWinnerWithSequence(winningMove.x, winningMove.y);
            if (winResult) {
                analysis += `Séquence gagnante: ${winResult.direction} de (${winResult.start.x}, ${winResult.start.y}) à (${winResult.end.x}, ${winResult.end.y})\n`;
            }
        }
        
        // Conseils d'amélioration
        analysis += `\n💡 CONSEILS D'AMÉLIORATION:\n`;
        
        if (this.gameStats.winner === PLAYERS.AI) {
            analysis += `• L'IA a gagné - analysez ses patterns de jeu\n`;
            analysis += `• Essayez d'être plus agressif dans vos attaques\n`;
            analysis += `• Surveillez les alignements de 3-4 pions adverses\n`;
            
            if (aiAggressiveness > humanAggressiveness) {
                analysis += `• L'IA était plus agressive (${aiAggressiveness.toFixed(1)}% vs ${humanAggressiveness.toFixed(1)}%)\n`;
            }
        } else {
            analysis += `• Bonne victoire ! Continuez cette stratégie\n`;
            analysis += `• Tentez un niveau de difficulté supérieur\n`;
            
            if (this.difficulty !== 'elite') {
                const nextLevel = this.difficulty === 'easy' ? 'moyen' : 
                                this.difficulty === 'medium' ? 'difficile' : 'elite';
                analysis += `• Prêt pour le niveau ${nextLevel} ?\n`;
            }
        }
        
        if (humanAggressiveness < 30) {
            analysis += `• Vos coups sont trop dispersés (${humanAggressiveness.toFixed(1)}%), concentrez-vous\n`;
        } else if (humanAggressiveness > 70) {
            analysis += `• Excellente concentration (${humanAggressiveness.toFixed(1)}%), continuez !\n`;
        } else {
            analysis += `• Bon équilibre entre dispersion et concentration\n`;
        }
        
        if (avgDistance > 5) {
            analysis += `• Distance moyenne élevée (${avgDistance.toFixed(1)}), rapprochez vos coups\n`;
        } else if (avgDistance < 2) {
            analysis += `• Coups très proches (${avgDistance.toFixed(1)}), parfois variez\n`;
        }
        
        const avgTimePerMove = this.gameStats.gameTime / Math.max(1, this.gameStats.humanMoves);
        if (avgTimePerMove > 10000) {
            analysis += `• Vous réfléchissez longtemps (${(avgTimePerMove/1000).toFixed(1)}s), fiez-vous à votre instinct\n`;
        } else if (avgTimePerMove < 3000) {
            analysis += `• Coups rapides (${(avgTimePerMove/1000).toFixed(1)}s), prenez plus de temps pour analyser\n`;
        } else {
            analysis += `• Bon tempo de jeu (${(avgTimePerMove/1000).toFixed(1)}s par coup)\n`;
        }
        
        return analysis;
    }
    
    analyzePlayerPattern(moves) {
        if (moves.length < 3) {
            return { type: "Début de partie", description: "Pas assez de coups pour analyser" };
        }
        
        // Analyse des directions principales
        let horizontal = 0, vertical = 0, diagonal = 0;
        
        for (let i = 1; i < moves.length; i++) {
            const dx = Math.abs(moves[i].x - moves[i-1].x);
            const dy = Math.abs(moves[i].y - moves[i-1].y);
            
            if (dy === 0 && dx > 0) horizontal++;
            else if (dx === 0 && dy > 0) vertical++;
            else if (dx === dy && dx > 0) diagonal++;
        }
        
        const total = horizontal + vertical + diagonal;
        if (total === 0) {
            return { type: "Dispersé", description: "Coups sans pattern défini" };
        }
        
        const hPercent = (horizontal / total) * 100;
        const vPercent = (vertical / total) * 100;
        const dPercent = (diagonal / total) * 100;
        
        if (hPercent > 50) {
            return { type: "Horizontal", description: `Préférence pour les lignes horizontales (${hPercent.toFixed(0)}%)` };
        } else if (vPercent > 50) {
            return { type: "Vertical", description: `Préférence pour les lignes verticales (${vPercent.toFixed(0)}%)` };
        } else if (dPercent > 50) {
            return { type: "Diagonal", description: `Préférence pour les diagonales (${dPercent.toFixed(0)}%)` };
        } else {
            return { type: "Équilibré", description: "Bon mélange de toutes les directions" };
        }
    }
    
    async copyGameHistory() {
        const historyText = this.generateGameHistoryText();
        const copyButton = document.getElementById('copy-history');
        
        try {
            await navigator.clipboard.writeText(historyText);
            
            // Feedback visuel
            const originalText = copyButton.textContent;
            copyButton.textContent = '✅ Copié !';
            copyButton.classList.add('copied');
            
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Erreur lors de la copie:', err);
            
            // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
            const textArea = document.createElement('textarea');
            textArea.value = historyText;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                copyButton.textContent = '✅ Copié !';
                copyButton.classList.add('copied');
                
                setTimeout(() => {
                    copyButton.textContent = '📋 Copier l\'historique';
                    copyButton.classList.remove('copied');
                }, 2000);
            } catch (fallbackErr) {
                copyButton.textContent = '❌ Erreur';
                setTimeout(() => {
                    copyButton.textContent = '📋 Copier l\'historique';
                }, 2000);
            }
            
            document.body.removeChild(textArea);
        }
    }
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SuperMorpionGame();
});