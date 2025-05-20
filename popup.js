// Load settings and update UI
function loadSettings() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || {
      breakInterval: 45,
      workdayStart: 9,
      workdayEnd: 17,
      breakCount: 0
    };

    document.getElementById('break-interval').value = settings.breakInterval;
    document.getElementById('workday-start').value = settings.workdayStart;
    document.getElementById('workday-end').value = settings.workdayEnd;
    document.getElementById('break-count').textContent = settings.breakCount;
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

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Load last break time
  chrome.storage.local.get('settings', (data) => {
    if (data.settings && data.settings.lastBreak) {
      document.getElementById('last-break').textContent = data.settings.lastBreak;
    }
  });
});
  