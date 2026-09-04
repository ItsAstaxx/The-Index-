// ============================================================
// THE INDEX — app logic
// ============================================================

const hasSupabase =
  typeof SUPABASE_URL === "string" &&
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  typeof supabase !== "undefined";

const db = hasSupabase
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Fallback demo data so the page still looks alive before Supabase is wired up.
const DEMO_SITES = [
  { id: 1, name: "Are.na", url: "https://www.are.na", category: "design", description: "A slower, calmer place to collect and connect ideas." },
  { id: 2, name: "Devdocs", url: "https://devdocs.io", category: "dev", description: "Every API reference you need, in one fast offline shell." },
  { id: 3, name: "Explorable Explanations", url: "https://explorabl.es", category: "learning", description: "Interactive essays that teach by letting you play." },
  { id: 4, name: "Excalidraw", url: "https://excalidraw.com", category: "tools", description: "A whiteboard that feels like pencil on paper." },
  { id: 5, name: "Every Layout", url: "https://every-layout.dev", category: "design", description: "CSS layout patterns explained the way they should be taught." },
  { id: 6, name: "Hemingway Editor", url: "https://hemingwayapp.com", category: "writing", description: "Cuts your sentences down to what they're actually saying." },
];

let ALL_SITES = [];
let ACTIVE_SHELF = "all";
let fuse = null;

// ---------- anon identity for the wall (no accounts) ----------
function getAnonId() {
  let id = localStorage.getItem("ti_anon_id");
  if (!id) {
    id = "anon-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("ti_anon_id", id);
  }
  return id;
}
function anonColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 62%)`;
}
function anonTag(id) {
  return "#" + id.slice(-4);
}

// ---------- data loading ----------
async function loadSites() {
  if (!db) {
    ALL_SITES = DEMO_SITES;
    return;
  }
  const { data, error } = await db
    .from("sites")
    .select("id, name, url, category, description")
    .eq("status", "approved")
    .order("name", { ascending: true });

  ALL_SITES = error || !data ? DEMO_SITES : data;
}

async function loadWhispers() {
  const feed = document.getElementById("wall-feed");
  if (!db) {
    feed.innerHTML = `<p class="whisper-empty">Connect Supabase (see README) to bring the wall online.</p>`;
    return;
  }
  const { data, error } = await db
    .from("whispers")
    .select("id, content, anon_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data || data.length === 0) {
    feed.innerHTML = `<p class="whisper-empty">Nothing pinned yet. Be the first.</p>`;
    return;
  }
  feed.innerHTML = data.map(whisperCard).join("");
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

function whisperCard(w) {
  const color = anonColor(w.anon_id || "anon");
  const tag = anonTag(w.anon_id || "anon-0000");
  return `
    <div class="whisper-card" style="border-left-color:${color}">
      <div class="whisper-text">${escapeHtml(w.content)}</div>
      <div class="whisper-meta" style="color:${color}">${tag} · ${timeAgo(w.created_at)}</div>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- catalog rendering ----------
function buildShelfTabs() {
  const counts = {};
  ALL_SITES.forEach((s) => (counts[s.category] = (counts[s.category] || 0) + 1));

  const tabsEl = document.getElementById("shelf-tabs");
  const tabs = [{ id: "all", label: "All", n: ALL_SITES.length }].concat(
    CATEGORIES.filter((c) => counts[c.id]).map((c) => ({ id: c.id, label: c.label, n: counts[c.id] }))
  );

  tabsEl.innerHTML = tabs
    .map(
      (t) =>
        `<button class="shelf-tab ${t.id === ACTIVE_SHELF ? "is-active" : ""}" data-shelf="${t.id}">${t.label}<span class="n">${t.n}</span></button>`
    )
    .join("");

  tabsEl.querySelectorAll(".shelf-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      ACTIVE_SHELF = btn.dataset.shelf;
      buildShelfTabs();
      renderLedger(document.getElementById("search").value.trim());
    });
  });
}

function categoryLabel(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.label : id;
}

function renderLedger(query) {
  const ledger = document.getElementById("ledger");
  const countEl = document.getElementById("search-count");

  let list = query
    ? fuse.search(query).map((r) => r.item)
    : ALL_SITES;

  if (ACTIVE_SHELF !== "all") list = list.filter((s) => s.category === ACTIVE_SHELF);

  countEl.textContent = query ? `${list.length} found` : "";

  if (list.length === 0) {
    ledger.innerHTML = `<p class="ledger-empty">Nothing filed under that yet.</p>`;
    return;
  }

  if (query) {
    ledger.innerHTML = renderRows(list);
    return;
  }

  // grouped by shelf when not searching
  const groups = {};
  list.forEach((s) => {
    (groups[s.category] = groups[s.category] || []).push(s);
  });

  ledger.innerHTML = Object.keys(groups)
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))
    .map(
      (cat) => `
      <div class="ledger-group">
        <p class="ledger-group-title">${categoryLabel(cat)}</p>
        ${renderRows(groups[cat])}
      </div>`
    )
    .join("");
}

function renderRows(list) {
  return list
    .map((s, i) => {
      let domain = "";
      try {
        domain = new URL(s.url).hostname.replace(/^www\./, "");
      } catch (e) {}
      return `
      <a class="ledger-row" href="${s.url}" target="_blank" rel="noopener">
        <span class="ledger-ix">${String(i + 1).padStart(3, "0")}</span>
        <span class="ledger-body">
          <span class="ledger-name">${escapeHtml(s.name)}</span><span class="ledger-domain">${domain}</span>
          <div class="ledger-desc">${escapeHtml(s.description || "")}</div>
        </span>
        <span class="ledger-arrow">↗</span>
      </a>`;
    })
    .join("");
}

// ---------- search ----------
function initSearch() {
  fuse = new Fuse(ALL_SITES, {
    keys: ["name", "description", "category"],
    threshold: 0.35,
    ignoreLocation: true,
  });
  document.getElementById("search").addEventListener("input", (e) => {
    renderLedger(e.target.value.trim());
  });
}

// ---------- stats ----------
function renderStats() {
  const shelfCount = new Set(ALL_SITES.map((s) => s.category)).size;
  document.getElementById("stat-line").textContent =
    `${ALL_SITES.length} sites indexed · ${shelfCount} shelves${db ? "" : " · demo data — connect Supabase to go live"}`;
}

// ---------- view switching ----------
function initViewSwitch() {
  document.querySelectorAll(".head-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".head-link").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      document.getElementById("view-catalog").classList.toggle("is-hidden", view !== "catalog");
      document.getElementById("view-wall").classList.toggle("is-hidden", view !== "wall");
    });
  });
}

// ---------- submit modal ----------
function initSubmitModal() {
  const modal = document.getElementById("submit-modal");
  const select = document.getElementById("f-category");
  select.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");

  document.getElementById("open-submit").addEventListener("click", () => modal.classList.remove("is-hidden"));
  document.getElementById("close-submit").addEventListener("click", () => modal.classList.add("is-hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("is-hidden");
  });

  document.getElementById("submit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("submit-status");
    const payload = {
      name: document.getElementById("f-name").value.trim(),
      url: document.getElementById("f-url").value.trim(),
      category: document.getElementById("f-category").value,
      description: document.getElementById("f-desc").value.trim(),
      status: "pending",
    };

    if (!db) {
      status.textContent = "Demo mode — connect Supabase to accept real submissions.";
      status.className = "submit-status is-error";
      return;
    }

    status.textContent = "Submitting...";
    status.className = "submit-status";
    const { error } = await db.from("sites").insert(payload);
    if (error) {
      status.textContent = "Something went wrong — try again in a moment.";
      status.className = "submit-status is-error";
      return;
    }
    status.textContent = "Sent to the review shelf. Thanks for the find.";
    status.className = "submit-status is-ok";
    e.target.reset();
    setTimeout(() => modal.classList.add("is-hidden"), 1400);
  });
}

// ---------- whisper wall ----------
function initWall() {
  const textarea = document.getElementById("whisper-text");
  const counter = document.getElementById("whisper-count");
  textarea.addEventListener("input", () => {
    counter.textContent = 280 - textarea.value.length;
  });

  document.getElementById("whisper-send").addEventListener("click", async () => {
    const content = textarea.value.trim();
    if (!content) return;

    const last = Number(localStorage.getItem("ti_last_whisper") || 0);
    if (Date.now() - last < 15000) {
      alert("One at a time — give it a few seconds.");
      return;
    }

    if (!db) {
      alert("Demo mode — connect Supabase to post for real.");
      return;
    }

    const { error } = await db.from("whispers").insert({
      content,
      anon_id: getAnonId(),
    });
    if (error) {
      alert("Couldn't pin that — try again.");
      return;
    }
    localStorage.setItem("ti_last_whisper", String(Date.now()));
    textarea.value = "";
    counter.textContent = "280";
    loadWhispers();
  });
}

// ---------- boot ----------
(async function init() {
  initViewSwitch();
  initSubmitModal();
  initWall();

  await loadSites();
  buildShelfTabs();
  initSearch();
  renderLedger("");
  renderStats();
  loadWhispers();
})();
