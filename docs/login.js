// login.js
const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("✅ Login button clicked");

  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(HTTP ${res.status});
    }

    const out = await res.json();
    alert(out.message || out.msg);

    if (out.success) {
      // Save user + token in localStorage
      sessionStorage.setItem("user", JSON.stringify(out.data.user));
      sessionStorage.setItem("token", out.data.token);

      // ✅ Redirect based on role
      if (out.data.user.role === "owner") {
        window.location.href = "owner-property.html"; 
      } else {
        window.location.href = "search.html"; 
      }
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    alert("Login failed. Please check your credentials.");
  }
});
