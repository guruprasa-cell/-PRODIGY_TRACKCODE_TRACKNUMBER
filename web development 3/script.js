/**
 * ==============================================================================
 * Nexus Tic-Tac-Toe - Game Engine & Logic
 * ==============================================================================
 * Features:
 * - 2-Player Local & Player vs AI Game Modes
 * - 3 AI Difficulties (Easy, Medium, and Mathematically Unbeatable Minimax)
 * - Winning Strike line animation & cell highlight
 * - Confetti particle physics engine on victories
 * - Web Audio API synthesized procedural sounds
 * - Dual keyboard navigation (1-9 & Numpad)
 * - Persistent score tracking via LocalStorage
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- Winning Combinations & Strike Map ---
  const WINNING_COMBINATIONS = [
    { combo: [0, 1, 2], strikeClass: 'row-0' },
    { combo: [3, 4, 5], strikeClass: 'row-1' },
    { combo: [6, 7, 8], strikeClass: 'row-2' },
    { combo: [0, 3, 6], strikeClass: 'col-0' },
    { combo: [1, 4, 7], strikeClass: 'col-1' },
    { combo: [2, 5, 8], strikeClass: 'col-2' },
    { combo: [0, 4, 8], strikeClass: 'diag-0' },
    { combo: [2, 4, 6], strikeClass: 'diag-1' }
  ];

  // --- DOM Elements ---
  const cells = document.querySelectorAll('.cell');
  const gameBoard = document.getElementById('gameBoard');
  const winStrike = document.getElementById('winStrike');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const turnDot = document.getElementById('turnDot');

  const cardX = document.getElementById('cardX');
  const cardO = document.getElementById('cardO');
  const cardTies = document.getElementById('cardTies');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreTiesEl = document.getElementById('scoreTies');
  const titleX = document.getElementById('titleX');
  const titleO = document.getElementById('titleO');

  const modePvpBtn = document.getElementById('modePvpBtn');
  const modeAiBtn = document.getElementById('modeAiBtn');
  const aiConfigBar = document.getElementById('aiConfigBar');
  const aiDifficultySelect = document.getElementById('aiDifficulty');
  const pickXBtn = document.getElementById('pickXBtn');
  const pickOBtn = document.getElementById('pickOBtn');

  const restartBtn = document.getElementById('restartBtn');
  const resetScoreBtn = document.getElementById('resetScoreBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

  const gameOverModal = document.getElementById('gameOverModal');
  const modalBadge = document.getElementById('modalBadge');
  const modalHeading = document.getElementById('modalHeading');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalPlayAgainBtn = document.getElementById('modalPlayAgainBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  const toastBox = document.getElementById('toastBox');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // --- Game State ---
  let board = ['', '', '', '', '', '', '', '', ''];
  let currentPlayer = 'X';
  let isGameActive = true;
  let isAiThinking = false;

  let gameMode = 'pvp'; // 'pvp' or 'ai'
  let humanPlayer = 'X';
  let aiPlayer = 'O';
  let aiDifficulty = 'unbeatable'; // 'easy', 'medium', 'unbeatable'

  let scores = {
    X: 0,
    O: 0,
    ties: 0
  };

  /* ==========================================================================
     1. WEB AUDIO API SYNTHESIZER
     ========================================================================== */
  let isSoundEnabled = false;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.08, volume = 0.15, startTimeOffset = 0) {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime + startTimeOffset;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {}
  }

  function playSoundX() {
    playTone(523.25, 'triangle', 0.1, 0.2); // C5
  }

  function playSoundO() {
    playTone(392.00, 'sine', 0.12, 0.22); // G4
  }

  function playSoundWin() {
    // Fanfare chord arpeggio
    playTone(523.25, 'sine', 0.15, 0.18, 0);      // C5
    playTone(659.25, 'sine', 0.15, 0.18, 0.1);    // E5
    playTone(783.99, 'sine', 0.15, 0.18, 0.2);    // G5
    playTone(1046.50, 'triangle', 0.35, 0.25, 0.3); // C6
  }

  function playSoundTie() {
    playTone(349.23, 'sawtooth', 0.12, 0.1, 0);   // F4
    playTone(311.13, 'sawtooth', 0.2, 0.1, 0.12);  // Eb4
  }

  function playSoundRestart() {
    playTone(600, 'sine', 0.05, 0.15);
  }

  /* ==========================================================================
     2. CONFETTI CELEBRATION ENGINE
     ========================================================================== */
  let confettiParticles = [];
  let confettiAnimationId = null;

  function launchConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    confettiParticles = [];
    const colors = ['#00f0ff', '#ff007f', '#facc15', '#10b981', '#a855f7', '#ffffff'];

    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 200 - 100),
        y: confettiCanvas.height / 2 + (Math.random() * 100 - 50),
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        gravity: 0.35,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

    function animateConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let aliveCount = 0;

      confettiParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < confettiCanvas.height) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        confettiAnimationId = requestAnimationFrame(animateConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    animateConfetti();
  }

  function clearConfetti() {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    if (confettiCanvas) {
      const ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  /* ==========================================================================
     3. GAME LOGIC & WIN DETECTION
     ========================================================================== */

  /**
   * Checks board for winning combinations
   */
  function checkWin(boardState, player) {
    for (const item of WINNING_COMBINATIONS) {
      const [a, b, c] = item.combo;
      if (
        boardState[a] === player &&
        boardState[b] === player &&
        boardState[c] === player
      ) {
        return { won: true, combo: item.combo, strikeClass: item.strikeClass };
      }
    }
    return { won: false };
  }

  /**
   * Checks if board has no empty spots left
   */
  function checkTie(boardState) {
    return boardState.every((cell) => cell !== '');
  }

  /**
   * Updates turn indicators, scoreboard highlights, and board hover markers
   */
  function updateTurnUI() {
    if (!isGameActive) return;

    // Board class for ghost hover preview
    gameBoard.classList.remove('board-turn-x', 'board-turn-o');
    gameBoard.classList.add(currentPlayer === 'X' ? 'board-turn-x' : 'board-turn-o');

    // Scorecard active turn glow
    cardX.classList.toggle('active-turn', currentPlayer === 'X');
    cardO.classList.toggle('active-turn', currentPlayer === 'O');

    // Turn banner
    turnDot.className = `turn-dot current-${currentPlayer.toLowerCase()}-dot`;

    if (gameMode === 'ai') {
      if (currentPlayer === humanPlayer) {
        statusText.textContent = `Your Turn (${humanPlayer})`;
      } else {
        statusText.textContent = `AI is calculating...`;
      }
    } else {
      statusText.textContent = `Player ${currentPlayer}'s Turn`;
    }
  }

  /**
   * Marks a cell and updates DOM
   */
  function applyMove(index, player) {
    board[index] = player;
    const cell = cells[index];
    cell.textContent = player === 'X' ? '✕' : '○';
    cell.classList.add('marked', player === 'X' ? 'cell-x' : 'cell-o');
    cell.setAttribute('aria-label', `Cell ${index + 1}, marked ${player}`);
    cell.disabled = true;

    if (player === 'X') {
      playSoundX();
    } else {
      playSoundO();
    }
  }

  /**
   * Executes game conclusion sequence (Win or Tie)
   */
  function handleGameEnd(result) {
    isGameActive = false;
    cardX.classList.remove('active-turn');
    cardO.classList.remove('active-turn');

    if (result.winner) {
      const winner = result.winner;
      scores[winner]++;
      updateScoresUI();

      // Highlight winning 3 cells
      result.combo.forEach((idx) => {
        cells[idx].classList.add('win-cell');
      });

      // Show winning strike line
      winStrike.className = `win-strike ${result.strikeClass}`;

      // Status text
      let winMessage = `Player ${winner} Wins!`;
      if (gameMode === 'ai') {
        winMessage = winner === humanPlayer ? '🎉 You Won!' : '🤖 AI Wins!';
      }
      statusText.textContent = winMessage;
      turnDot.className = `turn-dot current-${winner.toLowerCase()}-dot`;

      playSoundWin();
      launchConfetti();

      // Open Modal after slight suspense delay
      setTimeout(() => {
        modalBadge.textContent = winner === humanPlayer || gameMode === 'pvp' ? '🏆 Victory!' : '🤖 Defeat';
        modalHeading.textContent = winMessage;
        modalSubtitle.textContent = `Three ${winner} markers aligned in a row!`;
        if (gameOverModal) gameOverModal.showModal();
      }, 700);

    } else if (result.tie) {
      scores.ties++;
      updateScoresUI();

      statusText.textContent = `It's a Draw!`;
      turnDot.className = 'turn-dot';
      turnDot.style.background = 'var(--color-tie)';

      playSoundTie();

      setTimeout(() => {
        modalBadge.textContent = '⚖ Stalemate';
        modalHeading.textContent = `It's a Tie!`;
        modalSubtitle.textContent = 'Both sides matched every move evenly.';
        if (gameOverModal) gameOverModal.showModal();
      }, 600);
    }
  }

  /**
   * Handles user click on a cell
   */
  function handleCellClick(e) {
    const cell = e.currentTarget;
    const index = parseInt(cell.getAttribute('data-index'), 10);

    if (board[index] !== '' || !isGameActive || isAiThinking) {
      return;
    }

    // In AI mode, verify it's the human's turn
    if (gameMode === 'ai' && currentPlayer !== humanPlayer) {
      return;
    }

    makeMove(index);
  }

  /**
   * General move handler
   */
  function makeMove(index) {
    applyMove(index, currentPlayer);

    // Check if move won the game
    const winResult = checkWin(board, currentPlayer);
    if (winResult.won) {
      handleGameEnd({ winner: currentPlayer, combo: winResult.combo, strikeClass: winResult.strikeClass });
      return;
    }

    // Check if move resulted in a tie
    if (checkTie(board)) {
      handleGameEnd({ tie: true });
      return;
    }

    // Switch turns
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();

    // If AI mode and now AI's turn
    if (gameMode === 'ai' && currentPlayer === aiPlayer && isGameActive) {
      triggerAiMove();
    }
  }

  /* ==========================================================================
     4. AI OPPONENT ENGINE (EASY, MEDIUM, UNBEATABLE MINIMAX)
     ========================================================================== */

  function triggerAiMove() {
    isAiThinking = true;
    updateTurnUI();

    // Natural human-like pause (350ms - 500ms)
    setTimeout(() => {
      if (!isGameActive) {
        isAiThinking = false;
        return;
      }

      let chosenIndex;
      if (aiDifficulty === 'easy') {
        chosenIndex = getEasyAiMove();
      } else if (aiDifficulty === 'medium') {
        chosenIndex = getMediumAiMove();
      } else {
        chosenIndex = getUnbeatableMinimaxMove();
      }

      isAiThinking = false;

      if (chosenIndex !== undefined && chosenIndex !== null && board[chosenIndex] === '') {
        makeMove(chosenIndex);
      }
    }, 450);
  }

  /**
   * Easy: Picks completely random available cell
   */
  function getEasyAiMove() {
    const available = board.map((v, i) => v === '' ? i : null).filter((v) => v !== null);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Medium:
   * 1. If AI can win this move, take it.
   * 2. If Human can win next move, block it.
   * 3. Take center if open.
   * 4. Otherwise pick random.
   */
  function getMediumAiMove() {
    const available = board.map((v, i) => v === '' ? i : null).filter((v) => v !== null);

    // 1. Check for immediate win
    for (const idx of available) {
      const copy = [...board];
      copy[idx] = aiPlayer;
      if (checkWin(copy, aiPlayer).won) return idx;
    }

    // 2. Check for immediate block
    for (const idx of available) {
      const copy = [...board];
      copy[idx] = humanPlayer;
      if (checkWin(copy, humanPlayer).won) return idx;
    }

    // 3. Center preference
    if (board[4] === '') return 4;

    // 4. Random fallback
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Unbeatable: Minimax Algorithm with terminal score depth weighting
   */
  function getUnbeatableMinimaxMove() {
    // If board is empty, pick center or corner instantly for performance
    const available = board.map((v, i) => v === '' ? i : null).filter((v) => v !== null);
    if (available.length === 9) {
      return 4; // Center is mathematically optimal first move
    }

    let bestScore = -Infinity;
    let bestMove = available[0];

    for (const idx of available) {
      board[idx] = aiPlayer;
      const score = minimax(board, 0, false);
      board[idx] = ''; // Backtrack

      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }

    return bestMove;
  }

  function minimax(boardState, depth, isMaximizing) {
    // Check terminal conditions
    if (checkWin(boardState, aiPlayer).won) {
      return 10 - depth; // Win sooner is better
    }
    if (checkWin(boardState, humanPlayer).won) {
      return depth - 10; // Lose later is better
    }
    if (checkTie(boardState)) {
      return 0;
    }

    const available = boardState.map((v, i) => v === '' ? i : null).filter((v) => v !== null);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const idx of available) {
        boardState[idx] = aiPlayer;
        const score = minimax(boardState, depth + 1, false);
        boardState[idx] = '';
        maxScore = Math.max(maxScore, score);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const idx of available) {
        boardState[idx] = humanPlayer;
        const score = minimax(boardState, depth + 1, true);
        boardState[idx] = '';
        minScore = Math.min(minScore, score);
      }
      return minScore;
    }
  }

  /* ==========================================================================
     5. ROUND MANAGEMENT & SCOREBOARD
     ========================================================================== */

  /**
   * Resets the round for a new game
   */
  function startNewRound() {
    board = ['', '', '', '', '', '', '', '', ''];
    isGameActive = true;
    isAiThinking = false;
    currentPlayer = 'X'; // X always plays first

    clearConfetti();

    // Reset board DOM
    cells.forEach((cell, idx) => {
      cell.textContent = '';
      cell.className = 'cell';
      cell.disabled = false;
      cell.setAttribute('aria-label', `Cell ${idx + 1}, empty`);
    });

    winStrike.className = 'win-strike';

    if (gameOverModal && gameOverModal.open) {
      gameOverModal.close();
    }

    updateTurnUI();
    playSoundRestart();

    // If playing AI and human selected 'O', AI plays first as 'X'
    if (gameMode === 'ai' && humanPlayer === 'O') {
      triggerAiMove();
    }
  }

  function updateScoresUI() {
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreTiesEl.textContent = scores.ties;

    try {
      localStorage.setItem('nexus-ttt-scores', JSON.stringify(scores));
    } catch (e) {}
  }

  function resetAllScores() {
    if (confirm('Reset scoreboard back to 0?')) {
      scores = { X: 0, O: 0, ties: 0 };
      updateScoresUI();
      showToast('Scores reset to zero');
    }
  }

  function showToast(message) {
    if (!toastBox) return;
    toastBox.textContent = message;
    toastBox.classList.add('show');
    setTimeout(() => {
      toastBox.classList.remove('show');
    }, 2200);
  }

  /* ==========================================================================
     6. MODE & DIFFICULTY CONFIGURATION
     ========================================================================== */

  function setGameMode(mode) {
    gameMode = mode;
    modePvpBtn.classList.toggle('active', mode === 'pvp');
    modePvpBtn.setAttribute('aria-checked', mode === 'pvp');
    modeAiBtn.classList.toggle('active', mode === 'ai');
    modeAiBtn.setAttribute('aria-checked', mode === 'ai');

    aiConfigBar.style.display = mode === 'ai' ? 'flex' : 'none';

    if (mode === 'ai') {
      titleX.textContent = humanPlayer === 'X' ? 'You (X)' : 'AI (X)';
      titleO.textContent = humanPlayer === 'O' ? 'You (O)' : 'AI (O)';
    } else {
      titleX.textContent = 'Player X';
      titleO.textContent = 'Player O';
    }

    startNewRound();
  }

  function setHumanMarker(marker) {
    humanPlayer = marker;
    aiPlayer = marker === 'X' ? 'O' : 'X';

    pickXBtn.classList.toggle('active', marker === 'X');
    pickOBtn.classList.toggle('active', marker === 'O');

    titleX.textContent = humanPlayer === 'X' ? 'You (X)' : 'AI (X)';
    titleO.textContent = humanPlayer === 'O' ? 'You (O)' : 'AI (O)';

    startNewRound();
  }

  /* ==========================================================================
     7. THEMES & SOUND SETTINGS
     ========================================================================== */
  const themes = ['neon', 'midnight', 'light'];
  const themeIcons = { neon: '⚡', midnight: '🌙', light: '☀️' };

  function cycleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'neon';
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    const nextTheme = themes[nextIdx];

    document.body.setAttribute('data-theme', nextTheme);
    themeIcon.textContent = themeIcons[nextTheme];

    try {
      localStorage.setItem('nexus-ttt-theme', nextTheme);
    } catch (e) {}
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    soundIcon.textContent = isSoundEnabled ? '🔊' : '🔇';

    if (isSoundEnabled) {
      initAudio();
      playSoundX();
      showToast('Sound enabled 🔊');
    } else {
      showToast('Sound muted 🔇');
    }

    try {
      localStorage.setItem('nexus-ttt-sound', isSoundEnabled ? 'on' : 'off');
    } catch (e) {}
  }

  /* ==========================================================================
     8. EVENT LISTENERS & KEYBOARD BINDINGS
     ========================================================================== */

  // Board Clicks
  cells.forEach((cell) => {
    cell.addEventListener('click', handleCellClick);
  });

  // Controls
  restartBtn.addEventListener('click', startNewRound);
  resetScoreBtn.addEventListener('click', resetAllScores);
  soundToggleBtn.addEventListener('click', toggleSound);
  themeToggleBtn.addEventListener('click', cycleTheme);

  modalPlayAgainBtn.addEventListener('click', () => {
    if (gameOverModal) gameOverModal.close();
    startNewRound();
  });

  modalCloseBtn.addEventListener('click', () => {
    if (gameOverModal) gameOverModal.close();
  });

  // Mode & Marker Selection
  modePvpBtn.addEventListener('click', () => setGameMode('pvp'));
  modeAiBtn.addEventListener('click', () => setGameMode('ai'));

  aiDifficultySelect.addEventListener('change', (e) => {
    aiDifficulty = e.target.value;
    startNewRound();
  });

  pickXBtn.addEventListener('click', () => setHumanMarker('X'));
  pickOBtn.addEventListener('click', () => setHumanMarker('O'));

  // Shortcuts Dialog
  shortcutsBtn.addEventListener('click', () => {
    if (shortcutsModal) shortcutsModal.showModal();
  });

  closeShortcutsBtn.addEventListener('click', () => {
    if (shortcutsModal) shortcutsModal.close();
  });

  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      const rect = shortcutsModal.getBoundingClientRect();
      const inBox = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inBox) shortcutsModal.close();
    });
  }

  // Keyboard Navigation: Direct Cell Placement via 1-9 & Numpad
  const KEY_TO_INDEX_MAP = {
    // Standard row-order number keys
    'Digit1': 0, 'Digit2': 1, 'Digit3': 2,
    'Digit4': 3, 'Digit5': 4, 'Digit6': 5,
    'Digit7': 6, 'Digit8': 7, 'Digit9': 8,

    // Numpad ergonomic matching (traditional phone / numpad layouts)
    'Numpad7': 0, 'Numpad8': 1, 'Numpad9': 2,
    'Numpad4': 3, 'Numpad5': 4, 'Numpad6': 5,
    'Numpad1': 6, 'Numpad2': 7, 'Numpad3': 8
  };

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'KeyR') {
      e.preventDefault();
      startNewRound();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      toggleSound();
    } else if (e.code === 'Space') {
      if (gameOverModal && gameOverModal.open) {
        e.preventDefault();
        gameOverModal.close();
        startNewRound();
      }
    } else if (e.code === 'Escape') {
      if (shortcutsModal && shortcutsModal.open) shortcutsModal.close();
      if (gameOverModal && gameOverModal.open) gameOverModal.close();
    } else if (KEY_TO_INDEX_MAP.hasOwnProperty(e.code)) {
      const targetIndex = KEY_TO_INDEX_MAP[e.code];
      if (board[targetIndex] === '' && isGameActive && !isAiThinking) {
        if (gameMode === 'pvp' || currentPlayer === humanPlayer) {
          e.preventDefault();
          makeMove(targetIndex);
        }
      }
    }
  });

  // Restore LocalStorage configurations
  try {
    const savedScores = localStorage.getItem('nexus-ttt-scores');
    if (savedScores) scores = JSON.parse(savedScores);

    const savedTheme = localStorage.getItem('nexus-ttt-theme') || 'neon';
    document.body.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = themeIcons[savedTheme] || '⚡';

    const savedSound = localStorage.getItem('nexus-ttt-sound');
    if (savedSound === 'on') {
      isSoundEnabled = true;
      soundIcon.textContent = '🔊';
    }
  } catch (e) {}

  // Initialize
  updateScoresUI();
  updateTurnUI();

  console.log('✦ Nexus Tic-Tac-Toe engine initialized successfully.');
})();
