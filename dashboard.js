function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

function status(nudge) {
  const now = Date.now();
  if (nudge.fired) return 'Passed';
  if (nudge.nudgeTime > now) return 'Upcoming';
  return 'Due';
}

function renderTable(nudges) {
  const tbody = document.querySelector('#nudge-table tbody');
  tbody.innerHTML = '';
  nudges
    .map((n, i) => ({ ...n, idx: i }))
    .sort((a, b) => a.nudgeTime - b.nudgeTime)
    .forEach(nudge => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="${nudge.url}" target="_blank">${nudge.title}</a></td>
        <td>${formatTime(nudge.createdAt)}</td>
        <td>${formatTime(nudge.nudgeTime)}</td>
        <td>${status(nudge)}</td>
        <td>
          <button class="delete-btn" data-idx="${nudge.idx}">delete</button>
          <button class="resched-btn" data-idx="${nudge.idx}">reschedule</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function loadNudges() {
  chrome.runtime.sendMessage({ type: 'GET_NUDGES' }, (nudges) => {
    renderTable(nudges || []);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadNudges();

  document.getElementById('nudge-table').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      chrome.runtime.sendMessage({ type: 'DELETE_NUDGE', idx }, loadNudges);
    }
    if (e.target.classList.contains('resched-btn')) {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      const newTime = prompt('Enter new nudge time (YYYY-MM-DD HH:MM):');
      if (newTime) {
        const ts = Date.parse(newTime.replace(/-/g, '/'));
        if (!isNaN(ts)) {
          chrome.runtime.sendMessage({ type: 'RESCHEDULE_NUDGE', idx, newTime: ts }, loadNudges);
        } else {
          alert('Invalid date/time format.');
        }
      }
    }
  });
}); 