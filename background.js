// Default settings
const DEFAULT_SETTINGS = {
  breakInterval: 45, // minutes
  workdayStart: 9, // 9 AM
  workdayEnd: 17, // 5 PM
  snoozeDuration: 10, // minutes
  breakCount: 0
};

// Break suggestions
const BREAK_SUGGESTIONS = [
  "Take a deep breath",
  "Stand up and stretch",
  "Drink some water",
  "Look away from the screen",
  "Do a quick neck roll",
  "Take a short walk",
  "Practice mindful breathing"
];

let lastActivityTime = Date.now();
let isWorkday = true;

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  setupAlarm();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_ACTIVE') {
    lastActivityTime = message.timestamp;
  } else if (message.type === 'TAB_ACTIVE') {
    checkWorkdayStatus();
  }
});

// Check if current time is within workday hours
function checkWorkdayStatus() {
  const now = new Date();
  const hour = now.getHours();
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || DEFAULT_SETTINGS;
    isWorkday = hour >= settings.workdayStart && hour < settings.workdayEnd;
  });
}

// Setup alarm for break reminders
function setupAlarm() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || DEFAULT_SETTINGS;
    chrome.alarms.create('pauseReminder', {
      delayInMinutes: settings.breakInterval,
      periodInMinutes: settings.breakInterval
    });
  });
}

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pauseReminder' && isWorkday) {
    const suggestion = BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Time for a Mindful Break',
      message: suggestion,
      buttons: [
        { title: 'Take Break' },
        { title: 'Snooze 10min' }
      ],
      priority: 2
    });
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // Take Break
    chrome.storage.local.get(['settings'], (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      settings.breakCount++;
      chrome.storage.local.set({ settings });
    });
  } else if (buttonIndex === 1) { // Snooze
    chrome.storage.local.get('settings', (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      chrome.alarms.create('pauseReminder', {
        delayInMinutes: settings.snoozeDuration
      });
    });
  }
});
