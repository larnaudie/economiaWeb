function saveAuth(data, enteredUsername = "") {
  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  const userToSave = {
    id: data.id || null,
    username: data.username || enteredUsername
  };

  localStorage.setItem("user", JSON.stringify(userToSave));
}

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function isAuthenticated() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
  }
}