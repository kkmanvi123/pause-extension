// Nudge background.js

// Store reminders as { url, title, time, alarmName }
const STORAGE_KEY = 'nudge_reminders';

// Listen for messages from popup to set a reminder
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SET_REMINDER') {
    chrome.storage.local.get([STORAGE_KEY], res => {
      const reminders = res[STORAGE_KEY] || [];
      const alarmName = `nudge_${Date.now()}`;
      reminders.push({
        url: msg.url,
        title: msg.title,
        time: msg.time,
        alarmName
      });
      chrome.storage.local.set({ [STORAGE_KEY]: reminders }, () => {
        chrome.alarms.create(alarmName, { when: msg.time });
        sendResponse({ ok: true });
      });
    });
    return true;
  }
});

// When an alarm fires, show a notification
chrome.alarms.onAlarm.addListener(alarm => {
  if (!alarm.name.startsWith('nudge_')) return;
  chrome.storage.local.get([STORAGE_KEY], res => {
    let reminders = res[STORAGE_KEY] || [];
    const idx = reminders.findIndex(r => r.alarmName === alarm.name);
    if (idx !== -1) {
      const reminder = reminders[idx];
      chrome.notifications.create(alarm.name, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon.png'),
        title: 'Nudge Reminder',
        message: `Revisit: ${reminder.title}`,
        buttons: [{ title: 'Open Tab' }],
        priority: 2
      });
      // Do NOT remove the reminder here; remove after notification click
    }
  });
});

// Handle notification button click
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId.startsWith('nudge_') && btnIdx === 0) {
    chrome.storage.local.get([STORAGE_KEY], res => {
      let reminders = res[STORAGE_KEY] || [];
      const idx = reminders.findIndex(r => r.alarmName === notifId);
      if (idx !== -1) {
        const reminder = reminders[idx];
        chrome.windows.create({ url: reminder.url, focused: true });
        // Remove after opening
        reminders.splice(idx, 1);
        chrome.storage.local.set({ [STORAGE_KEY]: reminders });
      }
    });
  }
});