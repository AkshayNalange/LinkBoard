/* ═══════════════════════════════════════════════════════════
   main.js — Public reader page
   ═══════════════════════════════════════════════════════════ */

const API_BASE = "/api";

let allPosts = [];
let activeFilter = "all";
let searchQuery = "";

// ── DOM refs ──────────────────────────────────────────────
const grid = document.getElementById("postsGrid");
const filterTagsEl = document.getElementById("filterTags");
const searchInput = document.getElementById("searchInput");

// ── Init ──────────────────────────────────────────────────
(async () => {
  await loadPosts();
  bindSearch();
})();

// ── Fetch ─────────────────────────────────────────────────
async function loadPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    const data = await res.json();

    allPosts = data.posts || [];
    const categories = data.categories || [];

    updateStats(allPosts, categories);
    renderFilterTags(categories);
    renderPosts(allPosts);
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <h3 class="empty-title">Could not load posts</h3>
        <p class="empty-text">${err.message}</p>
      </div>`;
    showToast("Failed to load posts", "error");
  }
}

// ── Stats ─────────────────────────────────────────────────
function updateStats(posts, categories) {
  const allTags = new Set(posts.flatMap((p) => p.tags || []));

  animateCount("stat-posts", posts.length);
  animateCount("stat-cats", categories.length);
  animateCount("stat-tags", allTags.size);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(easeOut(t) * target);
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ── Filter tags ───────────────────────────────────────────
function renderFilterTags(categories) {
  // Keep "All" button
  const existing = filterTagsEl.querySelector('[data-filter="all"]');
  filterTagsEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "filter-tag" + (activeFilter === "all" ? " active" : "");
  allBtn.dataset.filter = "all";
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => setFilter("all"));
  filterTagsEl.appendChild(allBtn);

  // Collect unique categories + tags from posts
  const labels = new Set();
  allPosts.forEach((p) => {
    if (p.category) labels.add(p.category);
    (p.tags || []).forEach((t) => labels.add(t));
  });

  [...labels].sort().forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "filter-tag" + (activeFilter === label ? " active" : "");
    btn.dataset.filter = label;
    btn.textContent = label;
    btn.style.animationDelay = `${Math.random() * 0.3}s`;
    btn.addEventListener("click", () => setFilter(label));
    filterTagsEl.appendChild(btn);
  });
}

function setFilter(filter) {
  activeFilter = filter;
  filterTagsEl.querySelectorAll(".filter-tag").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderPosts(filtered());
}

// ── Search ────────────────────────────────────────────────
function bindSearch() {
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.toLowerCase().trim();
    renderPosts(filtered());
  });
}

function filtered() {
  return allPosts.filter((p) => {
    const matchFilter =
      activeFilter === "all" ||
      p.category === activeFilter ||
      (p.tags || []).includes(activeFilter);

    const matchSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery) ||
      (p.description || "").toLowerCase().includes(searchQuery) ||
      (p.category || "").toLowerCase().includes(searchQuery) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchQuery));

    return matchFilter && matchSearch;
  });
}

// ── Render ────────────────────────────────────────────────
function renderPosts(posts) {
  if (posts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">Nothing found</h3>
        <p class="empty-text">Try a different search term or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = posts
    .map(
      (post, i) => `
    <article class="card" style="animation-delay:${i * 0.05}s">
      <div class="card-top">
        <span class="card-category">${escapeHtml(post.category)}</span>
        <span class="card-date">${formatDate(post.createdAt)}</span>
      </div>
      <h2 class="card-title">${escapeHtml(post.title)}</h2>
      ${post.description ? `<p class="card-desc">${escapeHtml(post.description)}</p>` : ""}
      ${
        post.tags && post.tags.length
          ? `<div class="card-tags">${post.tags
              .map(
                (t) =>
                  `<span class="tag" onclick="filterByTag('${escapeHtml(t)}')">${escapeHtml(t)}</span>`
              )
              .join("")}</div>`
          : ""
      }
      <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" class="card-link">
        Open Resource
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
      </a>
    </article>`
    )
    .join("");
}

// ── Tag click ─────────────────────────────────────────────
window.filterByTag = function (tag) {
  searchInput.value = "";
  searchQuery = "";
  setFilter(tag);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ── Helpers ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");
  const icons = { success: "✓", error: "✕", info: "●" };
  toastIcon.textContent = icons[type] || "●";
  toastMsg.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}
