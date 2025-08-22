// login.js (safe, no fancy syntax)
const API_BASE = (window.location.hostname === "localhost")
  ? "http://localhost:3000"
  : "https://sharedworkspaceapp.onrender.com"; // <- your Render URL

const LOGIN_URL = API_BASE.replace(/\/$/, "") + "/api/auth/login";

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("loginForm");
  if (!form) { console.error("loginForm not found"); return; }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var data = Object.fromEntries(new FormData(form).entries());
    try {
      var res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      var ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") === -1) {
        var text = await res.text();
        alert("Unexpected response " + res.status + ": " + text.slice(0, 120));
        return;
      }

      var out = await res.json();
      if (!res.ok || out.success === false) {
        alert(out.message || ("Login failed (" + res.status + ")"));
        return;
      }

      if (out.data && out.data.token) {
        sessionStorage.setItem("token", out.data.token);
      }

      alert(out.message || "Login successful!");
      window.location.href = "index.html"; // change if your dashboard file is different
    } catch (err) {
      console.error(err);
      alert("Network error. Check console/Network tab.");
    }
  });
});
