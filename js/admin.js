/* admin.js — admin panel */
const API = "/api";
const SK = "lb_key";
let adminKey = "", all = [], chips = [];

const loginScreen = document.getElementById("loginScreen");
const adminWrap   = document.getElementById("adminWrap");
const loginInput  = document.getElementById("loginInput");
const loginBtn    = document.getElementById("loginBtn");
const loginErr    = document.getElementById("loginErr");
const tagsField   = document.getElementById("tagsField");
const tagsInput   = document.getElementById("tagsInput");
const catList     = document.getElementById("catList");
const submitBtn   = document.getElementById("submitBtn");
const plist       = document.getElementById("plist");

// ── INIT ──────────────────────────────────────────────
(function(){
  const saved = sessionStorage.getItem(SK);
  if (saved) { adminKey = saved; showAdmin(); }
  loginBtn.addEventListener("click", tryLogin);
  loginInput.addEventListener("keydown", e => e.key === "Enter" && tryLogin());
  document.getElementById("logoutBtn").addEventListener("click", logout);
  submitBtn.addEventListener("click", handleSubmit);
  tagsInput.addEventListener("keydown", onTagKey);
  tagsField.addEventListener("click", () => tagsInput.focus());
})();

// ── AUTH ──────────────────────────────────────────────
async function tryLogin() {
  const pw = loginInput.value.trim();
  if (!pw) { loginErr.textContent = "Please enter a password."; return; }
  loginBtn.disabled = true;
  loginBtn.textContent = "Verifying…";
  loginErr.textContent = "";
  try {
    const res = await fetch(`${API}/post`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": pw },
      body: JSON.stringify({ id: "__verify__" })
    });
    if (res.status === 401) {
      loginErr.textContent = "Wrong password.";
      loginInput.value = "";
    } else {
      adminKey = pw;
      sessionStorage.setItem(SK, pw);
      showAdmin();
    }
  } catch {
    loginErr.textContent = "Connection error.";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Enter Dashboard";
  }
}

function showAdmin() {
  loginScreen.style.display = "none";
  adminWrap.style.display = "block";
  loadPosts();
}

function logout() {
  sessionStorage.removeItem(SK);
  adminKey = "";
  loginScreen.style.display = "flex";
  adminWrap.style.display = "none";
  loginInput.value = "";
  loginErr.textContent = "";
}

// ── LOAD POSTS ────────────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`${API}/posts`);
    const data = await res.json();
    all = data.posts || [];
    const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
    const tags = new Set(all.flatMap(p => p.tags || []));

    setEl("sbPosts", all.length);
    setEl("sbCats", cats.length);
    setEl("sbTags", tags.size);
    setEl("ptsCount", `${all.length} post${all.length !== 1 ? "s" : ""}`);

    // Populate datalist
    catList.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join("");

    // Sidebar cats
    const sbCatList = document.getElementById("sbCatList");
    sbCatList.innerHTML = cats.sort().map(c => `
      <button class="sb-cat" onclick="filterPosts('${esc(c)}')">${esc(c)}</button>
    `).join("") || `<p style="font-size:.75rem;color:var(--muted)">No categories yet</p>`;

    renderPosts(all);
  } catch (e) {
    plist.innerHTML = `<p style="color:var(--coral);font-size:.82rem;padding:1rem">Failed to load: ${e.message}</p>`;
  }
}

window.filterPosts = cat => renderPosts(cat ? all.filter(p => p.category === cat || (p.tags||[]).includes(cat)) : all);

// ── RENDER POSTS ──────────────────────────────────────
function renderPosts(posts) {
  if (!posts.length) {
    plist.innerHTML = `<div style="text-align:center;padding:2.5rem;color:var(--muted);font-size:.85rem">No posts yet. Create one above!</div>`;
    return;
  }
  plist.innerHTML = posts.map((p, i) => `
    <div class="prow" style="animation-delay:${i * 0.035}s">
      <span class="prow-cat">${esc(p.category)}</span>
      <div class="prow-info">
        <div class="prow-t">${esc(p.title)}</div>
        <div class="prow-m">${fmt(p.createdAt)}${p.tags?.length ? " · " + p.tags.map(t => esc(t)).join(", ") : ""}</div>
      </div>
      <a href="${esc(p.url)}" target="_blank" rel="noopener" class="btn-prev" title="Preview">↗</a>
      <button class="btn-del" onclick="delPost('${esc(p.id)}')">Delete</button>
    </div>`).join("");
}

// ── TAGS ──────────────────────────────────────────────
function onTagKey(e) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const v = tagsInput.value.replace(",", "").trim();
    if (v && !chips.includes(v)) { chips.push(v); renderChips(); }
    tagsInput.value = "";
  } else if (e.key === "Backspace" && !tagsInput.value && chips.length) {
    chips.pop();
    renderChips();
  }
}

function renderChips() {
  tagsField.querySelectorAll(".tchip").forEach(c => c.remove());
  chips.forEach(tag => {
    const el = document.createElement("div");
    el.className = "tchip";
    el.innerHTML = `${esc(tag)}<button class="tchip-x" onclick="removeChip('${esc(tag)}')">&times;</button>`;
    tagsField.insertBefore(el, tagsInput);
  });
}

window.removeChip = tag => { chips = chips.filter(t => t !== tag); renderChips(); };

// ── SUBMIT ────────────────────────────────────────────
async function handleSubmit() {
  const title = document.getElementById("fTitle").value.trim();
  const desc  = document.getElementById("fDesc").value.trim();
  const url   = document.getElementById("fUrl").value.trim();
  const cat   = document.getElementById("fCat").value.trim();

  if (!title || !url || !cat) { toast("Title, URL and Category are required.", "error"); return; }
  try { new URL(url); } catch { toast("Please enter a valid URL.", "error"); return; }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg> Publishing…`;

  try {
    const res = await fetch(`${API}/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ title, description: desc, url, category: cat, tags: chips })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
    toast("Post published!", "success");
    resetForm();
    await loadPosts();
  } catch (e) {
    toast(e.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Publish Post`;
  }
}

function resetForm() {
  ["fTitle","fDesc","fUrl","fCat"].forEach(id => document.getElementById(id).value = "");
  chips = [];
  renderChips();
}

// ── DELETE ────────────────────────────────────────────
window.delPost = async id => {
  if (!confirm("Delete this post?")) return;
  try {
    const res = await fetch(`${API}/post`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error("Delete failed");
    toast("Post deleted.", "success");
    await loadPosts();
  } catch (e) {
    toast(e.message, "error");
  }
};

// ── HELPERS ───────────────────────────────────────────
function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function setEl(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  document.getElementById("toastIcon").textContent = { success: "✓", error: "✕", info: "●" }[type] || "●";
  el.className = `toast ${type}`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3400);
}
