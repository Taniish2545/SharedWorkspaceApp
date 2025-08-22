
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(e.target));

  const res = await fetch("https://sharedworkspaceapp.onrender.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData)
  });

  const out = await res.json();
  alert(out.message);

  if (out.success) {
    window.location.href = "login.html"; // redirect after signup
  }
});
