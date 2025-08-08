const API_BASE = 'http://localhost:3000';

// session helpers
function getUser() { try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; } }
function setUser(u) { sessionStorage.setItem('user', JSON.stringify(u)); }

// Signup
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

// Login
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

// Add Property
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
  alert(out.message || 'Done');
}

// Add Workspace
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

// BONUS Add photos (property/workspace)
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

// Search / rating / reviews
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

// expose everything
window.App = { signup, login, addProperty, addWorkspace, addPropertyPhoto, addWorkspacePhoto, searchWorkspaces };
window.rateWorkspace = rateWorkspace;
window.reviewWorkspace = reviewWorkspace;
