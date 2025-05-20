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
let activityMetrics = {
  keystrokes: 0,
  mouseMoves: 0,
  tabSwitches: 0,
  mediaActive: false,
  activeMinutes: 0,
  lastMetricsUpdate: Date.now(),
  activityHistory: [] // {timestamp, keystrokes, mouseMoves, tabSwitches, mediaActive}
};
let lastActiveMinute = null;
let socialMediaSeconds = 0;
let socialMediaActive = false;

// Initialize settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  setupAlarm();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_ACTIVE') {
    lastActivityTime = message.timestamp;
    // Track active minutes
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes();
    if (lastActiveMinute !== minute) {
      activityMetrics.activeMinutes++;
      lastActiveMinute = minute;
      saveMetrics();
    }
  } else if (message.type === 'TAB_ACTIVE') {
    checkWorkdayStatus();
  } else if (message.type === 'ACTIVITY_METRICS') {
    // Aggregate metrics
    activityMetrics.keystrokes += message.metrics.keystrokes;
    activityMetrics.mouseMoves += message.metrics.mouseMoves;
    activityMetrics.tabSwitches += message.metrics.tabSwitches;
    activityMetrics.mediaActive = activityMetrics.mediaActive || message.metrics.mediaActive;
    activityMetrics.activityHistory.push({
      timestamp: Date.now(),
      keystrokes: message.metrics.keystrokes,
      mouseMoves: message.metrics.mouseMoves,
      tabSwitches: message.metrics.tabSwitches,
      mediaActive: message.metrics.mediaActive
    });
    // Social media
    if (message.metrics.socialActive) {
      socialMediaSeconds += message.metrics.socialActiveSeconds;
      socialMediaActive = true;
    } else {
      socialMediaActive = false;
    }
    // Keep only last 2 hours of history
    activityMetrics.activityHistory = activityMetrics.activityHistory.filter(e => Date.now() - e.timestamp < 2 * 60 * 60 * 1000);
    saveMetrics();
  } else if (message.type === 'GET_METRICS') {
    // Calculate averages for the last 30 minutes
    const now = Date.now();
    const recent = activityMetrics.activityHistory.filter(e => now - e.timestamp < 30 * 60 * 1000);
    const typingFreq = recent.reduce((a, b) => a + b.keystrokes, 0) / 30;
    const mouseFreq = recent.reduce((a, b) => a + b.mouseMoves, 0) / 30;
    const tabSwitchFreq = recent.reduce((a, b) => a + b.tabSwitches, 0) * 2; // per hour
    const mediaActive = recent.some(e => e.mediaActive);
    chrome.storage.local.get(['settings', 'breakTimes'], (data) => {
      // Calculate avg time between breaks
      let avgBreakTime = 'N/A';
      if (data.breakTimes && data.breakTimes.length > 1) {
        let diffs = [];
        for (let i = 1; i < data.breakTimes.length; i++) {
          diffs.push((data.breakTimes[i] - data.breakTimes[i-1]) / 60000);
        }
        avgBreakTime = (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1) + ' min';
      }
      // Smart break recommendation
      let nextBreak = data.settings ? data.settings.breakInterval : 45;
      if (typingFreq > 10 || mouseFreq > 20 || tabSwitchFreq > 10 || mediaActive) {
        nextBreak = Math.max(20, nextBreak - 10); // Suggest sooner break if very active
      }
      // Calculate work health score
      let healthScore = 0; // 0-100
      // Recent activity (last 30 min)
      const recentActivity = recent.reduce((a, b) => a + b.keystrokes + b.mouseMoves + b.tabSwitches, 0) / 30;
      // Health score logic
      // -1 for each minute over 60 min without a break
      // -1 for each 10 keystrokes/min over 15
      // -1 for each 20 mouse moves/min over 30
      // -10 if mediaActive
      // +10 for each break in last 2 hours
      // +10 for at least 10 min idle in last hour
      let lastBreakTime = data.settings && data.settings.lastBreak ? data.settings.lastBreak : 'N/A';
      let breakCount = data.settings ? data.settings.breakCount : 0;
      let breakTimes = data.breakTimes || [];
      if (breakTimes.length > 1) {
        let diffs = [];
        for (let i = 1; i < breakTimes.length; i++) {
          diffs.push((breakTimes[i] - breakTimes[i-1]) / 60000);
        }
        avgBreakTime = (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1) + ' min';
      }
      // Time since last break
      let minsSinceBreak = 0;
      if (breakTimes.length > 0) minsSinceBreak = Math.floor((Date.now() - breakTimes[breakTimes.length-1]) / 60000);
      healthScore = 100;
      if (minsSinceBreak > 60) healthScore -= (minsSinceBreak - 60);
      if (recentActivity > 15) healthScore -= Math.floor((recentActivity - 15) / 10);
      if (recentActivity > 30) healthScore -= Math.floor((recentActivity - 30) / 20);
      if (mediaActive) healthScore -= 10;
      // Breaks in last 2 hours
      let recentBreaks = breakTimes.filter(t => Date.now() - t < 2 * 60 * 60 * 1000).length;
      healthScore += 10 * recentBreaks;
      // Idle time (no activity) in last hour
      let idleMinutes = 60 - recent.length;
      if (idleMinutes > 10) healthScore += 10;
      if (healthScore > 100) healthScore = 100;
      if (healthScore < 0) healthScore = 0;
      // Health zone
      let healthZone = 'green';
      if (healthScore < 40) healthZone = 'red';
      else if (healthScore < 70) healthZone = 'yellow';
      // Social media warning
      let socialWarn = socialMediaSeconds > 600; // >10 min in last hour
      // Next break estimate
      let nextBreakEstimate = 'N/A';
      if (breakTimes.length > 0) {
        let interval = data.settings ? data.settings.breakInterval : 45;
        let mins = interval - minsSinceBreak;
        nextBreakEstimate = mins > 0 ? `~${mins} min` : 'Now';
      }
      sendResponse({
        typingFreq: Math.round(typingFreq),
        mouseFreq: Math.round(mouseFreq),
        tabSwitchFreq: Math.round(tabSwitchFreq),
        mediaActive,
        activeMinutes: activityMetrics.activeMinutes,
        breakCount,
        lastBreak: lastBreakTime,
        avgBreakTime,
        healthScore,
        healthZone,
        socialWarn,
        nextBreakEstimate
      });
    });
    return true;
  }
});

function saveMetrics() {
  chrome.storage.local.set({ activityMetrics });
}

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
    chrome.storage.local.get(['settings', 'breakTimes'], (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      settings.breakCount++;
      settings.lastBreak = new Date().toLocaleTimeString();
      // Track break times for avg calculation
      let breakTimes = data.breakTimes || [];
      breakTimes.push(Date.now());
      chrome.storage.local.set({ settings, breakTimes });
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
