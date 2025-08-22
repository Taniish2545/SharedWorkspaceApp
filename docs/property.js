
async function loadProperties() {
  const token = localStorage.getItem("token"); // 🔑 read saved JWT
  if (!token) {
    alert("You must log in first!");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/properties", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // ✅ send token
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const out = await res.json();

    const list = document.getElementById("myprops");
    list.innerHTML = out.data.map(
      p => `<li>${p.address} – ${p.sqft} sqft</li>`
    ).join("");
  } catch (err) {
    console.error("❌ Error loading properties:", err);
    alert("Failed to load properties. Please log in again.");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
}

window.addEventListener("DOMContentLoaded", loadProperties);
