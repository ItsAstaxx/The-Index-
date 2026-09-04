// ============================================================
// THE INDEX — admin panel logic
// Requires config.js to be filled in with real Supabase creds.
// ============================================================

if (typeof SUPABASE_URL !== "string" || SUPABASE_URL.includes("YOUR-PROJECT")) {
  document.getElementById("login-status").textContent =
    "Connect Supabase in config.js first (see README.md).";
}

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById("login-view");
const dashView = document.getElementById("dash-view");

// ---------- auth ----------
async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    showDashboard(data.session.user.email);
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("login-status");
  status.textContent = "Signing in...";
  status.className = "submit-status";

  const email = document.getElementById("l-email").value.trim();
  const password = document.getElementById("l-password").value;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    status.textContent = "Wrong email or password.";
    status.className = "submit-status is-error";
    return;
  }
  showDashboard(data.user.email);
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

function showDashboard(email) {
  loginView.classList.add("is-hidden");
  dashView.classList.remove("is-hidden");
  document.getElementById("admin-who").textContent = "signed in as " + email;
  loadPending();
  loadApproved();
  loadWhispers();
}

// ---------- pending submissions ----------
async function loadPending() {
  const el = document.getElementById("pending-list");
  const { data, error } = await db
    .from("sites")
    .select("id, name, url, category, description, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  document.getElementById("pending-count").textContent = data ? data.length : "0";

  if (error || !data || data.length === 0) {
    el.innerHTML = `<p class="admin-empty">Nothing waiting for review.</p>`;
    return;
  }

  el.innerHTML = data.map((s) => `
    <div class="admin-row" data-id="${s.id}">
      <div class="admin-row-body">
        <div class="admin-row-name">${esc(s.name)}<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div>
        <div class="admin-row-desc">${esc(s.description || "")}</div>
        <div class="admin-row-meta">${esc(s.category)} · submitted ${new Date(s.submitted_at).toLocaleDateString()}</div>
      </div>
      <div class="admin-row-actions">
        <button class="mini-btn approve" data-action="approve" data-id="${s.id}">Approve</button>
        <button class="mini-btn reject" data-action="reject" data-id="${s.id}">Reject</button>
      </div>
    </div>`).join("");
}

// ---------- approved sites ----------
async function loadApproved() {
  const el = document.getElementById("approved-list");
  const { data, error } = await db
    .from("sites")
    .select("id, name, url, category")
    .eq("status", "approved")
    .order("name", { ascending: true });

  document.getElementById("approved-count").textContent = data ? data.length : "0";

  if (error || !data || data.length === 0) {
    el.innerHTML = `<p class="admin-empty">Nothing filed yet.</p>`;
    return;
  }

  el.innerHTML = data.map((s) => `
    <div class="admin-row" data-id="${s.id}">
      <div class="admin-row-body">
        <div class="admin-row-name">${esc(s.name)}<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div>
        <div class="admin-row-meta">${esc(s.category)}</div>
      </div>
      <div class="admin-row-actions">
        <button class="mini-btn delete" data-action="unpublish" data-id="${s.id}">Remove</button>
      </div>
    </div>`).join("");
}

// ---------- whispers ----------
async function loadWhispers() {
  const el = document.getElementById("whisper-list");
  const { data, error } = await db
    .from("whispers")
    .select("id, content, anon_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  document.getElementById("whisper-count-admin").textContent = data ? data.length : "0";

  if (error || !data || data.length === 0) {
    el.innerHTML = `<p class="admin-empty">Nothing pinned yet.</p>`;
    return;
  }

  el.innerHTML = data.map((w) => `
    <div class="admin-row" data-id="${w.id}">
      <div class="admin-row-body">
        <div class="admin-row-desc">${esc(w.content)}</div>
        <div class="admin-row-meta">${w.anon_id} · ${new Date(w.created_at).toLocaleString()}</div>
      </div>
      <div class="admin-row-actions">
        <button class="mini-btn delete" data-action="delete-whisper" data-id="${w.id}">Delete</button>
      </div>
    </div>`).join("");
}

// ---------- action handling (event delegation) ----------
document.getElementById("dash-view").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  btn.disabled = true;

  if (action === "approve") {
    await db.from("sites").update({ status: "approved" }).eq("id", id);
    loadPending(); loadApproved();
  } else if (action === "reject") {
    await db.from("sites").delete().eq("id", id);
    loadPending();
  } else if (action === "unpublish") {
    await db.from("sites").delete().eq("id", id);
    loadApproved();
  } else if (action === "delete-whisper") {
    await db.from("whispers").delete().eq("id", id);
    loadWhispers();
  }
});

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

checkSession();
