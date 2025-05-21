// Load settings and update UI
function loadSettings() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || {
      breakInterval: 45,
      workdayStart: 9,
      workdayEnd: 17
    };

    document.getElementById('break-interval').value = settings.breakInterval;
    document.getElementById('workday-start').value = settings.workdayStart;
    document.getElementById('workday-end').value = settings.workdayEnd;
  });
}

// Save settings
document.getElementById('save-settings').addEventListener('click', () => {
  const settings = {
    breakInterval: parseInt(document.getElementById('break-interval').value),
    workdayStart: parseInt(document.getElementById('workday-start').value),
    workdayEnd: parseInt(document.getElementById('workday-end').value)
  };

  chrome.storage.local.get('settings', (data) => {
    const currentSettings = data.settings || {};
    settings.breakCount = currentSettings.breakCount || 0;
    settings.lastBreak = currentSettings.lastBreak || 'N/A';
    
    chrome.storage.local.set({ settings }, () => {
      // Update alarm with new interval
      chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
      
      // Show confirmation
      const saveButton = document.getElementById('save-settings');
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 2000);
    });
  });
});

// Handle manual break recording
document.getElementById('take-break').addEventListener('click', () => {
  const time = new Date().toLocaleTimeString();
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || {};
    settings.lastBreak = time;
    settings.breakCount = (settings.breakCount || 0) + 1;
    
    chrome.storage.local.set({ settings }, () => {
      document.getElementById('last-break').textContent = time;
      document.getElementById('break-count').textContent = settings.breakCount;
    });
  });
});

// --- UI Update Functions ---
function updateHowWellBar(metrics) {
  const bar = document.getElementById('howwell-bar');
  const label = document.getElementById('howwell-score-label');
  bar.style.width = metrics.howWellScore + '%';
  label.textContent = metrics.howWellScore;
  if (metrics.howWellZone === 'green') {
    bar.style.background = '#2e6e4c';
  } else if (metrics.howWellZone === 'yellow') {
    bar.style.background = '#e6c94c';
  } else {
    bar.style.background = '#e74c3c';
  }
}

function renderProgressGraph(timeline) {
  const svg = document.getElementById('progress-graph');
  svg.innerHTML = '';
  if (!timeline || timeline.length < 2) return;
  // X: time of day, Y: intensity (0-100+)
  const width = 300, height = 60;
  const today = new Date(); today.setHours(0,0,0,0);
  const minTs = today.getTime();
  const maxTs = minTs + 24 * 60 * 60 * 1000;
  // Downsample to 60 points (1 per ~15 min)
  const points = [];
  for (let i = 0; i < 60; i++) {
    const t0 = minTs + (i * 24 * 60 * 60 * 1000) / 60;
    const t1 = minTs + ((i+1) * 24 * 60 * 60 * 1000) / 60;
    const slice = timeline.filter(e => e.ts >= t0 && e.ts < t1);
    let avg = 0;
    if (slice.length > 0) {
      avg = slice.reduce((a, b) => a + (b.intensity || 0), 0) / slice.length;
    }
    points.push(avg);
  }
  // Normalize Y
  const maxY = Math.max(100, ...points);
  const path = points.map((y, i) => {
    const px = (i / 59) * width;
    const py = height - (y / maxY) * (height - 8) - 4;
    return `${i === 0 ? 'M' : 'L'}${px},${py}`;
  }).join(' ');
  svg.innerHTML = `<path d="${path}" stroke="#2e6e4c" stroke-width="2" fill="none" />`;
}

// --- Existing UI Update Functions ---
function updateHealthBar(metrics) {
  const bar = document.getElementById('health-bar');
  const label = document.getElementById('health-score-label');
  bar.style.width = metrics.healthScore + '%';
  label.textContent = metrics.healthScore;
  if (metrics.healthZone === 'green') {
    bar.style.background = '#2e6e4c';
  } else if (metrics.healthZone === 'yellow') {
    bar.style.background = '#e6c94c';
  } else {
    bar.style.background = '#e74c3c';
  }
}

function updateSocialWarning(metrics) {
  const icon = document.getElementById('social-warning');
  icon.style.display = metrics.socialWarn ? '' : 'none';
}

function updateNextBreak(metrics) {
  document.getElementById('next-break-estimate').textContent = metrics.nextBreakEstimate;
}

function updateProgress(metrics) {
  document.getElementById('break-count').textContent = metrics.breakCount;
  document.getElementById('last-break').textContent = metrics.lastBreak;
}

function fetchAndDisplayMetrics() {
  chrome.runtime.sendMessage({ type: 'GET_METRICS' }, (metrics) => {
    if (metrics) {
      updateHowWellBar(metrics);
      renderProgressGraph(metrics.timeline);
      updateHealthBar(metrics);
      updateSocialWarning(metrics);
      updateNextBreak(metrics);
      updateProgress(metrics);
    }
  });
}

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  fetchAndDisplayMetrics();
  
  // Load last break time
  chrome.storage.local.get('settings', (data) => {
    if (data.settings && data.settings.lastBreak) {
      document.getElementById('last-break').textContent = data.settings.lastBreak;
    }
  });
});

// --- Break Toggle Button ---
let onBreak = false;
const breakBtn = document.getElementById('break-toggle');
breakBtn.addEventListener('click', () => {
  onBreak = !onBreak;
  breakBtn.textContent = onBreak ? 'End Break' : 'Start Break';
  if (onBreak) {
    // Mark break start
    chrome.storage.local.get(['settings', 'breakTimes'], (data) => {
      const settings = data.settings || {};
      settings.lastBreak = new Date().toLocaleTimeString();
      settings.breakCount = (settings.breakCount || 0) + 1;
      let breakTimes = data.breakTimes || [];
      breakTimes.push(Date.now());
      chrome.storage.local.set({ settings, breakTimes }, fetchAndDisplayMetrics);
    });
  }
});
  