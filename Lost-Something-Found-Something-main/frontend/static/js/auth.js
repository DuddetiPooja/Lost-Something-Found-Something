async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `form-msg ${type}`;
}

async function refreshNav() {
  const area = document.getElementById("nav-auth-area");
  if (!area) return;
  try {
    const { user } = await apiFetch("/api/me");
    if (user) {
      area.innerHTML = `
        <a href="/dashboard">Dashboard</a>
        ${user.is_admin ? '<a href="/admin">Admin</a>' : ""}
        <a href="#" id="logout-link">Log out (${user.name})</a>
      `;
      document.getElementById("logout-link").addEventListener("click", async (e) => {
        e.preventDefault();
        await apiFetch("/api/logout", { method: "POST" });
        window.location.href = "/";
      });
    } else {
      area.innerHTML = `<a href="/login">Log in</a> <a href="/register" class="btn btn-primary btn-sm">Sign up</a>`;
    }
  } catch (e) {
    area.innerHTML = `<a href="/login">Log in</a>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refreshNav();

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("form-msg");
      const body = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      };
      try {
        await apiFetch("/api/login", { method: "POST", body: JSON.stringify(body) });
        window.location.href = "/dashboard";
      } catch (err) {
        showMsg(msg, err.message, "error");
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("form-msg");
      const body = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      };
      try {
        await apiFetch("/api/register", { method: "POST", body: JSON.stringify(body) });
        window.location.href = "/dashboard";
      } catch (err) {
        showMsg(msg, err.message, "error");
      }
    });
  }
});
