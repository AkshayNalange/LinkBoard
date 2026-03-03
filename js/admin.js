/* admin.js — admin panel */
const API = "/api";
const SK  = "lb_key";
let adminKey = "", all = [], editingId = null;

const CATEGORIES = [
  "Tutorial","Documentation","Article","Video","Course",
  "Tool","Reference","Research","News","Case Study",
  "Cheat Sheet","Book","Podcast","Blog Post","GitHub Repo"
];

const PRESET_TAGS = [
  // Knowledge & Learning
  "Tutorial", "Cheat Sheet", "Research Paper", "Case Study", "Book Summary",
  "Course Notes", "Best Practices", "Documentation", "Interview Prep", "How-To Guide",
  "Deep Dive", "Beginner Friendly", "Advanced", "Quick Read", "Must Read",

  // Tech (Generic)
  "AI/ML", "Web Dev", "Mobile App", "DevOps", "Cloud",
  "Cybersecurity", "Open Source", "Software", "Tool", "Free Tool",
  "Productivity App", "Browser Extension", "API", "Database", "UI/UX",

  // Software & Services
  "Free", "Freemium", "Paid", "Subscription", "One-Time Purchase",
  "SaaS", "Self-Hosted", "No-Code", "Low-Code", "Open Access",

  // News & Updates
  "News", "Breaking", "Tech Trends", "Industry Report", "Product Launch",
  "Version Release", "Changelog", "Analysis", "Opinion", "Weekly Digest",

  // Entertainment
  "Movies", "TV Series", "Drama", "Anime", "Documentary",
  "Streaming", "Netflix", "YouTube", "Podcast", "Short Film",
  "Web Series", "Reality TV", "Comedy", "Thriller", "Sci-Fi",

  // Gen Z & Social
  "#viral", "#trending", "#mustsee", "#hidden gem", "#underrated",
  "#overrated", "#ngl", "#lowkey", "#based", "#no cap",
  "#slaps", "#goated", "#fomo", "#vibe check", "#main character",

  // General Interest
  "Health", "Finance", "Career", "Self Improvement", "Psychology",
  "Science", "History", "Philosophy", "Design", "Art",
  "Gaming", "Fitness", "Food", "Travel", "Environment",

  // Resource Type
  "PDF", "Video", "Article", "Newsletter", "Infographic",
  "Template", "Dataset", "Repo", "Blog Post", "Whitepaper"
];

let selectedCats = [];

// ── DOM REFS ──────────────────────────────────────
const loginScreen = document.getElementById("loginScreen");
const adminWrap   = document.getElementById("adminWrap");
const loginInput  = document.getElementById("loginInput");
const loginBtn    = document.getElementById("loginBtn");
const loginErr    = document.getElementById("loginErr");
const submitBtn   = document.getElementById("submitBtn");
const feed        = document.getElementById("feed");
const catTrigger  = document.getElementById("catTrigger");
const catDropdown = document.getElementById("catDropdown");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// ── INIT ──────────────────────────────────────────
(function() {
  const saved = sessionStorage.getItem(SK);
  if (saved) { adminKey = saved; showAdmin(); }

  loginBtn.addEventListener("click", tryLogin);
  loginInput.addEventListener("keydown", e => e.key === "Enter" && tryLogin());
  document.getElementById("logoutBtn").addEventListener("click", logout);
  submitBtn.addEventListener("click", handleSubmit);
  cancelEditBtn.addEventListener("click", cancelEdit);

  buildCatDropdown();
  buildTagsGrid();

  document.addEventListener("click", e => {
    const wrap = document.getElementById("catWrap");
    if (wrap && !wrap.contains(e.target)) closeCatDropdown();
  });

  catTrigger.addEventListener("click", toggleCatDropdown);

  const toggle = document.getElementById("sidebarToggle");
  const content = document.getElementById("sidebarContent");
  if (toggle && content) {
    toggle.addEventListener("click", () => {
      const isOpen = content.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
    });
  }
})();

// ── AUTH ──────────────────────────────────────────
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
      loginErr.textContent = "Invalid password. Try again.";
      loginInput.value = "";
    } else {
      adminKey = pw;
      sessionStorage.setItem(SK, pw);
      showAdmin();
    }
  } catch {
    loginErr.textContent = "Connection error. Check your setup.";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Enter Dashboard →";
  }
}

function showAdmin() {
  loginScreen.style.display = "none";
  adminWrap.style.display   = "block";
  loadPosts();
}

function logout() {
  sessionStorage.removeItem(SK);
  adminKey = "";
  loginScreen.style.display = "flex";
  adminWrap.style.display   = "none";
  loginInput.value = "";
  loginErr.textContent = "";
}

// ── LOAD POSTS ────────────────────────────────────
async function loadPosts() {
  try {
    const res  = await fetch(`${API}/posts`);
    const data = await res.json();
    all = data.posts || [];

    // Parse categories (can be comma-separated)
    const catSet = new Set();
    all.forEach(p => {
      if (p.category) p.category.split(",").map(c => c.trim()).filter(Boolean).forEach(c => catSet.add(c));
    });
    const cats = [...catSet].sort();
    const tags = new Set(all.flatMap(p => p.tags || []));

    setEl("sbPosts", all.length);
    setEl("sbCats",  cats.length);
    setEl("sbTags",  tags.size);
    setEl("feedCount", `${all.length} post${all.length !== 1 ? "s" : ""}`);

    const sbCatList = document.getElementById("sbCatList");
    if (sbCatList) {
      sbCatList.innerHTML = cats.map(c =>
        `<button class="sb-cat" onclick="filterFeed('${esc(c)}')">${esc(c)}</button>`
      ).join("") || `<p style="font-size:.74rem;color:var(--warm-gray2);padding:4px 2px">No categories yet</p>`;
    }

    renderFeed(all);
  } catch (e) {
    if (feed) feed.innerHTML = `<p style="color:var(--red);font-size:.85rem;padding:1rem">Failed to load: ${esc(e.message)}</p>`;
  }
}

window.filterFeed = cat => {
  if (!cat) { renderFeed(all); return; }
  renderFeed(all.filter(p => {
    const cats = (p.category || "").split(",").map(c => c.trim());
    return cats.includes(cat) || (p.tags || []).includes(cat);
  }));
};

// ── RENDER FEED ───────────────────────────────────
function renderFeed(posts) {
  if (!posts.length) {
    feed.innerHTML = `<div style="text-align:center;padding:2.5rem;color:var(--warm-gray)"><p style="font-family:var(--ff-d);font-size:1.15rem;font-style:italic">No posts yet</p><p style="font-size:.82rem;margin-top:.4rem">Publish your first post above!</p></div>`;
    return;
  }
  feed.innerHTML = posts.map((p, i) => `
    <div class="post-card" style="animation-delay:${i * 0.04}s">
      <div class="post-card-header">
        <img src="icon/post_picture.png" alt="Space Pirate" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);flex-shrink:0;"/>
        <div class="pc-meta">
          <div class="pc-author">Space Pirate <span class="pc-badge">Admin</span></div>
          <div class="pc-time">${fmt(p.createdAt)}</div>
        </div>
        <span class="pc-cat">${esc(p.category.split(",")[0].trim())}</span>
      </div>
      <div class="post-card-body">
        <div class="pc-title">${esc(p.title)}</div>
        ${p.description ? `<div class="pc-desc">${esc(p.description)}</div>` : ""}
        <span class="pc-url">${esc(p.url)}</span>
        ${p.tags && p.tags.length ? `<div class="pc-tags">${p.tags.map(t => `<span class="pc-tag">${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="post-card-footer">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="btn-preview-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          Open
        </a>
        <span class="pc-likes">🔥 ${p.likes || 0}</span>
        <button class="btn-edit" onclick="editPost('${esc(p.id)}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn-del" onclick="delPost('${esc(p.id)}')">
          Delete
        </button>
      </div>
    </div>`).join("");
}

// ── CATEGORY MULTI-SELECT ─────────────────────────
function buildCatDropdown() {
  catDropdown.innerHTML = CATEGORIES.map(c => `
    <div class="ms-option" data-cat="${esc(c)}" onclick="toggleCat('${esc(c)}')">
      <div class="ms-checkbox"></div>
      ${esc(c)}
    </div>`).join("");
}

function toggleCatDropdown() {
  const isOpen = catDropdown.classList.toggle("open");
  catTrigger.classList.toggle("open", isOpen);
}

function closeCatDropdown() {
  catDropdown.classList.remove("open");
  catTrigger.classList.remove("open");
}

window.toggleCat = function(cat) {
  selectedCats = selectedCats.includes(cat)
    ? selectedCats.filter(c => c !== cat)
    : [...selectedCats, cat];
  updateCatUI();
};

function updateCatUI() {
  // Rebuild trigger content
  catTrigger.innerHTML = "";
  if (!selectedCats.length) {
    catTrigger.innerHTML = `<span class="ms-placeholder">Select categories…</span>`;
  } else {
    selectedCats.forEach(c => {
      const chip = document.createElement("div");
      chip.className = "ms-chip";
      chip.innerHTML = `${esc(c)}<button class="ms-chip-x" onclick="event.stopPropagation();toggleCat('${esc(c)}')">&times;</button>`;
      catTrigger.appendChild(chip);
    });
  }
  catTrigger.innerHTML += `<svg class="ms-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

  catDropdown.querySelectorAll(".ms-option").forEach(opt => {
    opt.classList.toggle("selected", selectedCats.includes(opt.dataset.cat));
  });
}

// ── TAGS GRID ─────────────────────────────────────
function buildTagsGrid() {
  const tagsGrid = document.getElementById("tagsGrid");
  if (!tagsGrid) return;
  tagsGrid.innerHTML = PRESET_TAGS.map(tag => {
    const safeId = "tag_" + tag.replace(/[^a-zA-Z0-9]/g, "_");
    return `
    <div>
      <input type="checkbox" class="tag-checkbox" id="${safeId}" value="${esc(tag)}"/>
      <label class="tag-label" for="${safeId}">
        <span class="tag-check-icon">✓</span>${esc(tag)}
      </label>
    </div>`;
  }).join("");
}

function getSelectedTags() {
  return [...document.querySelectorAll(".tag-checkbox:checked")].map(cb => cb.value);
}

// ── EDIT MODE ─────────────────────────────────────
window.editPost = function(id) {
  const post = all.find(p => p.id === id);
  if (!post) return;

  editingId = id;

  // Fill form fields
  document.getElementById("fTitle").value = post.title || "";
  document.getElementById("fDesc").value  = post.description || "";
  document.getElementById("fUrl").value   = post.url || "";

  // Set categories
  selectedCats = post.category ? post.category.split(",").map(c => c.trim()).filter(Boolean) : [];
  updateCatUI();

  // Set tags
  document.querySelectorAll(".tag-checkbox").forEach(cb => {
    cb.checked = (post.tags || []).includes(cb.value);
  });

  // Switch form to edit mode UI
  document.getElementById("fhIcon").textContent   = "✎";
  document.getElementById("fhTitle").textContent  = "Edit Post";
  document.getElementById("fhSub").textContent    = `Editing: "${post.title}"`;
  document.getElementById("submitLabel").textContent = "Save Changes";
  document.getElementById("submitIcon").innerHTML = `<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>`;
  cancelEditBtn.style.display = "inline-flex";

  // Highlight form card and scroll to it
  const formCard = document.getElementById("formCard");
  formCard.classList.add("editing");
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
};

function cancelEdit() {
  editingId = null;
  resetForm();
  document.getElementById("fhIcon").textContent   = "✦";
  document.getElementById("fhTitle").textContent  = "Publish New Post";
  document.getElementById("fhSub").textContent    = "Posted as \"Space Pirate\"";
  document.getElementById("submitLabel").textContent = "Publish Post";
  document.getElementById("submitIcon").innerHTML = `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`;
  cancelEditBtn.style.display = "none";
  document.getElementById("formCard").classList.remove("editing");
}

// ── SUBMIT (create or update) ─────────────────────
async function handleSubmit() {
  const title = document.getElementById("fTitle").value.trim();
  const desc  = document.getElementById("fDesc").value.trim();
  const url   = document.getElementById("fUrl").value.trim();
  const tags  = getSelectedTags();

  if (!title) { toast("Title is required.", "error"); return; }
  if (!url)   { toast("URL is required.", "error"); return; }
  if (!selectedCats.length) { toast("Please select at least one category.", "error"); return; }

  try { new URL(url); }
  catch { toast("Please enter a valid URL (include https://).", "error"); return; }

  const category = selectedCats.join(", ");
  const isEditing = !!editingId;

  submitBtn.disabled = true;
  document.getElementById("submitLabel").textContent = isEditing ? "Saving…" : "Publishing…";

  try {
    if (isEditing) {
      // Delete old post then create new one with same data (preserves likes)
      await fetch(`${API}/post`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: editingId })
      });
    }

    const res = await fetch(`${API}/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ title, description: desc, url, category, tags })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || (isEditing ? "Failed to save" : "Failed to publish"));
    }

    toast(isEditing ? "Post updated successfully! ✏️" : "Post published successfully! 🎉", "success");
    cancelEdit();
    await loadPosts();
  } catch (e) {
    toast(e.message, "error");
  } finally {
    submitBtn.disabled = false;
    document.getElementById("submitLabel").textContent = editingId ? "Save Changes" : (isEditing ? "Save Changes" : "Publish Post");
  }
}

function resetForm() {
  document.getElementById("fTitle").value = "";
  document.getElementById("fDesc").value  = "";
  document.getElementById("fUrl").value   = "";
  selectedCats = [];
  updateCatUI();
  closeCatDropdown();
  document.querySelectorAll(".tag-checkbox").forEach(cb => cb.checked = false);
}

// ── DELETE ────────────────────────────────────────
window.delPost = async function(id) {
  if (!confirm("Delete this post? This cannot be undone.")) return;
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

// ── HELPERS ───────────────────────────────────────
function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function setEl(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  document.getElementById("toastMsg").textContent = msg;
  document.getElementById("toastIcon").textContent = { success: "✓", error: "✕", info: "●" }[type] || "●";
  el.className = `toast ${type}`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
}
