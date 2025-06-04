// Nudge dashboard.js

const STORAGE_KEY = 'nudge_reminders';

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

function loadReminders() {
  chrome.storage.local.get([STORAGE_KEY], res => {
    const reminders = res[STORAGE_KEY] || [];
    const tbody = document.querySelector('#reminders-table tbody');
    tbody.innerHTML = '';
    reminders.forEach((reminder, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${reminder.title}</td>
        <td><a href="${reminder.url}" target="_blank">${reminder.url}</a></td>
        <td>${formatTime(reminder.time)}</td>
        <td><button class="delete-btn" data-idx="${idx}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadReminders();
  document.getElementById('reminders-table').addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      chrome.storage.local.get([STORAGE_KEY], res => {
        const reminders = res[STORAGE_KEY] || [];
        const reminder = reminders[idx];
        if (reminder) {
          reminders.splice(idx, 1);
          chrome.storage.local.set({ [STORAGE_KEY]: reminders }, () => {
            chrome.alarms.clear(reminder.alarmName, loadReminders);
          });
        }
      });
    }
  });
}); 