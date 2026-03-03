/* main.js — public reader page */
const API = "/api";
let all = [], activeFilter = "all", query = "";

const grid        = document.getElementById("postsGrid");
const filterBar   = document.getElementById("filterBar");
const searchInput = document.getElementById("searchInput");

// Track liked post IDs in localStorage (per device)
const LIKED_KEY = "lb_liked";
function getLiked() {
  try { return JSON.parse(localStorage.getItem(LIKED_KEY) || "{}"); } catch { return {}; }
}
function saveLiked(obj) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(obj)); } catch {}
}

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
    if (p.category) {
      // Support comma-separated categories
      p.category.split(",").map(c => c.trim()).filter(Boolean).forEach(c => labels.add(c));
    }
    (p.tags || []).forEach(t => labels.add(t));
  });
  filterBar.innerHTML = `<button class="ftag on" data-f="all">All</button>`;
  [...labels].sort().forEach(l => {
    const btn = document.createElement("button");
    btn.className   = "ftag";
    btn.dataset.f   = l;
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
    // Category can be comma-separated
    const cats = (p.category || "").split(",").map(c => c.trim());
    const mf = activeFilter === "all"
      || cats.includes(activeFilter)
      || (p.tags || []).includes(activeFilter);
    const ms = !query
      || p.title.toLowerCase().includes(query)
      || (p.description || "").toLowerCase().includes(query)
      || (p.category || "").toLowerCase().includes(query)
      || (p.tags || []).some(t => t.toLowerCase().includes(query));
    return mf && ms;
  });
}

function render(posts) {
  if (!posts.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><p class="empty-t">Nothing found</p><p class="empty-s">Try a different filter or search.</p></div>`;
    return;
  }
  const liked = getLiked();
  grid.innerHTML = posts.map((p, i) => {
    const isLiked    = !!liked[p.id];
    const likeCount  = p.likes || 0;
    return `
    <article class="card" style="animation-delay:${i * 0.045}s">
      <div class="card-top-bar"></div>
      <div class="card-body">
        <div class="post-meta">
          <img src="icon/post_picture.png" alt="Space Pirate" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);flex-shrink:0;"/>
          <div class="post-meta-info">
            <div class="post-author">Space Pirate <span class="post-author-badge">Admin</span></div>
            <div class="post-time">${fmt(p.createdAt)}</div>
          </div>
          <span class="post-cat">${esc(p.category.split(",")[0].trim())}</span>
        </div>
        <h2 class="card-title">${esc(p.title)}</h2>
        ${p.description ? `<p class="card-desc">${esc(p.description)}</p>` : ""}
        ${p.tags && p.tags.length ? `<div class="card-tags">${p.tags.map(t => `<span class="ctag" onclick="filterByTag('${esc(t)}')">${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="card-footer">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="card-link">
          Open
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
        <button
          class="fire-btn${isLiked ? " liked" : ""}"
          onclick="handleLike(this, '${esc(p.id)}')"
          title="${isLiked ? "You liked this!" : "Like this post"}"
          aria-label="Like post — ${likeCount} likes"
        >
          <span class="fire-emoji">🔥</span>
          <span class="fire-count">${likeCount}</span>
        </button>
      </div>
    </article>`;
  }).join("");
}

// ── Like handler ──────────────────────────────────
window.handleLike = async function(btn, postId) {
  const liked = getLiked();

  // Optimistic UI — animate immediately
  btn.classList.add("firing");
  const countEl = btn.querySelector(".fire-count");
  const currentCount = parseInt(countEl.textContent, 10) || 0;

  // Toggle: if already liked, just show feedback — don't double-count
  // We still increment on server each time (no auth), but show locally toggled state
  const wasLiked = !!liked[postId];

  if (!wasLiked) {
    liked[postId] = true;
    saveLiked(liked);
    btn.classList.add("liked");
    countEl.textContent = currentCount + 1;
  } else {
    // Already liked — just do a little wiggle, no extra increment
    btn.classList.remove("liked");
    delete liked[postId];
    saveLiked(liked);
    countEl.textContent = Math.max(0, currentCount - 1);
  }

  // Remove animation class after it plays
  setTimeout(() => btn.classList.remove("firing"), 600);

  if (!wasLiked) {
    // Only call API on new like
    try {
      const res = await fetch(`${API}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId })
      });
      if (res.ok) {
        const data = await res.json();
        // Update with real server count
        countEl.textContent = data.likes;
        // Also sync in the all[] array
        const post = all.find(p => p.id === postId);
        if (post) post.likes = data.likes;
      }
    } catch {
      // Network error — optimistic count stays, no harm done
    }
  }
};

window.filterByTag = t => {
  searchInput.value = "";
  query = "";
  setFilter(t);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
