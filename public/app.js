const API = window.location.origin;

// --- State ---
let token = localStorage.getItem("token");
let email = localStorage.getItem("email");

// --- DOM ---
const loggedOut = document.getElementById("logged-out");
const loggedIn = document.getElementById("logged-in");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const myLinks = document.getElementById("my-links");

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// --- Auth ---
function setLoggedIn(newToken, newEmail) {
  token = newToken;
  email = newEmail;
  localStorage.setItem("token", token);
  localStorage.setItem("email", email);
  updateUI();
}

function logout() {
  token = null;
  email = null;
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  updateUI();
}

function updateUI() {
  if (token) {
    loggedOut.hidden = true;
    loggedIn.hidden = false;
    userEmail.textContent = email;
    myLinks.hidden = false;
    loadMyLinks();
    // Switch to shorten tab
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    document.getElementById("shorten-tab").classList.add("active");
  } else {
    loggedOut.hidden = false;
    loggedIn.hidden = true;
    myLinks.hidden = true;
  }
}

logoutBtn.addEventListener("click", logout);

// --- Register ---
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("register-error");
  errEl.hidden = true;

  const emailVal = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailVal, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    errEl.textContent = data.error;
    errEl.hidden = false;
    return;
  }

  setLoggedIn(data.token, data.user.email);
  showFlash("Account created!");
});

// --- Login ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  errEl.hidden = true;

  const emailVal = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailVal, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    errEl.textContent = data.error;
    errEl.hidden = false;
    return;
  }

  setLoggedIn(data.token, data.user.email);
  showFlash("Logged in!");
});

// --- Shorten ---
document.getElementById("shorten-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("shorten-error");
  const resultEl = document.getElementById("shorten-result");
  errEl.hidden = true;
  resultEl.hidden = true;

  const url = document.getElementById("url-input").value;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}/links`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    errEl.textContent = data.error;
    errEl.hidden = false;
    return;
  }

  const shortUrl = `${API}/${data.link.short_code}`;
  const shortUrlEl = document.getElementById("short-url");
  shortUrlEl.href = shortUrl;
  shortUrlEl.textContent = shortUrl;
  document.getElementById("existing-note").hidden = !data.existing;
  resultEl.hidden = false;

  // Refresh links table if logged in
  if (token) loadMyLinks();
});

// --- Copy ---
document.getElementById("copy-btn").addEventListener("click", () => {
  const url = document.getElementById("short-url").textContent;
  navigator.clipboard.writeText(url);
  document.getElementById("copy-btn").textContent = "Copied!";
  setTimeout(() => {
    document.getElementById("copy-btn").textContent = "Copy";
  }, 1500);
});

// --- My Links ---
async function loadMyLinks() {
  const res = await fetch(`${API}/links`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  const tbody = document.getElementById("links-body");
  const noLinks = document.getElementById("no-links");
  const linksTable = document.getElementById("links-table");

  if (data.links.length === 0) {
    tbody.innerHTML = "";
    linksTable.hidden = true;
    noLinks.hidden = false;
    return;
  }

  linksTable.hidden = false;
  noLinks.hidden = true;
  tbody.innerHTML = data.links
    .map((link) => {
      const shortUrl = `${API}/${link.short_code}`;
      const date = new Date(link.created_at).toLocaleDateString();
      const original =
        link.original_url.length > 40
          ? link.original_url.slice(0, 40) + "..."
          : link.original_url;
      return `<tr>
        <td><a href="${shortUrl}" target="_blank">${link.short_code}</a></td>
        <td><a href="${link.original_url}" target="_blank">${original}</a></td>
        <td>${link.click_count}</td>
        <td>${date}</td>
        <td><button class="delete-btn" data-id="${link.id}">Delete</button></td>
      </tr>`;
    })
    .join("");
}

// --- Delete link ---
document.getElementById("links-body").addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-btn")) return;
  const id = e.target.dataset.id;
  const res = await fetch(`${API}/links/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) loadMyLinks();
});

// --- Flash message ---
function showFlash(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText =
    "position:fixed;top:1rem;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:0.5rem 1.2rem;border-radius:4px;font-size:0.9rem;z-index:999;";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// --- Init ---
updateUI();
