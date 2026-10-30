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

async function loadPendingItems() {
  const body = document.getElementById("admin-pending-items-body");
  const empty = document.getElementById("admin-pending-items-empty");
  const data = await apiFetch("/api/admin/items");
  const pending = data.items.filter((i) => i.approval === "pending");

  if (!pending.length) {
    empty.style.display = "block";
    body.innerHTML = "";
    return;
  }
  empty.style.display = "none";
  body.innerHTML = pending
    .map(
      (i) => `
    <tr>
      <td><a href="/items/${i.id}">${i.title}</a></td>
      <td><span class="badge badge-${i.type}">${i.type}</span></td>
      <td>${i.owner || "—"}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="reviewItem(${i.id}, 'approve')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="reviewItem(${i.id}, 'reject')">Reject</button>
      </td>
    </tr>`
    )
    .join("");
}

async function reviewItem(id, action) {
  await apiFetch(`/api/admin/items/${id}/${action}`, { method: "POST" });
  loadPendingItems();
  loadAllItems();
}

async function loadClaims() {
  const body = document.getElementById("admin-claims-body");
  const empty = document.getElementById("admin-claims-empty");
  const data = await apiFetch("/api/admin/claims");
  const pending = data.claims.filter((c) => c.status === "pending");

  if (!pending.length) {
    empty.style.display = "block";
    body.innerHTML = "";
    return;
  }
  empty.style.display = "none";
  body.innerHTML = pending
    .map(
      (c) => `
    <tr>
      <td><a href="/items/${c.item_id}">View item</a></td>
      <td>${c.claimant}</td>
      <td>${c.message}</td>
      <td><span class="badge badge-claimed">${c.status}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="reviewClaim(${c.id}, 'approve')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="reviewClaim(${c.id}, 'reject')">Reject</button>
      </td>
    </tr>`
    )
    .join("");
}

async function reviewClaim(id, action) {
  await apiFetch(`/api/admin/claims/${id}/${action}`, { method: "POST" });
  loadClaims();
}

async function loadAllItems() {
  const body = document.getElementById("admin-items-body");
  const data = await apiFetch("/api/admin/items");
  body.innerHTML = data.items
    .map(
      (i) => `
    <tr>
      <td><a href="/items/${i.id}">${i.title}</a></td>
      <td><span class="badge badge-${i.type}">${i.type}</span></td>
      <td>${i.owner || "—"}</td>
      <td>
        <span class="badge badge-${i.status}">${i.status}</span>
        <span class="badge">${i.approval || "approved"}</span>
      </td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteItem(${i.id})">Delete</button></td>
    </tr>`
    )
    .join("");
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await apiFetch(`/api/items/${id}`, { method: "DELETE" });
  loadPendingItems();
  loadAllItems();
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  loadPendingItems();
  loadClaims();
  loadAllItems();
});