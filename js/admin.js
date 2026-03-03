/* ═══════════════════════════════════════════════════════════
   admin.js — Admin panel logic
   ═══════════════════════════════════════════════════════════ */

const API_BASE = "/api";
const STORAGE_KEY = "lb_admin_key";

let adminKey = "";
let allPosts = [];
let tags = [];

// ── DOM refs ──────────────────────────────────────────────
const loginOverlay = document.getElementById("loginOverlay");
const loginInput = document.getElementById("loginInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const adminContent = document.getElementById("adminContent");
const logoutBtn = document.getElementById("logoutBtn");
const submitBtn = document.getElementById("submitBtn");
const adminPostsList = document.getElementById("adminPostsList");
const tagsWrap = document.getElementById("tagsWrap");
const tagsInput = document.getElementById("tagsInput");
const categoryDatalist = document.getElementById("categoryList");

// ── Tags state ────────────────────────────────────────────
let currentTags = [];

// ── Init ──────────────────────────────────────────────────
(function init() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    adminKey = saved;
    showAdmin();
  }

  loginBtn.addEventListener("click", attemptLogin);
  loginInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptLogin();
  });

  logoutBtn.addEventListener("click", logout);
  submitBtn.addEventListener("click", handleSubmit);
  tagsInput.addEventListener("keydown", handleTagInput);
  tagsWrap.addEventListener("click", () => tagsInput.focus());
})();

// ── Auth ──────────────────────────────────────────────────
async function attemptLogin() {
  const pw = loginInput.value.trim();
  if (!pw) {
    loginError.textContent = "Please enter a password.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Verifying…";
  loginError.textContent = "";

  // Verify against API — send a harmless GET with the key
  try {
    const res = await fetch(`${API_BASE}/post`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": pw,
      },
      body: JSON.stringify({ id: "__verify__" }),
    });

    // 200 or 400 (missing id but authed) = correct password
    // 401 = wrong password
    if (res.status === 401) {
      loginError.textContent = "Invalid password. Try again.";
      loginInput.value = "";
    } else {
      adminKey = pw;
      sessionStorage.setItem(STORAGE_KEY, pw);
      showAdmin();
    }
  } catch {
    loginError.textContent = "Connection error. Is the server running?";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Authenticate";
  }
}

function showAdmin() {
  loginOverlay.style.display = "none";
  adminContent.style.display = "grid";
  loadPosts();
}

function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
  adminKey = "";
  loginOverlay.style.display = "flex";
  adminContent.style.display = "none";
  loginInput.value = "";
  loginError.textContent = "";
}

// ── Fetch posts ───────────────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    allPosts = data.posts || [];
    const categories = data.categories || [];

    updateStats(allPosts, categories);
    populateCategoryList(categories);
    renderAdminPosts(allPosts);
    renderAdminFilters(categories);
  } catch (err) {
    adminPostsList.innerHTML = `<p style="color:var(--danger);font-size:0.85rem">Failed to load posts: ${err.message}</p>`;
  }
}

function updateStats(posts, categories) {
  const allTags = new Set(posts.flatMap((p) => p.tags || []));
  setEl("adminStatPosts", posts.length);
  setEl("adminStatCats", categories.length);
  setEl("adminStatTags", allTags.size);
  setEl("adminPostCount", `(${posts.length})`);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function populateCategoryList(categories) {
  categoryDatalist.innerHTML = categories
    .map((c) => `<option value="${escapeHtml(c)}">`)
    .join("");
}

function renderAdminFilters(categories) {
  const container = document.getElementById("adminFilterTags");
  if (!container) return;
  container.innerHTML = categories
    .sort()
    .map(
      (c) => `
    <button class="filter-tag" onclick="filterAdmin('${escapeHtml(c)}')" style="text-align:left;border-radius:6px;">
      ${escapeHtml(c)}
    </button>`
    )
    .join("");
}

window.filterAdmin = function (cat) {
  const filtered = allPosts.filter(
    (p) => p.category === cat || (p.tags || []).includes(cat)
  );
  renderAdminPosts(filtered);
};

// ── Render admin list ─────────────────────────────────────
function renderAdminPosts(posts) {
  if (posts.length === 0) {
    adminPostsList.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p>No posts yet. Create one above!</p>
      </div>`;
    return;
  }

  adminPostsList.innerHTML = posts
    .map(
      (p, i) => `
    <div class="admin-post-row" style="animation-delay:${i * 0.04}s">
      <div class="admin-post-info">
        <div class="admin-post-title">${escapeHtml(p.title)}</div>
        <div class="admin-post-meta">
          <span style="color:var(--accent)">${escapeHtml(p.category)}</span>
          ${p.tags && p.tags.length ? ` · ${p.tags.map((t) => escapeHtml(t)).join(", ")}` : ""}
          · ${formatDate(p.createdAt)}
        </div>
      </div>
      <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="nav-btn" title="Preview" style="font-size:0.75rem">
        ↗
      </a>
      <button class="btn-delete" onclick="deletePost('${escapeHtml(p.id)}')">
        Delete
      </button>
    </div>`
    )
    .join("");
}

// ── Tags input ────────────────────────────────────────────
function handleTagInput(e) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = tagsInput.value.replace(",", "").trim();
    if (val && !currentTags.includes(val)) {
      addTag(val);
    }
    tagsInput.value = "";
  } else if (e.key === "Backspace" && tagsInput.value === "") {
    if (currentTags.length > 0) {
      removeTag(currentTags[currentTags.length - 1]);
    }
  }
}

function addTag(tag) {
  currentTags.push(tag);
  renderTagChips();
}

function removeTag(tag) {
  currentTags = currentTags.filter((t) => t !== tag);
  renderTagChips();
}

function renderTagChips() {
  const chips = tagsWrap.querySelectorAll(".tag-chip");
  chips.forEach((c) => c.remove());

  currentTags.forEach((tag) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.innerHTML = `
      ${escapeHtml(tag)}
      <button class="tag-chip-remove" onclick="removeTagByName('${escapeHtml(tag)}')">&times;</button>
    `;
    tagsWrap.insertBefore(chip, tagsInput);
  });
}

window.removeTagByName = function (tag) {
  removeTag(tag);
};

// ── Submit ────────────────────────────────────────────────
async function handleSubmit() {
  const title = document.getElementById("fTitle").value.trim();
  const description = document.getElementById("fDesc").value.trim();
  const url = document.getElementById("fUrl").value.trim();
  const category = document.getElementById("fCategory").value.trim();

  if (!title || !url || !category) {
    showToast("Title, URL, and Category are required.", "error");
    return;
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    showToast("Please enter a valid URL.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/></svg>
    Publishing…`;

  try {
    const res = await fetch(`${API_BASE}/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ title, description, url, category, tags: currentTags }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to publish");
    }

    showToast("Post published successfully!", "success");
    resetForm();
    await loadPosts();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Publish Post`;
  }
}

function resetForm() {
  document.getElementById("fTitle").value = "";
  document.getElementById("fDesc").value = "";
  document.getElementById("fUrl").value = "";
  document.getElementById("fCategory").value = "";
  currentTags = [];
  renderTagChips();
}

// ── Delete ────────────────────────────────────────────────
window.deletePost = async function (id) {
  if (!confirm("Delete this post? This cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/post`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) throw new Error("Delete failed");

    showToast("Post deleted.", "success");
    await loadPosts();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");
  const icons = { success: "✓", error: "✕", info: "●" };
  toastIcon.textContent = icons[type] || "●";
  toastMsg.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}
