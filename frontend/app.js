const API_BASE = 'http://localhost:3000';

// session helpers
function getUser() { try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; } }
function setUser(u) { sessionStorage.setItem('user', JSON.stringify(u)); }

// ===== Signup =====
async function signup(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const out = await res.json();
  alert(out.message || out.msg);
  if (out.success) location.href = 'login.html';
}

// ===== Login =====
async function login(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const out = await res.json();
  if (!out.success) return alert(out.message || 'Login failed');

  // save user + token in sessionStorage
  sessionStorage.setItem("user", JSON.stringify(out.data.user || out.data));
  sessionStorage.setItem("token", out.data.token);

  alert('Login successful');
  location.href = out.data.role === 'owner' ? 'owner-property.html' : 'search.html';
}


// ===== Add Property =====
async function addProperty(e) {
  e.preventDefault();
  const u = getUser();
  if (!u || u.role !== 'owner') return alert('Please login as owner first.');

  const data = Object.fromEntries(new FormData(e.target));
  data.owner = u._id || u.id; 
  data.parking = !!data.parking;
  data.transit = !!data.transit;

  const token = getToken();  // ✅ sessionStorage
  const res = await fetch(`${API_BASE}/api/properties`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const out = await res.json();
  if (out.success) {
    alert("Property added successfully!");
    location.href = 'owner-workspace.html';
  } else {
    alert(out.message || 'Error');
  }
}
// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}
function renderWorkspaceItem(ws) {
  const avg = ws.ratings?.length
    ? (ws.ratings.reduce((s, r) => s + r.value, 0) / ws.ratings.length).toFixed(1)
    : "No ratings";
  const count = ws.ratings?.length || 0;

  return `
    <li style="padding:12px 0;border-bottom:1px solid #eee;display:flex;
               justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div>
        <strong>${ws.type}</strong> • Seats: ${ws.seats} • $${ws.price} • ${ws.term}
        <br/><small>${ws.property?.address || "No address"}</small>
        <br/>⭐ ${avg} (${count} ratings)
      </div>
      <div class="actions" style="gap:6px">
        <button onclick="viewWorkspace('${ws._id}')">View Details</button>
        <button onclick="rateWorkspace('${ws._id}', 5)">Rate 5⭐</button>
      </div>
    </li>
  `;
}





// ===== BONUS: Add photos (property/workspace) =====
// ===== Add Property Photo =====
async function addPropertyPhoto(e) {
  e.preventDefault();
  const f = e.target;
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/properties/${f.propId.value}/photos`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ url: f.url.value })
  });

  const out = await res.json();
  alert(out.message || "Photo added");
  f.reset();
  loadOwnerPropertiesForPhoto(); // refresh dropdown
}

async function addWorkspacePhoto(e){
  e.preventDefault();
  const f = e.target;
  const res = await fetch(`${API_BASE}/api/workspaces/${f.wsId.value}/photos`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ url: f.url.value })
  });
  const out = await res.json();
  alert(out.message || 'Saved');
  f.reset();
}
// =====================
// Load owner workspaces for photo dropdown
// =====================
async function loadOwnerWorkspacesForPhoto() {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/mine`, {
      headers: { 'Content-Type': 'application/json' }
    });
    const workspaces = await res.json();

    const wsSelect = document.getElementById("wsId");
    if (wsSelect) {
      wsSelect.innerHTML = `<option value="">-- Select one of your workspaces --</option>`;
      workspaces.forEach(ws => {
        wsSelect.innerHTML += `<option value="${ws._id}">${ws.type} – ${ws.seats} seats – $${ws.price}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loading workspaces:", err);
  }
}

// ===== Search / rating / reviews =====
async function rateWorkspace(workspaceId) {
  const u = getUser();
  if (!u) return alert('Please log in to rate.');
  const value = Number(prompt('Rate this workspace (1-5):', '5'));
  if (!(value >= 1 && value <= 5)) return;
  const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/ratings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: u.id, value })
  });
  const out = await res.json();
  alert(out.message || 'Saved');
  searchWorkspaces();
}

async function reviewWorkspace(workspaceId) {
  const u = getUser();
  if (!u) return alert('Please log in to review.');
  const text = prompt('Write your review:');
  if (!text) return;
  const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: u.id, text })
  });
  const out = await res.json();
  alert(out.message || 'Saved');
  searchWorkspaces();
}

// =========================
// Owner: list / update / delete
// =========================
let _propsCache = [];

function yesNoToBool(v) {
  if (typeof v !== 'string') return !!v;
  const s = v.trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
}

async function loadProperties() {
  const token = getToken();
  if (!token) {
    alert("You must log in first!");
    location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/properties`, {
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    
    const out = await res.json();
    const list = document.getElementById("propertyList");
    list.innerHTML = out.data.map(
      p => `<li>${p.address} – ${p.sqft} sqft</li>`
    ).join("");

  } catch (err) {
    console.error("❌ Error loading properties:", err);
    alert("Failed to load properties. Please log in again.");
    sessionStorage.clear();
    location.href = "login.html";
  }
}
