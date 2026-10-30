let notifPollTimer = null;

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderNotifications(data) {
  const badge = document.getElementById("notif-badge");
  const list = document.getElementById("notif-list");

  if (data.unread_count > 0) {
    badge.textContent = data.unread_count > 9 ? "9+" : data.unread_count;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }

  if (!data.notifications.length) {
    list.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
    return;
  }

  list.innerHTML = data.notifications
    .map(
      (n) => `
    <a class="notif-item ${n.is_read ? "" : "unread"}" href="${n.link || "#"}" data-id="${n.id}">
      <div class="notif-msg">${n.message}</div>
      <div class="notif-time">${timeAgo(n.created_at)}</div>
    </a>`
    )
    .join("");
}

async function loadNotifications() {
  try {
    const data = await apiFetch("/api/notifications");
    document.getElementById("notif-wrap").style.display = "inline-flex";
    renderNotifications(data);
  } catch (e) {
    document.getElementById("notif-wrap").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const bell = document.getElementById("notif-bell");
  const dropdown = document.getElementById("notif-dropdown");
  const markAll = document.getElementById("notif-mark-all");
  const list = document.getElementById("notif-list");

  bell.addEventListener("click", () => {
    const isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
    if (!isOpen) loadNotifications();
  });

  document.addEventListener("click", (e) => {
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  markAll.addEventListener("click", async (e) => {
    e.preventDefault();
    await apiFetch("/api/notifications/read-all", { method: "POST" });
    loadNotifications();
  });

  list.addEventListener("click", async (e) => {
    const item = e.target.closest(".notif-item");
    if (!item) return;
    await apiFetch(`/api/notifications/${item.dataset.id}/read`, { method: "POST" });
  });

  loadNotifications();
  notifPollTimer = setInterval(loadNotifications, 15000);
});