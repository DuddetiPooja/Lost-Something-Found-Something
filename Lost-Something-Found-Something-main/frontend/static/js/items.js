function itemCard(item) {
  const img = item.image_url
    ? `<img class="card-img" src="${item.image_url}" alt="${item.title}">`
    : `<div class="card-img"></div>`;
  return `
    <a class="card" href="/items/${item.id}" style="text-decoration:none;color:inherit;">
      ${img}
      <div class="card-body">
        <span class="badge badge-${item.type}">${item.type}</span>
        <h3>${item.title}</h3>
        <div class="card-meta">${item.location || "Location not specified"}</div>
      </div>
    </a>`;
}

async function loadItems() {
  const type = document.getElementById("filter-type").value;
  const status = document.getElementById("filter-status").value;
  const q = document.getElementById("filter-q").value;

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const grid = document.getElementById("items-grid");
  const empty = document.getElementById("items-empty");

  try {
    const data = await apiFetch(`/api/items?${params.toString()}`);
    if (!data.items.length) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = data.items.map(itemCard).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load items right now.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const urlType = new URLSearchParams(window.location.search).get("type");
  if (urlType) document.getElementById("filter-type").value = urlType;

  ["filter-type", "filter-status"].forEach((id) =>
    document.getElementById(id).addEventListener("change", loadItems)
  );
  let debounce;
  document.getElementById("filter-q").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(loadItems, 300);
  });

  loadItems();
});
