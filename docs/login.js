// login.js (clean version)
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://sharedworkspaceapp.onrender.com"; // your Render URL

const LOGIN_URL = `${API_BASE.replace(/\/$/, "")}/api/auth/login`;

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(e.target));
  try {
    console.log("▶ Login URL:", LOGIN_URL);

    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Unexpected response (${res.status}): ${text.slice(0,120)}…`);
    }

    const out = await res.json();

    if (!res.ok || out.success === false) {
      alert(out.message || `Login failed (${res.status})`);
      return;
    }

    // If your API returns a token, store it
    if (out.data && out.data.token) {
      sessionStorage.setItem("token", out.data.token);
    }

    alert(out.message || "Login successful!");
    location.href = "index.html"; // or your dashboard page
  } catch (err) {
    console.error(err);
    alert("Network error. Check console/Network tab.");
  }
});
