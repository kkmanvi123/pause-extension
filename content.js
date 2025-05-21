let lastActivityTime = Date.now();
let keystrokes = 0;
let mouseMoves = 0;
let tabSwitches = 0;
let lastTabActive = document.visibilityState === 'visible';
let mediaActive = false;

const SOCIAL_DOMAINS = [
  'linkedin.com', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'tiktok.com', 'reddit.com'
];
let socialActive = false;
let socialActiveSeconds = 0;
let lastSocialCheck = Date.now();

// New metrics
let activityTimestamps = [];
let breakPeriods = [];
let lastBreakStart = null;
let isActive = true;
let lastCheck = Date.now();

function recordActivity() {
  const now = Date.now();
  activityTimestamps.push(now);
  if (!isActive) {
    // End break
    if (lastBreakStart) {
      breakPeriods.push({ start: lastBreakStart, end: now });
      lastBreakStart = null;
    }
    isActive = true;
  }
}

// Track keystrokes
window.addEventListener('keydown', () => {
  keystrokes++;
  updateActivity();
  recordActivity();
});

// Track mouse movement
window.addEventListener('mousemove', () => {
  mouseMoves++;
  updateActivity();
  recordActivity();
});

// Track tab switches
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!lastTabActive) {
      tabSwitches++;
      lastTabActive = true;
      chrome.runtime.sendMessage({ type: 'TAB_ACTIVE' });
      recordActivity();
    }
  } else {
    lastTabActive = false;
  }
});

// Detect media activity (audio/video)
function checkMediaActivity() {
  const videos = document.querySelectorAll('video');
  const audios = document.querySelectorAll('audio');
  mediaActive = false;
  videos.forEach(video => {
    if (!video.paused && !video.ended && video.readyState > 2) {
      mediaActive = true;
    }
  });
  audios.forEach(audio => {
    if (!audio.paused && !audio.ended && audio.readyState > 2) {
      mediaActive = true;
    }
  });
}

function checkSocialMedia() {
  const isSocial = SOCIAL_DOMAINS.some(domain => window.location.hostname.includes(domain));
  if (isSocial) {
    socialActive = true;
    socialActiveSeconds += Math.floor((Date.now() - lastSocialCheck) / 1000);
  } else {
    socialActive = false;
  }
  lastSocialCheck = Date.now();
}

function checkBreakPeriod() {
  const now = Date.now();
  // If no activity for 5+ min, start a break
  if (isActive && now - lastActivityTime > 5 * 60 * 1000) {
    lastBreakStart = now;
    isActive = false;
  }
}

setInterval(() => {
  checkMediaActivity();
  checkSocialMedia();
  checkBreakPeriod();
  // Intensity: weighted sum (keystrokes*2 + mouseMoves*1 + tabSwitches*3)
  const intensity = keystrokes * 2 + mouseMoves * 1 + tabSwitches * 3;
  chrome.runtime.sendMessage({
    type: 'ACTIVITY_METRICS',
    metrics: {
      keystrokes,
      mouseMoves,
      tabSwitches,
      mediaActive,
      socialActive,
      socialActiveSeconds,
      activityTimestamps: [...activityTimestamps],
      breakPeriods: [...breakPeriods],
      intensity,
      timestamp: Date.now()
    }
  });
  // Reset counters for the next interval
  keystrokes = 0;
  mouseMoves = 0;
  tabSwitches = 0;
  socialActiveSeconds = 0;
  activityTimestamps = [];
  breakPeriods = [];
}, 30000);

function updateActivity() {
  lastActivityTime = Date.now();
  chrome.runtime.sendMessage({ type: 'USER_ACTIVE', timestamp: lastActivityTime });
}
