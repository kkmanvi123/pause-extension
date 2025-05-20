let lastActivityTime = Date.now();
let activityTimeout;

// Monitor mouse movement
document.addEventListener('mousemove', () => {
  updateActivity();
});

// Monitor keyboard activity
document.addEventListener('keydown', () => {
  updateActivity();
});

// Monitor scroll activity
document.addEventListener('scroll', () => {
  updateActivity();
});

function updateActivity() {
  lastActivityTime = Date.now();
  chrome.runtime.sendMessage({ type: 'USER_ACTIVE', timestamp: lastActivityTime });
}

// Notify background script when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    chrome.runtime.sendMessage({ type: 'TAB_ACTIVE' });
  }
});
