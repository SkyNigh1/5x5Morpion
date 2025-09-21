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
    elite: { name: 'Elite', searchDepth: 4 },
    legendary: { name: 'Légendaire', searchDepth: 0 },
    training: { name: 'Entraînement', searchDepth: 0 }
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

        // État de replay
        this.isReplaying = false;
        this.replayIndex = 0; // index dans gameHistory (1..moveCount)
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
                if (this.difficulty === 'training') {
                    this.startTraining();
                } else {
                    this.startGame();
                }
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

        // Replay controls
        const replayPrev = document.getElementById('replay-prev');
        const replayNext = document.getElementById('replay-next');
        if (replayPrev && replayNext) {
            replayPrev.addEventListener('click', () => this.stepReplay(-1));
            replayNext.addEventListener('click', () => this.stepReplay(1));
        }

        const replayBtn = document.getElementById('replay-game');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.startReplay();
            });
        }
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
            case 'legendary':
                ai = new AILegendary(this.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, PLAYERS);
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
        this.isReplaying = false;
        this.toggleReplayControls(false);
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
        
        // Mettre à jour l'expérience avec l'historique de la partie
        try {
            if (window.SuperMorpionExperience) {
                const compactHistory = this.gameHistory.map(m => ({ x: m.x, y: m.y, player: m.player }));
                window.SuperMorpionExperience.updateFromGame(compactHistory, winner, BOARD_SIZE);
            }
        } catch (_) {}

        setTimeout(() => this.showScreen('gameOver'), 1000);
    }

    // ===== Replay =====
    startReplay() {
        if (this.gameHistory.length === 0) return;
        // Construire la position jusqu'au dernier coup et afficher sur le plateau
        this.isReplaying = true;
        this.replayIndex = this.gameHistory.length; // pointer après dernier coup
        this.showScreen('game');
        this.toggleReplayControls(true);
        this.rebuildBoardUpTo(this.replayIndex);
        // Centre le viewport sur le dernier coup
        const last = this.gameHistory[this.gameHistory.length - 1];
        this.centerViewportOn(last.x, last.y);
        this.draw();
    }

    toggleReplayControls(show) {
        const el = document.getElementById('replay-controls');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    rebuildBoardUpTo(index) {
        // Réinitialise le plateau et rejoue les 'index' premiers coups
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
        for (let i = 0; i < index; i++) {
            const m = this.gameHistory[i];
            this.board[m.y][m.x] = m.player;
        }
        this.moveCount = index;
        // Le trait ne s'applique pas en replay, mais on peut afficher une info simple
        this.currentPlayer = (index % 2 === 0) ? PLAYERS.HUMAN : PLAYERS.AI;
    }

    stepReplay(delta) {
        if (!this.isReplaying) return;
        const newIndex = Math.max(0, Math.min(this.gameHistory.length, this.replayIndex + delta));
        if (newIndex === this.replayIndex) return;
        this.replayIndex = newIndex;
        this.rebuildBoardUpTo(this.replayIndex);
        // Ne pas déplacer la vue à chaque step pour laisser l'utilisateur garder sa caméra
        this.draw();
    }

    centerViewportOn(x, y) {
        this.viewport.x = Math.max(0, Math.min(BOARD_SIZE - this.viewport.width, x - Math.floor(this.viewport.width / 2)));
        this.viewport.y = Math.max(0, Math.min(BOARD_SIZE - this.viewport.height, y - Math.floor(this.viewport.height / 2)));
        this.updateViewportDisplay();
    }
    
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screenMap = {
            'menu': 'menu-screen',
            'game': 'game-screen',
            'gameOver': 'game-over-screen',
            'training': 'training-screen'
        };
        
        document.getElementById(screenMap[screenName]).classList.add('active');
        
        if (screenName === 'game') {
            setTimeout(() => this.resizeCanvas(), 100);
        }
        if (screenName === 'training' && this.trainingCanvas) {
            setTimeout(() => this.resizeTrainingCanvas(), 100);
        }
    }

    // ===== Mode Entraînement (IA vs IA) =====
    startTraining() {
        // Prépare un plateau séparé, canvas distinct, et boucle d'auto-jeu
        this.training = {
            running: true,
            paused: false,
            currentPlayer: PLAYERS.HUMAN,
            board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)),
            history: [],
            stats: { games: 0, ai1Wins: 0, ai2Wins: 0, draws: 0 },
            speedMs: 50,
            takeover: false // si l'humain prend la main
        };

        // Canvas d'entraînement
        this.trainingCanvas = document.getElementById('training-canvas');
        this.trainingCtx = this.trainingCanvas.getContext('2d');
        this.trainingViewport = { x: 40, y: 40, width: 20, height: 20 };
        this.setupTrainingInteractions();
        this.showScreen('training');
        this.resizeTrainingCanvas();
        this.updateTrainingStats();
        this.scheduleNextTrainingTick();

        // Boutons contrôle
        const back = document.getElementById('training-back');
        const toggle = document.getElementById('training-toggle');
        const takeover = document.getElementById('training-human-takeover');
        if (back) back.onclick = () => { this.training.running = false; this.showScreen('menu'); };
    if (toggle) toggle.onclick = () => { this.training.paused = !this.training.paused; toggle.textContent = this.training.paused ? 'Reprendre' : 'Pause'; if (!this.training.paused) this.scheduleNextTrainingTick(); };
    if (takeover) takeover.onclick = () => { this.training.takeover = !this.training.takeover; takeover.textContent = this.training.takeover ? 'Laisser l\'IA reprendre' : 'Jouer à la place de l\'IA'; if (!this.training.takeover) this.scheduleNextTrainingTick(); };
    }

    setupTrainingInteractions() {
        const vp = document.getElementById('training-viewport');
        if (!this.trainingCanvas || !vp) return;
        this.trainingCanvas.onmousedown = (e) => {
            if (!this.training.takeover) return;
            const rect = this.trainingCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const bx = Math.floor(this.trainingViewport.x + x / CELL_SIZE);
            const by = Math.floor(this.trainingViewport.y + y / CELL_SIZE);
            if (bx>=0 && by>=0 && bx<BOARD_SIZE && by<BOARD_SIZE && this.training.board[by][bx]===0) {
                const player = this.training.currentPlayer;
                this.training.board[by][bx] = player;
                this.training.history.push({ x: bx, y: by, player });
                const win = this.trainingCheckWinner(bx, by);
                if (win) {
                    this.training.stats.games++;
                    if (win === PLAYERS.AI) this.training.stats.ai2Wins++; else this.training.stats.ai1Wins++;
                    if (window.SuperMorpionExperience) window.SuperMorpionExperience.updateFromGame(this.training.history, win, BOARD_SIZE);
                    this.resetTrainingBoard();
                } else {
                    this.training.currentPlayer = (player === PLAYERS.HUMAN) ? PLAYERS.AI : PLAYERS.HUMAN;
                }
                this.drawTraining();
            }
        };
        // Drag pour déplacer la vue
        let dragging=false, last={x:0,y:0};
        this.trainingCanvas.addEventListener('mousedown', e=>{ dragging=true; const r=this.trainingCanvas.getBoundingClientRect(); last={x:e.clientX-r.left,y:e.clientY-r.top}; vp.classList.add('dragging'); });
        this.trainingCanvas.addEventListener('mousemove', e=>{ if(!dragging) return; const r=this.trainingCanvas.getBoundingClientRect(); const cur={x:e.clientX-r.left,y:e.clientY-r.top}; const dx=(cur.x-last.x)/CELL_SIZE; const dy=(cur.y-last.y)/CELL_SIZE; this.trainingViewport.x=Math.max(0,Math.min(BOARD_SIZE-this.trainingViewport.width,this.trainingViewport.x-dx)); this.trainingViewport.y=Math.max(0,Math.min(BOARD_SIZE-this.trainingViewport.height,this.trainingViewport.y-dy)); last=cur; this.drawTraining(); });
        this.trainingCanvas.addEventListener('mouseup', ()=>{ dragging=false; vp.classList.remove('dragging'); });
        this.trainingCanvas.addEventListener('mouseleave', ()=>{ dragging=false; vp.classList.remove('dragging'); });
        window.addEventListener('resize', ()=> this.resizeTrainingCanvas());
    }

    resizeTrainingCanvas() {
        const viewport = document.getElementById('training-viewport');
        if (!viewport || !this.trainingCanvas) return;
        this.trainingCanvas.width = viewport.clientWidth;
        this.trainingCanvas.height = viewport.clientHeight;
        this.trainingViewport.width = Math.floor(this.trainingCanvas.width / CELL_SIZE);
        this.trainingViewport.height = Math.floor(this.trainingCanvas.height / CELL_SIZE);
        this.trainingViewport.width = Math.min(this.trainingViewport.width, BOARD_SIZE);
        this.trainingViewport.height = Math.min(this.trainingViewport.height, BOARD_SIZE);
        this.drawTraining();
    }

    drawTraining() {
        const ctx = this.trainingCtx; if (!ctx) return;
        ctx.clearRect(0,0,this.trainingCanvas.width,this.trainingCanvas.height);
        // Grille
        ctx.strokeStyle = '#4a5568'; ctx.lineWidth=1;
        const startX=Math.floor(this.trainingViewport.x), startY=Math.floor(this.trainingViewport.y);
        const endX=Math.min(BOARD_SIZE, startX+this.trainingViewport.width+2);
        const endY=Math.min(BOARD_SIZE, startY+this.trainingViewport.height+2);
        for(let x=startX;x<=endX;x++){ const cx=(x-this.trainingViewport.x)*CELL_SIZE; ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,this.trainingCanvas.height); ctx.stroke(); }
        for(let y=startY;y<=endY;y++){ const cy=(y-this.trainingViewport.y)*CELL_SIZE; ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(this.trainingCanvas.width,cy); ctx.stroke(); }
        // Pions
        for(let y=startY;y<Math.min(BOARD_SIZE,startY+this.trainingViewport.height+1);y++){
            for(let x=startX;x<Math.min(BOARD_SIZE,startX+this.trainingViewport.width+1);x++){
                const piece=this.training.board[y][x]; if(!piece) continue;
                const px=(x-this.trainingViewport.x)*CELL_SIZE+CELL_SIZE/2;
                const py=(y-this.trainingViewport.y)*CELL_SIZE+CELL_SIZE/2;
                if (piece===PLAYERS.HUMAN){ ctx.strokeStyle='#3182ce'; ctx.lineWidth=3; const s=CELL_SIZE*0.3; ctx.beginPath(); ctx.moveTo(px-s,py-s); ctx.lineTo(px+s,py+s); ctx.moveTo(px+s,py-s); ctx.lineTo(px-s,py+s); ctx.stroke(); }
                else { ctx.strokeStyle='#e53e3e'; ctx.lineWidth=3; const r=CELL_SIZE*0.3; ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.stroke(); }
            }
        }
    }

    scheduleNextTrainingTick() {
        if (!this.training || !this.training.running) return;
        if (this.training.paused || this.training.takeover) return;
        setTimeout(()=> this.trainingTick(), this.training.speedMs);
    }

    trainingTick() {
        if (!this.training || !this.training.running || this.training.paused || this.training.takeover) return;
        // Sélection de coup pour le joueur courant
        const player = this.training.currentPlayer;
        // Remap 'AI'/'HUMAN' ids so the engine always plays for the current 'player'
        const mappedPlayers = (player === PLAYERS.AI)
            ? PLAYERS
            : { AI: PLAYERS.HUMAN, HUMAN: PLAYERS.AI };
        const ai = (player === PLAYERS.AI)
            ? new AIElite(this.training.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, mappedPlayers)
            : new AILegendary(this.training.board, BOARD_SIZE, WIN_LENGTH, CELL_SIZE, mappedPlayers);
        const move = ai.getMove();
        if (move) {
            this.training.board[move.y][move.x] = player;
            this.training.history.push({ x: move.x, y: move.y, player });
            const win = this.trainingCheckWinner(move.x, move.y);
            if (win) {
                // Finaliser partie
                this.training.stats.games++;
                if (win === PLAYERS.AI) this.training.stats.ai2Wins++; else this.training.stats.ai1Wins++;
                if (window.SuperMorpionExperience) window.SuperMorpionExperience.updateFromGame(this.training.history, win, BOARD_SIZE);
                this.resetTrainingBoard();
            } else {
                this.training.currentPlayer = (player === PLAYERS.HUMAN) ? PLAYERS.AI : PLAYERS.HUMAN;
            }
            this.drawTraining();
            this.updateTrainingStats();
        }
        this.scheduleNextTrainingTick();
    }

    trainingCheckWinner(x, y) {
        const player = this.training.board[y][x];
        if (!player) return null;
        const dirs=[[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx,dy] of dirs){
            let c=1; for(let i=1;i<WIN_LENGTH;i++){ const nx=x+i*dx, ny=y+i*dy; if(nx<0||ny<0||nx>=BOARD_SIZE||ny>=BOARD_SIZE) break; if(this.training.board[ny][nx]===player)c++; else break; }
            for(let i=1;i<WIN_LENGTH;i++){ const nx=x-i*dx, ny=y-i*dy; if(nx<0||ny<0||nx>=BOARD_SIZE||ny>=BOARD_SIZE) break; if(this.training.board[ny][nx]===player)c++; else break; }
            if (c>=WIN_LENGTH) return player;
        }
        return null;
    }

    resetTrainingBoard() {
        this.training.board = Array(BOARD_SIZE).fill(null).map(()=>Array(BOARD_SIZE).fill(0));
        this.training.history = [];
        this.training.currentPlayer = PLAYERS.HUMAN;
        this.updateTrainingStats();
    }

    updateTrainingStats() {
        const el = document.getElementById('training-stats');
        if (!el || !this.training) return;
        const { games, ai1Wins, ai2Wins, draws } = this.training.stats;
        el.textContent = `Parties: ${games} | IA1 (X): ${ai1Wins} | IA2 (O): ${ai2Wins}` + (draws?` | Nuls: ${draws}`:'');
    }
    
    generateGameHistoryText() {
        const difficulty = DIFFICULTY_LEVELS[this.difficulty];
        const gameTime = this.gameStats.gameTime;
        const minutes = Math.floor(gameTime / 60000);
        const seconds = Math.floor((gameTime % 60000) / 1000);

        // Helpers locaux pour analyser des menaces sur un snapshot de plateau
        const inBounds = (x, y) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
        const dirs = [ [1,0], [0,1], [1,1], [1,-1] ];
        const cloneBoard = (b) => b.map(row => [...row]);
        const checkWinAt = (board, x, y, player) => {
            for (const [dx, dy] of dirs) {
                let count = 1;
                for (let i = 1; i < WIN_LENGTH; i++) {
                    const nx = x + i*dx, ny = y + i*dy;
                    if (!inBounds(nx, ny) || board[ny][nx] !== player) break; count++;
                }
                for (let i = 1; i < WIN_LENGTH; i++) {
                    const nx = x - i*dx, ny = y - i*dy;
                    if (!inBounds(nx, ny) || board[ny][nx] !== player) break; count++;
                }
                if (count >= WIN_LENGTH) return true;
            }
            return false;
        };
        const extractPattern = (board, x, y, dx, dy, player) => {
            let s = '';
            for (let i = -4; i <= 4; i++) {
                const nx = x + i*dx, ny = y + i*dy;
                if (!inBounds(nx, ny)) s += 'W';
                else if (board[ny][nx] === player) s += 'X';
                else if (board[ny][nx] === 0) s += '_';
                else s += 'O';
            }
            return s;
        };
        const countOpenThreeInPattern = (pattern) => {
            const targets5 = ['_XXX_'];
            const targets6 = ['_XX_X_', '_X_XX_'];
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
            return c;
        };
        const isOpenFourAt = (board, x, y, player) => {
            for (const [dx, dy] of dirs) {
                let cnt = 1; let lx = x, ly = y, rx = x, ry = y;
                for (let i = 1; i < WIN_LENGTH; i++) {
                    const nx = x + i*dx, ny = y + i*dy; if (!inBounds(nx, ny)) break;
                    if (board[ny][nx] === player) { cnt++; rx = nx; ry = ny; } else break;
                }
                for (let i = 1; i < WIN_LENGTH; i++) {
                    const nx = x - i*dx, ny = y - i*dy; if (!inBounds(nx, ny)) break;
                    if (board[ny][nx] === player) { cnt++; lx = nx; ly = ny; } else break;
                }
                if (cnt === 4) {
                    const bx = lx - dx, by = ly - dy; const ax = rx + dx, ay = ry + dy;
                    const bEmpty = inBounds(bx, by) && board[by][bx] === 0;
                    const aEmpty = inBounds(ax, ay) && board[ay][ax] === 0;
                    if (bEmpty && aEmpty) return true;
                }
            }
            return false;
        };
        const getBounds = (board, margin = 2) => {
            let minX = BOARD_SIZE, minY = BOARD_SIZE, maxX = -1, maxY = -1;
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    if (board[y][x] !== 0) {
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < 0) return null;
            return {
                x0: Math.max(0, minX - margin), y0: Math.max(0, minY - margin),
                x1: Math.min(BOARD_SIZE-1, maxX + margin), y1: Math.min(BOARD_SIZE-1, maxY + margin)
            };
        };
        const enumerateThreatSquares = (board, player, checker, margin = 3) => {
            const b = getBounds(board, margin); if (!b) return [];
            const res = [];
            for (let y = b.y0; y <= b.y1; y++) {
                for (let x = b.x0; x <= b.x1; x++) {
                    if (board[y][x] !== 0) continue;
                    if (checker(board, x, y, player)) res.push({ x, y });
                }
            }
            return res;
        };
        const createsOpenFourIfPlay = (board, x, y, player) => {
            board[y][x] = player; const ok = isOpenFourAt(board, x, y, player); board[y][x] = 0; return ok;
        };
        const openFourSquares = (board, player, margin=3) => enumerateThreatSquares(board, player, (b,x,y,p)=>createsOpenFourIfPlay(b,x,y,p), margin);
        const immediateWinSquares = (board, player, margin=3) => enumerateThreatSquares(board, player, (b,x,y,p)=>{ b[y][x]=p; const w=checkWinAt(b,x,y,p); b[y][x]=0; return w; }, margin);
        const doubleThreeSquares = (board, player, margin=3) => {
            const b = getBounds(board, margin); if (!b) return [];
            const res = [];
            for (let y = b.y0; y <= b.y1; y++) {
                for (let x = b.x0; x <= b.x1; x++) {
                    if (board[y][x] !== 0) continue;
                    board[y][x] = player;
                    let cnt = 0;
                    for (const [dx, dy] of dirs) {
                        const pat = extractPattern(board, x, y, dx, dy, player);
                        cnt += countOpenThreeInPattern(pat);
                    }
                    board[y][x] = 0;
                    if (cnt >= 2) res.push({ x, y });
                }
            }
            return res;
        };

        // Collecte des diagnostics par balayage des snapshots sauvegardés
        const diag = {
            aiImmediateBlocks: 0,
            aiImmediateBlocksAt: [],
            missedImmediateBlocks: 0,
            missedImmediateBlocksAt: [],
            preventedOpenFour: 0,
            preventedOpenFourAt: [],
            humanOpenFourCreated: 0,
            humanOpenFourAt: [],
            preventedDoubleThree: 0,
            preventedDoubleThreeAt: [],
            aiAvgCenterDist: 0,
            aiAvgNearestOwnDist: 0
        };

        let aiCenterDistSum = 0, aiOwnDistSum = 0, aiMoveCount = 0;
        for (let i = 0; i < this.gameHistory.length; i++) {
            const move = this.gameHistory[i];
            const boardBefore = i > 0 ? cloneBoard(this.gameHistory[i-1].boardState) : cloneBoard(this.gameHistory[0].boardState);

            if (move.player === PLAYERS.AI) {
                // Stats de centre/proximité
                const cx = BOARD_SIZE / 2, cy = BOARD_SIZE / 2;
                aiCenterDistSum += Math.max(Math.abs(move.x - cx), Math.abs(move.y - cy));
                // distance au plus proche pion IA avant le coup
                let best = Infinity;
                for (let y = 0; y < BOARD_SIZE; y++) {
                    for (let x = 0; x < BOARD_SIZE; x++) {
                        if (boardBefore[y][x] === PLAYERS.AI) {
                            const d = Math.max(Math.abs(x - move.x), Math.abs(y - move.y));
                            if (d < best) best = d;
                        }
                    }
                }
                if (best !== Infinity) aiOwnDistSum += best; else aiOwnDistSum += 0;
                aiMoveCount++;

                // Blocage immédiat ?
                const humanWinSquares = immediateWinSquares(boardBefore, PLAYERS.HUMAN, 5);
                if (humanWinSquares.find(s => s.x === move.x && s.y === move.y)) {
                    diag.aiImmediateBlocks++;
                    diag.aiImmediateBlocksAt.push(move.move);
                }

                // Prévention open four
                const humanOpenFourNext = openFourSquares(boardBefore, PLAYERS.HUMAN, 5);
                if (humanOpenFourNext.find(s => s.x === move.x && s.y === move.y)) {
                    diag.preventedOpenFour++; diag.preventedOpenFourAt.push(move.move);
                }

                // Prévention double open three
                const humanDoubleThreeNext = doubleThreeSquares(boardBefore, PLAYERS.HUMAN, 5);
                if (humanDoubleThreeNext.find(s => s.x === move.x && s.y === move.y)) {
                    diag.preventedDoubleThree++; diag.preventedDoubleThreeAt.push(move.move);
                }
            } else {
                // Si humain vient de jouer gagnant et juste avant il y avait un winSquare non bloqué, compter comme miss
                const winNow = checkWinAt(this.gameHistory[i].boardState, move.x, move.y, PLAYERS.HUMAN);
                if (winNow && i > 0) {
                    const before = cloneBoard(this.gameHistory[i-1].boardState);
                    const humanWinSquares = immediateWinSquares(before, PLAYERS.HUMAN, 5);
                    if (humanWinSquares.length > 0) {
                        // Si le coup IA précédent n'a pas joué l'une de ces cases, considérer raté
                        const prevAIMove = this.gameHistory[i-1];
                        if (!(prevAIMove && prevAIMove.player === PLAYERS.AI && humanWinSquares.find(s => s.x === prevAIMove.x && s.y === prevAIMove.y))) {
                            diag.missedImmediateBlocks++; diag.missedImmediateBlocksAt.push(i);
                        }
                    }
                }

                // Détection open-four effectivement créé par humain après son coup
                const boardNow = cloneBoard(this.gameHistory[i].boardState);
                if (isOpenFourAt(boardNow, move.x, move.y, PLAYERS.HUMAN)) {
                    diag.humanOpenFourCreated++; diag.humanOpenFourAt.push(move.move);
                }
            }
        }

        if (aiMoveCount > 0) {
            diag.aiAvgCenterDist = (aiCenterDistSum / aiMoveCount).toFixed(2);
            diag.aiAvgNearestOwnDist = (aiOwnDistSum / aiMoveCount).toFixed(2);
        }

        // Texte de sortie enrichi pour amélioration du bot
        let historyText = `🤖 SUPER MORPION - DIAGNOSTIC POUR AMÉLIORER L'IA\n`;
        historyText += `════════════════════════════════════════════\n\n`;
        historyText += `📊 Données de partie\n`;
        historyText += `────────────────────\n`;
        historyText += `Date: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
        historyText += `Niveau IA: ${difficulty.name} (Profondeur déclarée: ${difficulty.searchDepth})\n`;
        historyText += `Résultat: ${this.gameStats.winner === PLAYERS.HUMAN ? '🏆 Joueur' : '🤖 IA'}\n`;
        historyText += `Durée: ${minutes}:${seconds.toString().padStart(2, '0')} | Coups: ${this.gameStats.totalMoves} (Joueur ${this.gameStats.humanMoves} / IA ${this.gameStats.aiMoves})\n`;
        if (this.gameHistory.length > 0) {
            const avgTimePerMove = gameTime / this.gameHistory.length;
            historyText += `Temps moyen par coup: ${(avgTimePerMove / 1000).toFixed(2)}s\n`;
        }

        const zones = this.analyzeMovesDistribution();
        historyText += `Répartition: Centre(40-60)=${zones.center}, Milieu=${zones.middle}, Bords=${zones.edges}\n\n`;

        historyText += `🛡️ Réactivité tactique IA\n`;
        historyText += `───────────────────────\n`;
        historyText += `Blocs immédiats effectués: ${diag.aiImmediateBlocks}` + (diag.aiImmediateBlocksAt.length? ` (aux coups: ${diag.aiImmediateBlocksAt.join(', ')})`:'') + `\n`;
        historyText += `Blocs immédiats manqués: ${diag.missedImmediateBlocks}` + (diag.missedImmediateBlocksAt.length? ` (repères: ${diag.missedImmediateBlocksAt.join(', ')})`:'') + `\n`;
        historyText += `Open-four adverses empêchés: ${diag.preventedOpenFour}` + (diag.preventedOpenFourAt.length? ` (aux coups: ${diag.preventedOpenFourAt.join(', ')})`:'') + `\n`;
        historyText += `Open-four créés par l'adversaire: ${diag.humanOpenFourCreated}` + (diag.humanOpenFourAt.length? ` (aux coups: ${diag.humanOpenFourAt.join(', ')})`:'') + `\n`;
        historyText += `Double "open three" adverses empêchés: ${diag.preventedDoubleThree}` + (diag.preventedDoubleThreeAt.length? ` (aux coups: ${diag.preventedDoubleThreeAt.join(', ')})`:'') + `\n\n`;

        historyText += `📐 Profil de placement IA\n`;
        historyText += `────────────────────────\n`;
        historyText += `Distance moyenne au centre (Chebyshev): ${diag.aiAvgCenterDist}\n`;
        historyText += `Distance moyenne au plus proche pion IA: ${diag.aiAvgNearestOwnDist}\n\n`;

        // Historique synthétique
        historyText += `🎯 Historique des coups\n`;
        historyText += `──────────────────────\n`;
        historyText += `N°  | Joueur | Pos | Temps | Cumul\n`;
        historyText += `────┼────────┼─────┼───────┼──────\n`;
        this.gameHistory.forEach((move) => {
            const playerIcon = move.player === PLAYERS.HUMAN ? '👤' : '🤖';
            const timeSeconds = (move.timeFromStart / 1000).toFixed(1);
            const position = `${move.x.toString().padStart(2, '0')},${move.y.toString().padStart(2, '0')}`;
            historyText += `${move.move.toString().padStart(3, ' ')} | ${playerIcon} | ${position.padEnd(5, ' ')} | ${timeSeconds.padStart(5, ' ')}s | ${timeSeconds.padStart(5, ' ')}s\n`;
        });

        // Conseils ciblés selon diagnostics
        historyText += `\n🧪 Pistes d'amélioration IA\n`;
        historyText += `────────────────────────\n`;
        if (diag.missedImmediateBlocks > 0) {
            historyText += `• Renforcer la détection et priorité de blocage 1-coup (étendre marge de scan ou heuristique d'ordre des coups).\n`;
        }
        if (diag.humanOpenFourCreated > 0) {
            historyText += `• Prévenir plus tôt les open-four (scans élargis, création de contre-menaces).\n`;
        }
        if (Number(diag.aiAvgNearestOwnDist) > 2.5) {
            historyText += `• Améliorer la connectivité (placer plus près des groupes existants).\n`;
        }
        if (Number(diag.aiAvgCenterDist) > 18) {
            historyText += `• Légère préférence centre à renforcer dans l'ouverture.\n`;
        }
        if (diag.preventedDoubleThree === 0) {
            historyText += `• Détecter davantage les doubles "open three" dans les positions calmes.\n`;
        }
        if (diag.aiImmediateBlocks === 0 && this.gameStats.aiMoves > 0) {
            historyText += `• Vérifier l'ordre des priorités (gagner/bloc immédiat) avant la recherche.\n`;
        }

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