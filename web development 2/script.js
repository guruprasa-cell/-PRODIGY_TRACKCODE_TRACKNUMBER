/**
 * ==============================================================================
 * Chronos Precision Stopwatch - Application Logic
 * ==============================================================================
 * Features:
 * - High-precision timestamp delta timing engine (zero-drift)
 * - requestAnimationFrame UI updates with SVG radial sweep
 * - Lap tracking with fastest/slowest analysis & delta differences
 * - Web Audio API synthesized tactile sound effects
 * - Full keyboard shortcuts and dialog management
 * - Copy & CSV export capabilities
 * - Theme switcher (Dark, Light, Cyberpunk)
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const millisecondsEl = document.getElementById('milliseconds');
  const currentLapDisplay = document.getElementById('currentLapDisplay');
  const dialProgress = document.getElementById('dialProgress');

  const startPauseBtn = document.getElementById('startPauseBtn');
  const startPauseIcon = document.getElementById('startPauseIcon');
  const startPauseText = document.getElementById('startPauseText');
  const lapBtn = document.getElementById('lapBtn');
  const resetBtn = document.getElementById('resetBtn');

  const statsCard = document.getElementById('statsCard');
  const statTotalLaps = document.getElementById('statTotalLaps');
  const statFastestLap = document.getElementById('statFastestLap');
  const statSlowestLap = document.getElementById('statSlowestLap');
  const statAvgLap = document.getElementById('statAvgLap');

  const lapsContainer = document.getElementById('lapsContainer');
  const lapsCountBadge = document.getElementById('lapsCountBadge');
  const lapsActions = document.getElementById('lapsActions');
  const lapsEmpty = document.getElementById('lapsEmpty');
  const lapsTableWrapper = document.getElementById('lapsTableWrapper');
  const lapsListBody = document.getElementById('lapsListBody');

  const copyLapsBtn = document.getElementById('copyLapsBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const clearLapsBtn = document.getElementById('clearLapsBtn');

  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsDialog = document.getElementById('shortcutsDialog');
  const closeDialogBtn = document.getElementById('closeDialogBtn');
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeName = document.getElementById('themeName');
  const toastNotification = document.getElementById('toastNotification');

  // --- Timing State ---
  let isRunning = false;
  let startTime = 0;
  let elapsedTime = 0;
  let currentLapStartTime = 0;
  let currentLapElapsed = 0;
  let animationFrameId = null;

  // Array of recorded laps: { id, lapTime, overallTime }
  let laps = [];

  // SVG Dial Circumference = 2 * PI * r = 2 * Math.PI * 140 ~= 879.64
  const DIAL_CIRCUMFERENCE = 2 * Math.PI * 140;
  if (dialProgress) {
    dialProgress.style.strokeDasharray = `${DIAL_CIRCUMFERENCE}`;
    dialProgress.style.strokeDashoffset = `${DIAL_CIRCUMFERENCE}`;
  }

  // --- Sound Effects via Web Audio API ---
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

  function playTone(freq, type = 'sine', duration = 0.04, volume = 0.15) {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio playback failed silently
    }
  }

  function playSoundStart() {
    playTone(880, 'sine', 0.05, 0.2); // Crisp high tick
  }

  function playSoundPause() {
    playTone(440, 'triangle', 0.06, 0.2); // Lower tone
  }

  function playSoundLap() {
    playTone(1050, 'sine', 0.03, 0.18); // Sharp click
  }

  function playSoundReset() {
    playTone(330, 'sine', 0.1, 0.15); // Deep chime
  }

  // --- Utility Functions ---

  /**
   * Formats milliseconds into hours, minutes, seconds, milliseconds components
   */
  function parseTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor(ms % 1000);

    return {
      hours: String(hrs).padStart(2, '0'),
      minutes: String(mins).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0'),
      milliseconds: String(millis).padStart(3, '0'),
      rawHours: hrs,
      rawMinutes: mins,
      rawSeconds: secs,
      rawMillis: millis
    };
  }

  /**
   * Formats duration into a readable string
   */
  function formatTimeString(ms, includeHours = true) {
    const t = parseTime(ms);
    if (includeHours || t.rawHours > 0) {
      return `${t.hours}:${t.minutes}:${t.seconds}.${t.milliseconds}`;
    }
    return `${t.minutes}:${t.seconds}.${t.milliseconds}`;
  }

  /**
   * Displays a brief toast alert
   */
  let toastTimer = null;
  function showToast(message) {
    if (!toastNotification) return;
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2400);
  }

  /* ==========================================================================
     TIMING & RENDER ENGINE
     ========================================================================== */
  function updateDisplay(currentTotalMs, currentLapMs) {
    const totalTime = parseTime(currentTotalMs);

    hoursEl.textContent = totalTime.hours;
    minutesEl.textContent = totalTime.minutes;
    secondsEl.textContent = totalTime.seconds;
    millisecondsEl.textContent = totalTime.milliseconds;

    // Current lap readout
    const lapTime = parseTime(currentLapMs);
    currentLapDisplay.textContent = `${lapTime.minutes}:${lapTime.seconds}.${lapTime.milliseconds}`;

    // SVG Circular Progress Ring Update (sweeps 0 to 60 seconds)
    if (dialProgress) {
      const secondFraction = (totalTime.rawSeconds % 60) + (totalTime.rawMillis / 1000);
      const progressPercent = secondFraction / 60;
      const offset = DIAL_CIRCUMFERENCE - (progressPercent * DIAL_CIRCUMFERENCE);
      dialProgress.style.strokeDashoffset = `${offset}`;
    }
  }

  function tick() {
    if (!isRunning) return;

    const now = performance.now();
    const currentTotalMs = (now - startTime) + elapsedTime;
    const currentLapMs = (now - currentLapStartTime) + currentLapElapsed;

    updateDisplay(currentTotalMs, currentLapMs);
    animationFrameId = requestAnimationFrame(tick);
  }

  /* ==========================================================================
     STOPWATCH ACTIONS: START, PAUSE, RESET, LAP
     ========================================================================== */

  /**
   * Starts or resumes timing
   */
  function startStopwatch() {
    isRunning = true;
    startTime = performance.now();
    currentLapStartTime = performance.now();

    // UI Updates
    startPauseBtn.classList.add('running');
    startPauseIcon.textContent = '⏸';
    startPauseText.textContent = 'Pause';
    startPauseBtn.setAttribute('aria-label', 'Pause stopwatch');

    lapBtn.disabled = false;
    resetBtn.disabled = false;

    playSoundStart();
    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Pauses the stopwatch, preserving accumulated elapsed time
   */
  function pauseStopwatch() {
    isRunning = false;
    cancelAnimationFrame(animationFrameId);

    const now = performance.now();
    elapsedTime += now - startTime;
    currentLapElapsed += now - currentLapStartTime;

    updateDisplay(elapsedTime, currentLapElapsed);

    // UI Updates
    startPauseBtn.classList.remove('running');
    startPauseIcon.textContent = '▶';
    startPauseText.textContent = 'Resume';
    startPauseBtn.setAttribute('aria-label', 'Resume stopwatch');

    lapBtn.disabled = true; // Cannot record lap while paused
    resetBtn.disabled = false;

    playSoundPause();
  }

  /**
   * Toggles between Start and Pause
   */
  function toggleStartPause() {
    if (isRunning) {
      pauseStopwatch();
    } else {
      startStopwatch();
    }
  }

  /**
   * Resets the stopwatch to 00:00:00.000 and clears lap data
   */
  function resetStopwatch() {
    if (isRunning) {
      pauseStopwatch();
    }

    elapsedTime = 0;
    currentLapElapsed = 0;
    startTime = 0;
    currentLapStartTime = 0;
    laps = [];

    // Reset Display
    updateDisplay(0, 0);

    // Reset Dial
    if (dialProgress) {
      dialProgress.style.strokeDashoffset = `${DIAL_CIRCUMFERENCE}`;
    }

    // Reset Buttons
    startPauseBtn.classList.remove('running');
    startPauseIcon.textContent = '▶';
    startPauseText.textContent = 'Start';
    startPauseBtn.setAttribute('aria-label', 'Start stopwatch');

    lapBtn.disabled = true;
    resetBtn.disabled = true;

    // Reset Lap UI
    renderLaps();
    playSoundReset();
    showToast('Stopwatch reset to zero');
  }

  /**
   * Records the current lap interval
   */
  function recordLap() {
    if (!isRunning) return;

    const now = performance.now();
    const lapDuration = (now - currentLapStartTime) + currentLapElapsed;
    const overallDuration = (now - startTime) + elapsedTime;

    // Add lap record to beginning (most recent lap at top)
    const newLap = {
      index: laps.length + 1,
      lapTime: lapDuration,
      overallTime: overallDuration
    };

    laps.unshift(newLap);

    // Reset current lap counter for the next interval
    currentLapStartTime = performance.now();
    currentLapElapsed = 0;

    playSoundLap();
    renderLaps();
  }

  /* ==========================================================================
     LAPS RENDERING & ANALYSIS (FASTEST / SLOWEST / DELTA)
     ========================================================================== */
  function renderLaps() {
    const totalLapsCount = laps.length;
    lapsCountBadge.textContent = `${totalLapsCount} Lap${totalLapsCount === 1 ? '' : 's'}`;

    if (totalLapsCount === 0) {
      lapsEmpty.style.display = 'block';
      lapsTableWrapper.style.display = 'none';
      lapsActions.style.display = 'none';
      statsCard.style.display = 'none';
      lapsListBody.innerHTML = '';
      return;
    }

    lapsEmpty.style.display = 'none';
    lapsTableWrapper.style.display = 'block';
    lapsActions.style.display = 'flex';
    statsCard.style.display = 'grid';

    // Calculate Fastest and Slowest Lap
    let fastestLapTime = Infinity;
    let slowestLapTime = -Infinity;
    let fastestLapIndex = -1;
    let slowestLapIndex = -1;
    let totalLapSum = 0;

    laps.forEach((lap) => {
      totalLapSum += lap.lapTime;
      if (lap.lapTime < fastestLapTime) {
        fastestLapTime = lap.lapTime;
        fastestLapIndex = lap.index;
      }
      if (lap.lapTime > slowestLapTime) {
        slowestLapTime = lap.lapTime;
        slowestLapIndex = lap.index;
      }
    });

    const avgLapTime = totalLapSum / totalLapsCount;

    // Update Statistics Cards
    statTotalLaps.textContent = totalLapsCount;
    statFastestLap.textContent = formatTimeString(fastestLapTime, false);
    statSlowestLap.textContent = formatTimeString(slowestLapTime, false);
    statAvgLap.textContent = formatTimeString(avgLapTime, false);

    // Build Table Rows
    lapsListBody.innerHTML = '';

    laps.forEach((lap, idx) => {
      const tr = document.createElement('tr');

      // Only show fastest/slowest badges when >= 2 laps exist and times differ
      const isFastest = totalLapsCount >= 2 && lap.index === fastestLapIndex;
      const isSlowest = totalLapsCount >= 2 && lap.index === slowestLapIndex && fastestLapIndex !== slowestLapIndex;

      if (isFastest) tr.classList.add('row-fastest');
      if (isSlowest) tr.classList.add('row-slowest');

      // Delta comparison to previous chronological lap (the next item in unshifted array)
      const prevLap = laps[idx + 1];
      let deltaMarkup = '<span class="delta-neutral">-</span>';

      if (prevLap) {
        const diff = lap.lapTime - prevLap.lapTime;
        const diffSecs = (Math.abs(diff) / 1000).toFixed(2);
        if (diff > 50) {
          deltaMarkup = `<span class="delta-pos">+${diffSecs}s</span>`;
        } else if (diff < -50) {
          deltaMarkup = `<span class="delta-neg">-${diffSecs}s</span>`;
        } else {
          deltaMarkup = `<span class="delta-neutral">0.00s</span>`;
        }
      }

      // Badge markup
      let badge = '';
      if (isFastest) {
        badge = '<span class="lap-pill lap-pill-fastest">⚡ Fastest</span>';
      } else if (isSlowest) {
        badge = '<span class="lap-pill lap-pill-slowest">🐢 Slowest</span>';
      }

      tr.innerHTML = `
        <td><strong>Lap ${lap.index}</strong> ${badge}</td>
        <td>${formatTimeString(lap.lapTime, false)}</td>
        <td>${formatTimeString(lap.overallTime, true)}</td>
        <td>${deltaMarkup}</td>
      `;

      lapsListBody.appendChild(tr);
    });
  }

  /* ==========================================================================
     EXPORT & CLIPBOARD UTILITIES
     ========================================================================== */
  function copyLapsToClipboard() {
    if (laps.length === 0) return;

    let text = `=== Chronos Stopwatch Lap Records ===\n`;
    text += `Total Laps: ${laps.length}\n\n`;

    // Sort chronologically for readable export
    const chronologicalLaps = [...laps].reverse();
    chronologicalLaps.forEach((lap) => {
      text += `Lap ${lap.index}: Split ${formatTimeString(lap.lapTime, false)} | Total ${formatTimeString(lap.overallTime, true)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('Laps copied to clipboard! 📋');
    }).catch(() => {
      showToast('Could not copy to clipboard.');
    });
  }

  function exportLapsCsv() {
    if (laps.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,Lap Number,Lap Time (Formatted),Overall Time (Formatted),Lap Milliseconds,Overall Milliseconds\n';

    const chronologicalLaps = [...laps].reverse();
    chronologicalLaps.forEach((lap) => {
      csvContent += `${lap.index},"${formatTimeString(lap.lapTime, false)}","${formatTimeString(lap.overallTime, true)}",${Math.round(lap.lapTime)},${Math.round(lap.overallTime)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chronos_stopwatch_laps_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Laps exported as CSV! ⬇️');
  }

  function clearLaps() {
    if (confirm('Clear all recorded laps?')) {
      laps = [];
      renderLaps();
      showToast('Lap history cleared');
    }
  }

  /* ==========================================================================
     THEME & AUDIO CONTROLS
     ========================================================================== */
  const themes = ['dark', 'light', 'cyber'];
  const themeLabels = {
    dark: { name: 'Dark', icon: '🌙' },
    light: { name: 'Light', icon: '☀️' },
    cyber: { name: 'Cyber', icon: '⚡' }
  };

  function cycleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    applyTheme(nextTheme);
  }

  function applyTheme(themeKey) {
    document.body.setAttribute('data-theme', themeKey);
    const info = themeLabels[themeKey] || themeLabels.dark;
    themeIcon.textContent = info.icon;
    themeName.textContent = info.name;

    try {
      localStorage.setItem('chronos-theme', themeKey);
    } catch (e) {}
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    soundIcon.textContent = isSoundEnabled ? '🔊' : '🔇';
    soundToggleBtn.setAttribute('title', isSoundEnabled ? 'Sound Enabled' : 'Sound Muted');

    if (isSoundEnabled) {
      initAudio();
      playSoundStart();
      showToast('Sound effects enabled 🔊');
    } else {
      showToast('Sound effects muted 🔇');
    }

    try {
      localStorage.setItem('chronos-sound', isSoundEnabled ? 'on' : 'off');
    } catch (e) {}
  }

  /* ==========================================================================
     EVENT LISTENERS & KEYBOARD SHORTCUTS
     ========================================================================== */
  startPauseBtn.addEventListener('click', toggleStartPause);
  lapBtn.addEventListener('click', recordLap);
  resetBtn.addEventListener('click', resetStopwatch);

  copyLapsBtn.addEventListener('click', copyLapsToClipboard);
  exportCsvBtn.addEventListener('click', exportLapsCsv);
  clearLapsBtn.addEventListener('click', clearLaps);

  soundToggleBtn.addEventListener('click', toggleSound);
  themeBtn.addEventListener('click', cycleTheme);

  // Dialog Controls
  shortcutsBtn.addEventListener('click', () => {
    if (shortcutsDialog) shortcutsDialog.showModal();
  });

  closeDialogBtn.addEventListener('click', () => {
    if (shortcutsDialog) shortcutsDialog.close();
  });

  if (shortcutsDialog) {
    shortcutsDialog.addEventListener('click', (e) => {
      // Close when clicking backdrop
      const rect = shortcutsDialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        shortcutsDialog.close();
      }
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Avoid triggering if focus is on form inputs
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleStartPause();
    } else if (e.key === 'l' || e.key === 'L') {
      if (!lapBtn.disabled) {
        e.preventDefault();
        recordLap();
      }
    } else if (e.key === 'r' || e.key === 'R') {
      if (!resetBtn.disabled) {
        e.preventDefault();
        resetStopwatch();
      }
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      toggleStartPause();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleSound();
    } else if (e.key === 'Escape') {
      if (shortcutsDialog && shortcutsDialog.open) {
        shortcutsDialog.close();
      }
    }
  });

  // Restore User Settings from LocalStorage
  try {
    const savedTheme = localStorage.getItem('chronos-theme') || 'dark';
    applyTheme(savedTheme);

    const savedSound = localStorage.getItem('chronos-sound');
    if (savedSound === 'on') {
      isSoundEnabled = true;
      soundIcon.textContent = '🔊';
    }
  } catch (e) {}

  // Initial render
  updateDisplay(0, 0);
  renderLaps();

  console.log('⏱️ Chronos Precision Stopwatch initialized successfully.');
})();
