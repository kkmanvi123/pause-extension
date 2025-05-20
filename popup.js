document.getElementById('take-break').addEventListener('click', () => {
    const time = new Date().toLocaleTimeString();
    chrome.storage.local.set({ lastBreak: time });
    document.getElementById('last-break').textContent = time;
  });
  
  chrome.storage.local.get('lastBreak', (data) => {
    if (data.lastBreak) {
      document.getElementById('last-break').textContent = data.lastBreak;
    }
  });
  