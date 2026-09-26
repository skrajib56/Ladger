// public/js/auth.js - login/register screen logic
(function () {
  // If already logged in, skip straight to the dashboard.
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const errorEl = document.getElementById('auth-error');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      forms.forEach((f) => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
      errorEl.textContent = '';
    });
  });

  async function submitAuth(endpoint, payload) {
    errorEl.textContent = '';
    try {
      const res = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || 'Something went wrong. Please try again.';
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = 'Could not reach the server. Please try again.';
    }
  }

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    submitAuth('login', { email: form.get('email'), password: form.get('password') });
  });

  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    submitAuth('register', {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password')
    });
  });
})();
