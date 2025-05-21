// NudgeLater background.js

const STORAGE_KEY = 'nudgelater_nudges';

// Helper: get all nudges
function getNudges(cb) {
  chrome.storage.local.get([STORAGE_KEY], res => {
    cb(res[STORAGE_KEY] || []);
  });
}

// Helper: save all nudges
function saveNudges(nudges, cb) {
  chrome.storage.local.set({ [STORAGE_KEY]: nudges }, cb);
}

function scheduleAlarm(nudge, idx) {
  chrome.alarms.create(`nudge_${idx}`, { when: nudge.nudgeTime });
}

function clearAlarm(idx) {
  chrome.alarms.clear(`nudge_${idx}`);
}

// Set up alarm to check every minute
chrome.alarms.create('nudgeCheck', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nudgeCheck') {
    getNudges((nudges) => {
      const now = Date.now();
      nudges.forEach((nudge, idx) => {
        if (!nudge.fired && now >= nudge.nudgeTime) {
          // Fire notification
          chrome.notifications.create(`nudge-${nudge.nudgeTime}-${idx}`, {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'NudgeLater Reminder',
            message: `Time to revisit: ${nudge.title}`,
            buttons: [{ title: 'Open Now' }],
            priority: 2
          });
          nudge.fired = true;
        }
      });
      saveNudges(nudges);
    });
  }
});

// Notification button click: open URL
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId.startsWith('nudge-') && btnIdx === 0) {
    getNudges((nudges) => {
      const nudge = nudges.find(n =>
        notifId.includes(n.nudgeTime)
      );
      if (nudge) chrome.tabs.create({ url: nudge.url });
    });
  }
});

// Clean up past nudges (older than 7 days after firing)
function cleanupNudges() {
  getNudges((nudges) => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const filtered = nudges.filter(n =>
      !n.fired || (n.fired && now - n.nudgeTime < week)
    );
    if (filtered.length !== nudges.length) saveNudges(filtered);
  });
}
chrome.alarms.create('nudgeCleanup', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nudgeCleanup') cleanupNudges();
});

// Listen for popup/dashboard requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  let responded = false;
  function safeSendResponse(data) {
    if (!responded) {
      responded = true;
      sendResponse(data);
    }
  }
  try {
    if (msg.type === 'GET_NUDGES') {
      getNudges((nudges) => {
        safeSendResponse(nudges);
      });
      return true;
    }
    if (msg.type === 'SAVE_NUDGE') {
      getNudges(nudges => {
        nudges.push(msg.nudge);
        saveNudges(nudges, () => {
          scheduleAlarm(msg.nudge, nudges.length - 1);
          safeSendResponse({ ok: true });
        });
      });
      return true;
    }
    if (msg.type === 'DELETE_NUDGE') {
      getNudges(nudges => {
        nudges.splice(msg.idx, 1);
        saveNudges(nudges, () => {
          clearAlarm(msg.idx);
          nudges.forEach((n, i) => scheduleAlarm(n, i));
          safeSendResponse({ ok: true });
        });
      });
      return true;
    }
    if (msg.type === 'RESCHEDULE_NUDGE') {
      getNudges(nudges => {
        if (nudges[msg.idx]) {
          nudges[msg.idx].nudgeTime = msg.newTime;
          nudges[msg.idx].fired = false;
          saveNudges(nudges, () => {
            scheduleAlarm(nudges[msg.idx], msg.idx);
            safeSendResponse({ ok: true });
          });
        } else {
          safeSendResponse({ ok: false, error: 'Nudge not found' });
        }
      });
      return true;
    }
  } catch (e) {
    safeSendResponse({ ok: false, error: e.message });
  }
  // fallback: always respond if not handled
  setTimeout(() => safeSendResponse({ ok: false, error: 'No response from background script.' }), 1000);
  return true;
});

// Clean up alarms if nudges are deleted or changed
chrome.runtime.onStartup.addListener(() => {
  getNudges(nudges => {
    chrome.alarms.clearAll(() => {
      nudges.forEach((n, i) => scheduleAlarm(n, i));
    });
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});
