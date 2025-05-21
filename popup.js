document.addEventListener('DOMContentLoaded', () => {
  const options = document.querySelectorAll('#nudge-options button');
  const confirm = document.getElementById('nudge-confirm');
  const dashboardBtn = document.getElementById('view-dashboard');

  let currentTab = null;
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    currentTab = tabs[0];
  });

  options.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentTab) return;
      const mins = parseInt(btn.getAttribute('data-mins'), 10);
      const now = Date.now();
      const nudgeTime = now + mins * 60 * 1000;
      const nudge = {
        url: currentTab.url,
        title: currentTab.title,
        nudgeTime,
        createdAt: now,
        fired: false
      };
      chrome.runtime.sendMessage({ type: 'SAVE_NUDGE', nudge }, (res) => {
        if (res && res.ok) {
          confirm.textContent = `✅ Nudge set for ${new Date(nudgeTime).toLocaleString()}`;
          confirm.style.display = '';
        } else {
          confirm.textContent = res && res.error ? `⚠️ ${res.error}` : '⚠️ Error saving nudge.';
          confirm.style.display = '';
        }
      });
    });
  });

  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });
});
