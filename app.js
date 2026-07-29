const API_BASE = '/api/tasks';

// ----- State -----
let allTasks = [];
let editingTaskId = null;
let taskPendingDelete = null;

// ----- DOM refs -----
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const priorityInput = document.getElementById('priority');
const statusInput = document.getElementById('status');
const dueDateInput = document.getElementById('dueDate');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');

const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const sortBy = document.getElementById('sortBy');

const taskList = document.getElementById('taskList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');

const toast = document.getElementById('toast');

const confirmModal = document.getElementById('confirmModal');
const confirmTaskTitle = document.getElementById('confirmTaskTitle');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// ----- Toast helper -----
let toastTimer = null;
function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ----- API helpers -----
async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data && (data.message || (data.errors && data.errors.join(' ')))) || 'Something went wrong.';
    throw new Error(message);
  }

  return data;
}

// ----- Fetch & render -----
async function loadTasks() {
  loadingIndicator.classList.remove('hidden');
  emptyState.classList.add('hidden');
  taskList.innerHTML = '';

  try {
    const params = new URLSearchParams();
    if (filterStatus.value) params.set('status', filterStatus.value);
    if (filterPriority.value) params.set('priority', filterPriority.value);
    if (sortBy.value) params.set('sortBy', sortBy.value);

    const query = searchInput.value.trim();
    const url = query
      ? `${API_BASE}/search?q=${encodeURIComponent(query)}`
      : `${API_BASE}?${params.toString()}`;

    allTasks = await apiRequest(url);
    renderTasks(allTasks);
    renderStats(allTasks);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

function renderStats(tasks) {
  document.getElementById('statTotal').textContent = tasks.length;
  document.getElementById('statTodo').textContent = tasks.filter(t => t.status === 'TODO').length;
  document.getElementById('statInProgress').textContent = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  document.getElementById('statDone').textContent = tasks.filter(t => t.status === 'DONE').length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(status) {
  return { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[status] || status;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (!tasks.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    li.innerHTML = `
      <div class="task-main">
        <p class="task-title ${task.status === 'DONE' ? 'done' : ''}">${escapeHtml(task.title)}</p>
        <p class="task-desc">${escapeHtml(task.description)}</p>
        <span class="badge badge-priority-${task.priority}">${task.priority}</span>
        <span class="badge badge-status-${task.status}">${statusLabel(task.status)}</span>
        <div class="due-date">Due: ${formatDate(task.dueDate)}</div>
      </div>
      <div class="task-actions">
        <select class="status-select" data-id="${task.id}">
          <option value="TODO" ${task.status === 'TODO' ? 'selected' : ''}>To Do</option>
          <option value="IN_PROGRESS" ${task.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
          <option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>Done</option>
        </select>
        <div class="task-actions-buttons">
          <button class="icon-btn edit-btn" data-id="${task.id}">Edit</button>
          <button class="icon-btn danger delete-btn" data-id="${task.id}" data-title="${escapeHtml(task.title)}">Delete</button>
        </div>
      </div>
    `;

    taskList.appendChild(li);
  }

  attachRowListeners();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function attachRowListeners() {
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      try {
        await apiRequest(`${API_BASE}/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
        showToast('Status updated.');
        loadTasks();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      startEdit(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      taskPendingDelete = e.target.dataset.id;
      confirmTaskTitle.textContent = e.target.dataset.title;
      confirmModal.classList.remove('hidden');
    });
  });
}

// ----- Create / Edit form -----
function startEdit(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  taskIdInput.value = id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  priorityInput.value = task.priority;
  statusInput.value = task.status;
  dueDateInput.value = task.dueDate ? task.dueDate.slice(0, 10) : '';

  formTitle.textContent = 'Edit Task';
  submitBtn.textContent = 'Update Task';
  cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingTaskId = null;
  taskForm.reset();
  taskIdInput.value = '';
  priorityInput.value = 'MEDIUM';
  statusInput.value = 'TODO';
  formTitle.textContent = 'Create Task';
  submitBtn.textContent = 'Add Task';
  cancelEditBtn.classList.add('hidden');
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    priority: priorityInput.value,
    status: statusInput.value,
    dueDate: dueDateInput.value
  };

  submitBtn.disabled = true;
  try {
    if (editingTaskId) {
      await apiRequest(`${API_BASE}/${editingTaskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Task updated successfully.');
    } else {
      await apiRequest(API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Task created successfully.');
    }
    resetForm();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

cancelEditBtn.addEventListener('click', resetForm);

// ----- Delete confirmation -----
confirmDeleteBtn.addEventListener('click', async () => {
  if (!taskPendingDelete) return;
  try {
    await apiRequest(`${API_BASE}/${taskPendingDelete}`, { method: 'DELETE' });
    showToast('Task deleted.');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    taskPendingDelete = null;
    confirmModal.classList.add('hidden');
  }
});

cancelDeleteBtn.addEventListener('click', () => {
  taskPendingDelete = null;
  confirmModal.classList.add('hidden');
});

// ----- Search & filter -----
let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadTasks, 300);
});
filterStatus.addEventListener('change', loadTasks);
filterPriority.addEventListener('change', loadTasks);
sortBy.addEventListener('change', loadTasks);

// ----- Init -----
resetForm();
loadTasks();
