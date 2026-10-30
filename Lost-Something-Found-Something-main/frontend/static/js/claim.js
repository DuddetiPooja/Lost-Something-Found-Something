document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("claim-form");
  const msg = document.getElementById("form-msg");
  const itemId = form.dataset.itemId;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      message: document.getElementById("message").value,
      proof_details: document.getElementById("proof_details").value,
    };
    try {
      await apiFetch(`/api/items/${itemId}/claims`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      showMsg(msg, "Claim submitted — the reporter and an admin will review it.", "success");
      setTimeout(() => (window.location.href = `/items/${itemId}`), 1000);
    } catch (err) {
      showMsg(msg, err.message, "error");
    }
  });
});
