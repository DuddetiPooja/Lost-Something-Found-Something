document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("found-form");
  const msg = document.getElementById("form-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    fd.append("type", "found");

    try {
      const res = await fetch("/api/items", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit report");
      showMsg(msg, "Reported — redirecting to your item...", "success");
      setTimeout(() => (window.location.href = `/items/${data.item.id}`), 800);
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  });
});
