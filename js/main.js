/* main.js — public reader page */
const API = "/api";
let all = [], activeFilter = "all", query = "";

const grid       = document.getElementById("postsGrid");
const filterBar  = document.getElementById("filterBar");
const searchInput= document.getElementById("searchInput");

(async () => {
  await load();
  searchInput.addEventListener("input", () => {
    query = searchInput.value.toLowerCase().trim();
    render(filtered());
  });
})();

async function load() {
  try {
    const res  = await fetch(`${API}/posts`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    all = data.posts || [];
    updateStats(all);
    buildFilters();
    render(all);
  } catch (e) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">⚡</div><p class="empty-t">Could not load posts</p><p class="empty-s">${e.message}</p></div>`;
  }
}

function updateStats(posts) {
  const tags = new Set(posts.flatMap(p => p.tags || []));
  const cats = new Set(posts.map(p => p.category).filter(Boolean));
  animCount("sPosts", posts.length);
  animCount("sCats",  cats.size);
  animCount("sTags",  tags.size);
}

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const t0  = performance.now();
  const run = now => {
    const t = Math.min((now - t0) / 700, 1);
    el.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
    if (t < 1) requestAnimationFrame(run);
    else el.textContent = target;
  };
  requestAnimationFrame(run);
}

function buildFilters() {
  const labels = new Set();
  all.forEach(p => {
    if (p.category) labels.add(p.category);
    (p.tags || []).forEach(t => labels.add(t));
  });
  filterBar.innerHTML = `<button class="ftag on" data-f="all">All</button>`;
  [...labels].sort().forEach(l => {
    const btn = document.createElement("button");
    btn.className = "ftag";
    btn.dataset.f  = l;
    btn.textContent = l;
    btn.addEventListener("click", () => setFilter(l));
    filterBar.appendChild(btn);
  });
  filterBar.querySelector("[data-f='all']").addEventListener("click", () => setFilter("all"));
}

function setFilter(f) {
  activeFilter = f;
  filterBar.querySelectorAll(".ftag").forEach(b => b.classList.toggle("on", b.dataset.f === f));
  render(filtered());
}

function filtered() {
  return all.filter(p => {
    const mf = activeFilter === "all" || p.category === activeFilter || (p.tags||[]).includes(activeFilter);
    const ms = !query ||
      p.title.toLowerCase().includes(query) ||
      (p.description||"").toLowerCase().includes(query) ||
      (p.category||"").toLowerCase().includes(query) ||
      (p.tags||[]).some(t => t.toLowerCase().includes(query));
    return mf && ms;
  });
}

function render(posts) {
  if (!posts.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><p class="empty-t">Nothing found</p><p class="empty-s">Try a different filter or search term.</p></div>`;
    return;
  }
  grid.innerHTML = posts.map((p, i) => `
    <article class="card" style="animation-delay:${i * 0.05}s">
      <div class="card-top-bar"></div>
      <div class="card-body">
        <div class="post-meta">
          <div class="post-avatar">${getInitials(p.title)}</div>
          <div class="post-meta-info">
            <div class="post-author">
              Space Pirate
              <span class="post-author-badge">Admin</span>
            </div>
            <div class="post-time">${fmt(p.createdAt)}</div>
          </div>
          <span class="post-cat">${esc(p.category)}</span>
        </div>
        <h2 class="card-title">${esc(p.title)}</h2>
        ${p.description ? `<p class="card-desc">${esc(p.description)}</p>` : ""}
        ${p.tags?.length ? `<div class="card-tags">${p.tags.map(t=>`<span class="ctag" onclick="filterByTag('${esc(t)}')">${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="card-footer">
        <a href="${esc(p.url)}" target="_blank" rel="noopener" class="card-link">
          Open Resource
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
      </div>
    </article>`).join("");
}

window.filterByTag = t => {
  searchInput.value = "";
  query = "";
  setFilter(t);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function getInitials(str) {
  return (str || "?").charAt(0).toUpperCase();
}

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
