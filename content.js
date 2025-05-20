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

// Track keystrokes
window.addEventListener('keydown', () => {
  keystrokes++;
  updateActivity();
});

// Track mouse movement
window.addEventListener('mousemove', () => {
  mouseMoves++;
  updateActivity();
});

// Track tab switches
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (!lastTabActive) {
      tabSwitches++;
      lastTabActive = true;
      chrome.runtime.sendMessage({ type: 'TAB_ACTIVE' });
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

setInterval(() => {
  checkMediaActivity();
  checkSocialMedia();
  // Send metrics to background every 30 seconds
  chrome.runtime.sendMessage({
    type: 'ACTIVITY_METRICS',
    metrics: {
      keystrokes,
      mouseMoves,
      tabSwitches,
      mediaActive,
      socialActive,
      socialActiveSeconds
    }
  });
  // Reset counters for the next interval
  keystrokes = 0;
  mouseMoves = 0;
  tabSwitches = 0;
  socialActiveSeconds = 0;
}, 30000);

function updateActivity() {
  lastActivityTime = Date.now();
  chrome.runtime.sendMessage({ type: 'USER_ACTIVE', timestamp: lastActivityTime });
}
