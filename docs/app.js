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
// ===== Load Owner’s Properties (with Edit/Delete buttons) =====
// ===== Load Owner’s Properties (with Edit/Delete buttons) =====
async function loadMyProperties() {
  const u = getUser();
  if (!u || u.role !== "owner") {
    alert("Only owners can view this page.");
    location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/properties?ownerId=${encodeURIComponent(u.id)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);

    const out = await res.json();
    const list = document.getElementById("myProps");
    list.innerHTML = "";

    (out.data || []).forEach(p => {
      const li = document.createElement("li");

      // Property info
      li.innerHTML = `
        <strong>${p.address}</strong> – ${p.sqft} sqft
        <button onclick="App.editProperty('${p._id}')">Edit</button>
        <button onclick="deleteProperty('${p._id}')">Delete</button>
      `;

      // --- NEW: Show photos if available ---
      if (p.photos && p.photos.length > 0) {
        const photoDiv = document.createElement("div");
        photoDiv.style.marginTop = "6px";

        p.photos.forEach(url => {
          const img = document.createElement("img");
          img.src = url;
          img.style.width = "120px";
          img.style.height = "90px";
          img.style.objectFit = "cover";
          img.style.marginRight = "6px";
          img.style.borderRadius = "6px";
          img.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
          photoDiv.appendChild(img);
        });

        li.appendChild(photoDiv);
      }

      list.appendChild(li);
    });

  } catch (err) {
    console.error("❌ Error loading owner properties:", err);
    alert("Failed to load your properties. Please log in again.");
    sessionStorage.clear();
    location.href = "login.html";
  }
}


async function addWorkspace(e) {
  e.preventDefault();

  const u = getUser();
  if (!u || u.role !== "owner") {
    return alert("Only owners can add workspaces.");
  }

  const data = {
    property: document.getElementById("propertyId").value,  // ✅ matches HTML
    type: document.getElementById("type").value,
    seats: Number(document.getElementById("seats").value),
    smoking: document.querySelector("#smoking")?.checked || false,
    availableFrom: document.getElementById("availableFrom").value,
    term: document.getElementById("term").value,
    price: Number(document.getElementById("price").value),
    owner: u.id
  };

  try {
    const res = await fetch(`${API_BASE}/api/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const out = await res.json();
    if (out.success) {
      alert("Workspace created!");
      e.target.reset();
      App.loadMyWorkspaces();
    } else {
      alert(out.message || "Failed to create workspace.");
    }
  } catch (err) {
    console.error("❌ Workspace create error:", err);
    alert("Something went wrong.");
  }
}



// ===== Delete Property =====
async function deleteProperty(id) {
  if (!confirm("Are you sure you want to delete this property?")) return;

  try {
    const res = await fetch(`${API_BASE}/api/properties/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    const out = await res.json();
    if (out.success) {
      alert("Property deleted successfully!");
      loadMyProperties();  // refresh
    } else {
      alert(out.message || "Failed to delete property.");
    }
  } catch (err) {
    console.error("❌ Delete error:", err);
    alert("Something went wrong while deleting.");
  }
}
function editProperty(id) {
  fetch(`${API_BASE}/api/properties/${id}`)
    .then(res => res.json())
    .then(out => {
      if (!out.success) return alert("Failed to fetch property");

      const p = out.data;
      document.getElementById("editId").value = p._id;
      document.getElementById("editAddress").value = p.address;
      document.getElementById("editNeighborhood").value = p.neighborhood;
      document.getElementById("editSqft").value = p.sqft;
      document.getElementById("editParking").checked = p.parking;
      document.getElementById("editTransit").checked = p.transit;

      // Show modal
      document.getElementById("editModal").style.display = "flex";
    })
    .catch(err => console.error("❌ Edit error:", err));
}
function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

async function savePropertyUpdate(e) {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const data = {
    address: document.getElementById("editAddress").value,
    neighborhood: document.getElementById("editNeighborhood").value,
    sqft: document.getElementById("editSqft").value,
    parking: document.getElementById("editParking").checked,
    transit: document.getElementById("editTransit").checked,
  };

  try {
    const res = await fetch(${API_BASE}/api/properties/${id}, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const out = await res.json();
    if (out.success) {
      alert("Property updated!");
      closeModal();
      loadMyProperties();
    } else {
      alert(out.message || "Failed to update.");
    }
  } catch (err) {
    console.error("❌ Update error:", err);
    alert("Something went wrong.");
  }
}


// ===== Open Modal with Existing Property Data =====
async function updateProperty(id) {
  try {
    const res = await fetch(${API_BASE}/api/properties/${id});
    const out = await res.json();
    if (!out.success) return alert("Failed to load property details.");

    const p = out.data;
    document.getElementById("editId").value = p._id || p.id;
    document.getElementById("editAddress").value = p.address;
    document.getElementById("editNeighborhood").value = p.neighborhood;
    document.getElementById("editSqft").value = p.sqft;
    document.getElementById("editParking").checked = !!p.parking;
    document.getElementById("editTransit").checked = !!p.transit;

    document.getElementById("editModal").style.display = "block";
  } catch (err) {
    console.error("❌ Update error:", err);
    alert("Could not load property for editing.");
  }
}

// ===== Save Update =====
async function savePropertyUpdate(e) {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const data = {
    address: document.getElementById("editAddress").value,
    neighborhood: document.getElementById("editNeighborhood").value,
    sqft: document.getElementById("editSqft").value,
    parking: document.getElementById("editParking").checked,
    transit: document.getElementById("editTransit").checked
  };

  try {
    const res = await fetch(${API_BASE}/api/properties/${id}, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const out = await res.json();
    if (out.success) {
      alert("Property updated successfully!");
      document.getElementById("editModal").style.display = "none";
      loadMyProperties(); // refresh list
    } else {
      alert(out.message || "Failed to update property.");
    }
  } catch (err) {
    console.error("❌ Save update error:", err);
    alert("Could not save update.");
  }
}

// ===== Close Modal =====
function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

// new function to load owner’s properties into dropdown
async function loadOwnerPropertiesForWorkspace() {
  const u = getUser();
  if (!u || u.role !== 'owner') return;

  const res = await fetch(${API_BASE}/api/properties?ownerId=${encodeURIComponent(u.id)});
  const out = await res.json();

  const select = document.getElementById('propertyId');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select one of your properties --</option>';
  (out.data || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p._id; // ✅ use MongoDB _id
    opt.textContent = ${p.address} (${p.neighborhood});
    select.appendChild(opt);
  });
}

function logout() {
  sessionStorage.removeItem('user');   // clear session
  alert('You have been logged out.');
  window.location.href = "login.html";        // redirect to home
}
// ================================
// Page Access Control
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  const path = window.location.pathname;

  // If not logged in → block all restricted pages
  if (!user) {
    if (
      path.includes("owner-property.html") ||
      path.includes("owner-workspace.html") ||
      path.includes("add-workspace.html") ||
      path.includes("search.html") // <— NEW: protect coworker search page
    ) {
      alert("You must log in first.");
      window.location.href = "login.html";
    }
  } else {
    // If logged in as Owner → block coworker-only pages
    if (user.role === "owner") {
      if (
        path.includes("signup.html") ||
        path.includes("login.html") ||
        path.includes("search.html") // <— prevent owners from coworker search
      ) {
        alert("You are already logged in as Owner.");
        window.location.href = "owner-property.html";
      }
    }

    // If logged in as Coworker → block owner-only pages
    if (user.role === "coworker") {
      if (
        path.includes("owner-property.html") ||
        path.includes("owner-workspace.html")
      ) {
        alert("Coworkers cannot access Owner pages.");
        window.location.href = "index.html";
      }
    }
  }
});
// ================================
// Role-based Nav Control
// ================================
function updateNav() {
  const user = getUser();
  const navOwner = document.getElementById("nav-owner");
  const navCoworker = document.getElementById("nav-coworker");
  const navGuest = document.getElementById("nav-guest");
  const browseBtn = document.getElementById("btn-browse"); // <— new

  if (!navOwner || !navCoworker || !navGuest) return; // safety check

  if (!user) {
    navOwner.style.display = "none";
    navCoworker.style.display = "none";
    navGuest.style.display = "block";
    if (browseBtn) browseBtn.style.display = "none"; // hide
  } else if (user.role === "owner") {
    navOwner.style.display = "block";
    navCoworker.style.display = "none";
    navGuest.style.display = "none";
    if (browseBtn) browseBtn.style.display = "none"; // hide
  } else if (user.role === "coworker") {
    navOwner.style.display = "none";
    navCoworker.style.display = "block";
    navGuest.style.display = "none";
    if (browseBtn) browseBtn.style.display = "inline-block"; // show
  }
}

// Run nav update when page loads
document.addEventListener("DOMContentLoaded", updateNav);
// =========================
// Owner: Workspace list / update / delete
// =========================
let _wsCache = [];

async function loadMyWorkspaces() {
  const u = getUser();
  if (!u || u.role !== "owner") {
    const list = document.getElementById("myWorkspaces");
    if (list) list.innerHTML = "<li>Please log in as an Owner to view your workspaces.</li>";
    return;
  }

  try {
    const res = await fetch(${API_BASE}/api/workspaces?owner=${encodeURIComponent(u.id)});
    const out = await res.json();
    _wsCache = out.data || [];

    const list = document.getElementById("myWorkspaces");
    if (!list) return;

    list.innerHTML =
      _wsCache.map(ws => {
        return `
          <li style="padding:12px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>${ws.type}</strong> • Seats: ${ws.seats} • $${ws.price} • ${ws.term} • Smoking: ${ws.smoking}
              <br/>
              <small>Property: ${ws.property?.address || "N/A"} (${ws.property?.neighborhood || ""})</small>
            </div>
            <div class="actions" style="gap:6px">
              <button class="button" onclick="App.updateWorkspace('${ws._id}')">Update</button>
              <button class="button" onclick="App.deleteWorkspace('${ws._id}')">Delete</button>
            </div>
          </li>
        `;
      }).join("") || "<li>No workspaces yet.</li>";

  } catch (err) {
    console.error("❌ Error loading workspaces:", err);
    const list = document.getElementById("myWorkspaces");
    if (list) list.innerHTML = "<li>Failed to load workspaces.</li>";
  }
}


// For coworker/global listing (everyone sees all workspaces)
async function loadAllWorkspaces() {
  try {
    const res = await fetch(${API_BASE}/api/workspaces);
    const out = await res.json();
    const list = document.getElementById("results"); // ✅ change here
    if (!list) return;

    list.innerHTML =
      (out.data || [])
        .map(ws => {
          return `
          <li style="padding:12px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
              <strong>${ws.type}</strong> • Seats: ${ws.seats} • $${ws.price} • ${ws.term} • Smoking: ${ws.smoking}
              <br/><small>${ws.property?.address || "No address"}</small>
            </div>
            <div class="actions" style="gap:6px">
              <button onclick="viewWorkspace('${ws._id}')">View Details</button>
            </div>
          </li>
        `;
        })
        .join("") || "<li>No workspaces available.</li>";
  } catch (err) {
    console.error("Failed to load all workspaces", err);
  }
}

async function deleteWorkspace(id) {
  if (!confirm("Are you sure you want to delete this workspace?")) return;
  try {
    const res = await fetch(${API_BASE}/api/workspaces/${id}, { method: "DELETE" });
    const out = await res.json();
    if (out.success) {
      alert("Workspace deleted");
      App.loadMyWorkspaces();
    } else {
      alert(out.message || "Delete failed.");
    }
  } catch (err) {
    console.error("❌ Delete error:", err);
  }
}
