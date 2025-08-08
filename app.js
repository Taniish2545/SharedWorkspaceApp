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
  setUser(out.data);
  alert('Login successful');
  location.href = out.data.role === 'owner' ? 'owner-property.html' : 'search.html';
}

// ===== Add Property =====
async function addProperty(e) {
  e.preventDefault();
  const u = getUser();
  if (!u || u.role !== 'owner') return alert('Please login as owner first.');
  const data = Object.fromEntries(new FormData(e.target));
  data.ownerId = u.id;
  data.parking = !!data.parking;
  data.transit = !!data.transit;
  const res = await fetch(`${API_BASE}/api/properties`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const out = await res.json();
  if (out.success) {
    alert(`Property added!\n\nProperty ID:\n${out.data.id}`);
    loadMyProperties(); // refresh list
    e.target.reset();
  } else {
    alert(out.message || 'Error');
  }
}

// ===== Add Workspace =====
async function addWorkspace(e) {
  e.preventDefault();
  const u = getUser();
  if (!u || u.role !== 'owner') return alert('Please login as owner first.');
  const data = Object.fromEntries(new FormData(e.target));
  data.ownerId = u.id;
  data.smoking = !!data.smoking;
  const res = await fetch(`${API_BASE}/api/workspaces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const out = await res.json();
  alert(out.message || 'Done');
}

// ===== BONUS: Add photos (property/workspace) =====
async function addPropertyPhoto(e){
  e.preventDefault();
  const f = e.target;
  const res = await fetch(`${API_BASE}/api/properties/${f.propId.value}/photos`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ url: f.url.value })
  });
  const out = await res.json();
  alert(out.message || 'Saved');
  f.reset();
  loadMyProperties();
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

// ===== Search / rating / reviews =====
async function searchWorkspaces() {
  const sort = document.getElementById('sort')?.value || '';
  const res = await fetch(`${API_BASE}/api/workspaces${sort ? `?sort=${sort}` : ''}`);
  const out = await res.json();
  const list = document.getElementById('results');
  list.innerHTML = (out.data || []).map(w => {
    const p = w.property || { address: 'Unknown', neighborhood: '' };
    const photos = (w.photos || []).slice(0,3).map(url => `<img src="${url}" alt="photo" style="height:48px;border-radius:6px;border:1px solid #eee" />`).join(' ');
    const reviews = (w.reviews || []).slice(-3).map(r => `<li style="color:#555"><em>${r.text}</em> — <small>${new Date(r.date).toLocaleDateString()}</small></li>`).join('') || '<li class="muted">No reviews yet</li>';

    return `
      <li style="padding:12px 0;border-bottom:1px solid #eee">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap">
          <div>
            <strong>${w.type}</strong> — $${w.price} — <strong>★ ${w.avgRating}</strong><br/>
            <span style="color:#555">${p.address} • ${p.neighborhood} • Seats: ${w.seats} • Term: ${w.term} • Smoking: ${w.smoking}</span>
            <div style="margin-top:6px">${photos || ''}</div>
          </div>
          <div class="actions" style="gap:6px">
            <button class="button" onclick="rateWorkspace('${w.id}')">Rate (1–5)</button>
            <button class="button" onclick="reviewWorkspace('${w.id}')">Write review</button>
          </div>
        </div>
        <ul style="margin-top:8px; padding-left:16px;">${reviews}</ul>
      </li>
    `;
  }).join('') || '<li>No workspaces yet.</li>';
}

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

async function loadMyProperties() {
  const u = getUser();
  if (!u || u.role !== 'owner') {
    const list = document.getElementById('myProps');
    if (list) list.innerHTML = '<li>Please log in as an Owner to view your properties.</li>';
    return;
  }

  const res = await fetch(`${API_BASE}/api/properties?ownerId=${encodeURIComponent(u.id)}`);
  const out = await res.json();
  _propsCache = out.data || [];

  const list = document.getElementById('myProps');
  if (!list) return;

  list.innerHTML = _propsCache.map(p => {
    const photo = (p.photos && p.photos[0]) ? `<img src="${p.photos[0]}" style="height:54px;border-radius:8px;border:1px solid #eee;margin-right:8px" />` : '';
    return `
      <li style="padding:12px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px;min-width:280px">
          ${photo}
          <div>
            <strong>${p.address}</strong> • ${p.neighborhood}<br/>
            <small>Sqft: ${p.sqft} • Parking: ${p.parking} • Transit: ${p.transit}</small><br/>
            <small>ID: ${p.id}</small>
          </div>
        </div>
        <div class="actions" style="gap:6px">
          <button class="button" onclick="App.updateProperty('${p.id}')">Update</button>
          <button class="button" onclick="App.deleteProperty('${p.id}')">Delete</button>
        </div>
      </li>
    `;
  }).join('') || '<li>No properties yet.</li>';
}

async function deleteProperty(id) {
  if (!confirm('Delete this property? This cannot be undone.')) return;
  const res = await fetch(`${API_BASE}/api/properties/${id}`, { method: 'DELETE' });
  const out = await res.json();
  alert(out.message || 'Deleted');
  loadMyProperties();
}

async function updateProperty(id) {
  const p = _propsCache.find(x => x.id === id);
  if (!p) return alert('Property not found in list. Click Refresh.');

  // Simple prompt-based editing (fast for Phase 1 demo)
  const address = prompt('Address:', p.address);
  if (address == null) return;
  const neighborhood = prompt('Neighborhood:', p.neighborhood);
  if (neighborhood == null) return;
  const sqftStr = prompt('Square feet:', p.sqft);
  if (sqftStr == null) return;
  const parkingStr = prompt('Parking (yes/no):', p.parking ? 'yes' : 'no');
  if (parkingStr == null) return;
  const transitStr = prompt('Transit (yes/no):', p.transit ? 'yes' : 'no');
  if (transitStr == null) return;

  const body = {
    address,
    neighborhood,
    sqft: Number(sqftStr),
    parking: yesNoToBool(parkingStr),
    transit: yesNoToBool(transitStr)
  };

  const res = await fetch(`${API_BASE}/api/properties/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const out = await res.json();
  alert(out.message || 'Updated');
  loadMyProperties();
}

// expose everything used by HTML
window.App = {
  signup, login,
  addProperty, addWorkspace,
  addPropertyPhoto, addWorkspacePhoto,
  searchWorkspaces,
  loadMyProperties, deleteProperty, updateProperty
};
window.rateWorkspace = rateWorkspace;
window.reviewWorkspace = reviewWorkspace;
