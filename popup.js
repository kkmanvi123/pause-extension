// Nudge popup.js

let selectedMins = null;

// Handle preset button selection
const presetBtns = document.querySelectorAll('.preset-btn');
presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMins = parseInt(btn.getAttribute('data-mins'), 10);
    document.getElementById('custom-time').value = '';
  });
});

document.getElementById('custom-time').addEventListener('input', () => {
  presetBtns.forEach(b => b.classList.remove('selected'));
  selectedMins = null;
});

document.getElementById('set-btn').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = '';
  let remindTime = null;
  if (selectedMins) {
    remindTime = Date.now() + selectedMins * 60 * 1000;
  } else {
    const customVal = document.getElementById('custom-time').value;
    if (!customVal) {
      status.textContent = 'Please select a time.';
      return;
    }
    remindTime = Date.parse(customVal);
    if (isNaN(remindTime) || remindTime <= Date.now()) {
      status.textContent = 'Please enter a valid future time.';
      return;
    }
  }
  // Get current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.url) {
      status.textContent = 'Could not get current tab.';
      return;
    }
    chrome.runtime.sendMessage({
      type: 'SET_REMINDER',
      url: tab.url,
      title: tab.title || tab.url,
      time: remindTime
    }, resp => {
      if (resp && resp.ok) {
        status.textContent = 'Reminder set!';
      } else {
        status.textContent = 'Failed to set reminder.';
      }
    });
  });
}); 