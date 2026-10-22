function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).style.display = "block";
    });
  });
}

async function loadDashboard() {
  try {
    const data = await apiFetch("/api/dashboard");

    const itemsBody = document.getElementById("my-items-body");
    const itemsEmpty = document.getElementById("my-items-empty");
    if (!data.items.length) {
      itemsEmpty.style.display = "block";
    } else {
      itemsBody.innerHTML = data.items
        .map(
          (i) => `
        <tr>
          <td><a href="/items/${i.id}">${i.title}</a></td>
          <td><span class="badge badge-${i.type}">${i.type}</span></td>
          <td><span class="badge badge-${i.status}">${i.status}</span></td>
          <td>${new Date(i.created_at).toLocaleDateString()}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteItem(${i.id})">Delete</button></td>
        </tr>`
        )
        .join("");
    }

    const claimsBody = document.getElementById("my-claims-body");
    const claimsEmpty = document.getElementById("my-claims-empty");
    if (!data.claims.length) {
      claimsEmpty.style.display = "block";
    } else {
      claimsBody.innerHTML = data.claims
        .map(
          (c) => `
        <tr>
          <td><a href="/items/${c.item_id}">View item</a></td>
          <td>${c.message}</td>
          <td><span class="badge badge-${c.status === "approved" ? "resolved" : c.status === "rejected" ? "lost" : "claimed"}">${c.status}</span></td>
          <td>${new Date(c.created_at).toLocaleDateString()}</td>
        </tr>`
        )
        .join("");
    }
  } catch (err) {
    window.location.href = "/login";
  }
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await apiFetch(`/api/items/${id}`, { method: "DELETE" });
  loadDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  loadDashboard();
});
