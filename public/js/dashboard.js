// public/js/dashboard.js - dashboard logic: CRUD, filtering, charts
(function () {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let categories = [];
  let categoryChart, trendChart;

  document.getElementById('user-name').textContent = localStorage.getItem('userName') || '';
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
  });

  async function api(path, options = {}) {
    const res = await fetch(path, { ...options, headers: authHeaders });
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
      throw new Error('Session expired');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function fmtMoney(n) {
    return '£' + Number(n).toFixed(2);
  }

  function populateCategorySelects() {
    const formSelect = document.getElementById('category-select');
    const filterSelect = document.getElementById('filter-category');
    formSelect.innerHTML = categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
    filterSelect.innerHTML =
      '<option value="">All categories</option>' +
      categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function categoryById(id) {
    return categories.find((c) => c.id === id);
  }

  async function loadCategories() {
    categories = await api('/api/categories');
    populateCategorySelects();
  }

  async function loadExpenses() {
    const filterVal = document.getElementById('filter-category').value;
    const qs = filterVal ? `?category=${filterVal}` : '';
    const expenses = await api(`/api/expenses${qs}`);
    renderTable(expenses);
    renderSummary(expenses);
  }

  function renderTable(expenses) {
    const tbody = document.getElementById('expense-tbody');
    const emptyState = document.getElementById('empty-state');

    if (expenses.length === 0) {
      tbody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = expenses
      .map((e) => {
        const color = e.category_color || '#6b7280';
        const catName = e.category_name || 'Uncategorized';
        return `
        <tr data-id="${e.id}">
          <td>${e.expense_date}</td>
          <td><span class="cat-pill"><span class="cat-dot" style="background:${color}"></span>${catName}</span></td>
          <td>${e.description || ''}</td>
          <td class="amount-col">${fmtMoney(e.amount)}</td>
          <td class="row-actions">
            <button class="edit-btn" data-id="${e.id}" data-amount="${e.amount}" data-cat="${e.category_id || ''}" data-desc="${(e.description || '').replace(/"/g, '&quot;')}" data-date="${e.expense_date}">Edit</button>
            <button class="delete-btn" data-id="${e.id}">Delete</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  function renderSummary(expenses) {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(ym));
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('month-total').textContent = fmtMoney(total);
    document.getElementById('entry-count').textContent = `${monthExpenses.length} entries logged this month`;
  }

  async function loadCharts() {
    const [byCategory, byMonth] = await Promise.all([
      api('/api/expenses/summary/by-category'),
      api('/api/expenses/summary/by-month')
    ]);

    const catCtx = document.getElementById('category-chart');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(catCtx, {
      type: 'pie',
      data: {
        labels: byCategory.map((r) => r.category),
        datasets: [
          {
            data: byCategory.map((r) => r.total),
            backgroundColor: byCategory.map((r) => r.color)
          }
        ]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Inter' } } } } }
    });

    const trendCtx = document.getElementById('trend-chart');
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: byMonth.map((r) => r.month),
        datasets: [
          {
            label: 'Total spent',
            data: byMonth.map((r) => r.total),
            backgroundColor: '#2f4a3a'
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  async function refreshAll() {
    await loadExpenses();
    await loadCharts();
  }

  // --- Form: add / edit ---
  const form = document.getElementById('expense-form');
  const submitBtn = document.getElementById('form-submit-btn');
  const cancelBtn = document.getElementById('form-cancel-btn');

  function resetForm() {
    form.reset();
    form.elements['id'].value = '';
    submitBtn.textContent = 'Add expense';
    cancelBtn.hidden = true;
    const dateInput = form.elements['expense_date'];
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  cancelBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get('id');
    const payload = {
      amount: fd.get('amount'),
      category_id: fd.get('category_id') || null,
      description: fd.get('description'),
      expense_date: fd.get('expense_date')
    };

    try {
      if (id) {
        await api(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) });
      }
      resetForm();
      await refreshAll();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('expense-tbody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      form.elements['id'].value = editBtn.dataset.id;
      form.elements['amount'].value = editBtn.dataset.amount;
      form.elements['category_id'].value = editBtn.dataset.cat;
      form.elements['description'].value = editBtn.dataset.desc;
      form.elements['expense_date'].value = editBtn.dataset.date;
      submitBtn.textContent = 'Save changes';
      cancelBtn.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteBtn) {
      if (!confirm('Delete this expense?')) return;
      try {
        await api(`/api/expenses/${deleteBtn.dataset.id}`, { method: 'DELETE' });
        await refreshAll();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  document.getElementById('filter-category').addEventListener('change', loadExpenses);

  // --- Init ---
  (async function init() {
    resetForm();
    await loadCategories();
    await refreshAll();
  })();
})();
