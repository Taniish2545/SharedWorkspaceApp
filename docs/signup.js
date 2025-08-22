// signup.js
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://sharedworkspaceapp.onrender.com"; // your Render URL

// build the full route safely (strips trailing slash if any)
const REGISTER_URL = `${API_BASE.replace(/\/$/, "")}/api/auth/register`;

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(e.target));
  console.log("▶ Register URL:", REGISTER_URL); // must end with /api/auth/register

  try {
    const res = await fetch(REGISTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    // don’t try to parse HTML error pages as JSON
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Unexpected response (${res.status}): ${text.slice(0,100)}…`);
    }

    const out = await res.json();
    if (!res.ok || out.success === false) {
      alert(out.message || `Signup failed (${res.status})`);
      return;
    }

    alert(out.message || "Signup successful!");
    location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("Request failed. Check console/Network for details.");
  }
});
