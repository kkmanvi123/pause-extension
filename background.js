chrome.alarms.create('pauseReminder', { delayInMinutes: 45, periodInMinutes: 45 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pauseReminder') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Time to Pause',
      message: 'Take a quick breath, stretch, or sip some water.',
      priority: 2
    });
  }
});
