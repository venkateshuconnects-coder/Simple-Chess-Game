// Initialize the chess game and board
import { Chess } from './lib/chess.min.js';
window.Chess = Chess;
let game = new Chess();
let board = null;
let isBotMode = true; // Default to playing against bot
let gameStats = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    withdrawn: 0
};

// Load stats from localStorage if available
function loadStats() {
    const stored = localStorage.getItem('chessStats');
    if (stored) {
        gameStats = JSON.parse(stored);
        updateDashboard();
    }
}

// Save stats to localStorage
function saveStats() {
    localStorage.setItem('chessStats', JSON.stringify(gameStats));
}

// Update the dashboard display
function updateDashboard() {
    document.getElementById('games-played').textContent = gameStats.played;
    document.getElementById('games-won').textContent = gameStats.won;
    document.getElementById('games-drawn').textContent = gameStats.drawn;
    document.getElementById('games-lost').textContent = gameStats.lost;
    document.getElementById('games-withdrawn').textContent = gameStats.withdrawn;
}

// Reset the game state
function resetGame() {
    game = new Chess();
    // Only try to start the board if it's initialized
    if (board && typeof board.start === 'function') {
        board.start();
    }
    clearMoveList();
}

// Clear the move list
function clearMoveList() {
    const moveList = document.getElementById('move-list');
    moveList.innerHTML = '';
}

// Add a move to the move list
function addMoveToList(move, isWhite) {
    const moveList = document.getElementById('move-list');
    const moveNumber = Math.floor(game.history().length / 2) + 1;
    
    const li = document.createElement('li');
    li.innerHTML = `
        <span class="move-number">${moveNumber}.</span>
        <span class="${isWhite ? 'white-move' : 'black-move'}">${move}</span>
    `;
    moveList.appendChild(li);
    moveList.scrollTop = moveList.scrollHeight;
}

// Make a random bot move
function makeBotMove() {
    if (game.game_over()) return;
    
    const possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    const move = possibleMoves[randomIndex];
    game.move(move);
    board.position(game.fen());
    
    // Add bot's move to the list (black move)
    const lastMove = game.history().slice(-1)[0];
    addMoveToList(lastMove, false);
    
    checkGameEnd();
}

// Handle a move made on the board
function onDrop(source, target, piece, newPos, oldPos, orientation) {
    // Check if the move is legal
    const move = game.move({ from: source, to: target, promotion: 'q' }); // Assume queen promotion for simplicity
    
    // Illegal move
    if (move === null) return 'snapback';
    
    // Legal move - update board
    board.position(game.fen());
    
    // Add human's move to the list (white move if human is white, black if human is black)
    // For simplicity, we assume human is always white in bot mode
    // In hotseat mode, we'll alternate based on whose turn it is
    const isWhiteMove = game.turn() === 'b'; // After move, turn switches, so if turn is black, last move was white
    addMoveToList(move.san, isWhiteMove);
    
    // Check if game ended after human's move
    if (checkGameEnd()) return;
    
    // If in bot mode, make bot move after a short delay
    if (isBotMode) {
        window.setTimeout(makeBotMove, 250);
    }
    
    // Return the snapped piece for animation
    return;
}

// Update the board position when the board is initialized or reset
function onSnapEnd() {
    board.position(game.fen());
}

// Check if the game has ended and update stats
function checkGameEnd() {
    if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        alert(`Game over: ${winner} wins by checkmate`);
        
        // Update stats: if human is white, then win if white won, loss if black won
        // For simplicity, we assume human is white in bot mode
        if (isBotMode) {
            if (winner === 'White') {
                gameStats.won++;
            } else {
                gameStats.lost++;
            }
        } else {
            // In hotseat, we don't assign win/loss to a specific player for stats
            // Just increment played
        }
        gameStats.played++;
        saveStats();
        updateDashboard();
        return true;
    } else if (game.in_draw()) {
        alert('Game over: Draw');
        gameStats.drawn++;
        gameStats.played++;
        saveStats();
        updateDashboard();
        return true;
    } else if (game.in_stalemate()) {
        alert('Game over: Stalemate');
        gameStats.drawn++;
        gameStats.played++;
        saveStats();
        updateDashboard();
        return true;
    } else if (game.in_threefold_repetition()) {
        alert('Game over: Draw by threefold repetition');
        gameStats.drawn++;
        gameStats.played++;
        saveStats();
        updateDashboard();
        return true;
    }
    
    return false;
}

// Initialize the board
function initBoard() {
    console.log('Initializing board...');
    console.log('Chess object:', typeof Chess);
    console.log('Chessboard object:', typeof Chessboard);
    
    // Check if Chessboard is available
    if (typeof Chessboard === 'undefined') {
        console.error('Chessboard library not loaded');
        // Try again after a short delay
        setTimeout(initBoard, 100);
        return;
    }
    
    try {
        const config = {
            draggable: true,
            position: 'start',
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            pieceTheme: function(piece) {
                // Unicode chess symbols as inline SVG to avoid CDN dependency
                const unicodePieces = {
                    'wK': '&#9812;', 'wQ': '&#9813;', 'wR': '&#9814;', 'wB': '&#9815;', 'wN': '&#9816;', 'wP': '&#9817;',
                    'bK': '&#9818;', 'bQ': '&#9819;', 'bR': '&#9820;', 'bB': '&#9821;', 'bN': '&#9822;', 'bP': '&#9823;'
                };
                const colors = { 'w': '#fff', 'b': '#000' };
                const color = piece[0];
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="45" height="45">
                    <text font-size="40" text-anchor="middle" x="22.5" y="35" fill="${colors[color]}" stroke="${colors[color]}" stroke-width="0.5">${unicodePieces[piece]}</text>
                </svg>`;
                return 'data:image/svg+xml,' + encodeURIComponent(svg);
            }
        };
        board = Chessboard('board', config);
        console.log('Board initialized:', board);
        
        // Ensure board is properly initialized
        if (board) {
            board.start(); // Explicitly start the board
        }
        
        // Load stats and update dashboard
        loadStats();
    } catch (error) {
        console.error('Error initializing board:', error);
        // Retry after a short delay
        setTimeout(initBoard, 200);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    
    document.getElementById('new-game').addEventListener('click', () => {
        if (confirm('Start a new game?')) {
            resetGame();
        }
    });
    
    document.getElementById('toggle-mode').addEventListener('click', () => {
        isBotMode = !isBotMode;
        const btn = document.getElementById('toggle-mode');
        btn.textContent = isBotMode ? 'Play vs Human' : 'Play vs Bot';
        resetGame();
    });
});