/**
 * TaskFlow — To-Do List Application
 * Vanilla JavaScript with localStorage persistence
 */

// ============================================
// State Management
// ============================================

/** @type {Array<Task>} */
let tasks = [];

/** Current active filter: 'all' | 'pending' | 'completed' */
let currentFilter = 'all';

/** Current search query */
let searchQuery = '';

/** ID of task pending deletion (for modal) */
let deleteTargetId = null;

/** ID of task being edited */
let editTargetId = null;

/**
 * @typedef {Object} Task
 * @property {string} id - Unique identifier
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {'pending' | 'completed'} status - Task status
 * @property {string} createdAt - ISO date string
 * @property {string|null} completedAt - ISO date string or null
 */

// ============================================
// DOM References
// ============================================

const DOM = {
  addForm: document.getElementById('add-task-form'),
  taskTitle: document.getElementById('task-title'),
  taskDescription: document.getElementById('task-description'),
  titleError: document.getElementById('title-error'),
  pendingList: document.getElementById('pending-list'),
  completedList: document.getElementById('completed-list'),
  pendingSection: null,
  completedSection: null,
  pendingCount: null,
  completedCount: null,
  emptyState: document.getElementById('empty-state'),
  searchInput: null,
  filterBtns: [],
  statTotal: document.getElementById('stat-total'),
  statPending: document.getElementById('stat-pending'),
  statCompleted: document.getElementById('stat-completed'),
  statPercentage: document.getElementById('stat-percentage'),
  progressFill: document.getElementById('progress-fill'),
  themeToggle: document.getElementById('theme-toggle'),
  toastContainer: document.getElementById('toast-container'),
  deleteModal: document.getElementById('delete-modal'),
  modalCancel: document.getElementById('modal-cancel'),
  modalConfirm: document.getElementById('modal-confirm'),
  modalMessage: document.getElementById('modal-message'),
  editModal: document.getElementById('edit-modal'),
  editForm: document.getElementById('edit-form'),
  editTitle: document.getElementById('edit-title'),
  editDescription: document.getElementById('edit-description'),
  editTitleError: document.getElementById('edit-title-error'),
  editCancel: document.getElementById('edit-cancel'),
};

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a unique ID for tasks
 * @returns {string}
 */
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format an ISO date string for display
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Local Storage
// ============================================

const STORAGE_KEY = 'taskflow_tasks';
const THEME_KEY = 'taskflow_theme';

/**
 * Save tasks array to localStorage
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Load tasks from localStorage
 * @returns {Array<Task>}
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save theme preference
 * @param {string} theme - 'light' | 'dark'
 */
function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Load saved theme preference
 * @returns {string}
 */
function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

// ============================================
// Toast Notifications
// ============================================

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success' | 'info' | 'warning' | 'edit'} type
 */
function showToast(message, type = 'info') {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon ${type}">${icons[type]}</div>
    <span class="toast-message">${escapeHTML(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ============================================
// Theme Management
// ============================================

/**
 * Apply theme to the document
 * @param {string} theme - 'light' | 'dark'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveTheme(theme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// ============================================
// Form Validation
// ============================================

/**
 * Validate task title input
 * @param {string} title
 * @param {HTMLElement} errorEl
 * @param {HTMLInputElement} inputEl
 * @returns {boolean}
 */
function validateTitle(title, errorEl, inputEl) {
  const trimmed = title.trim();

  if (!trimmed) {
    errorEl.textContent = 'Title is required.';
    inputEl.classList.add('error');
    return false;
  }

  if (trimmed.length < 2) {
    errorEl.textContent = 'Title must be at least 2 characters.';
    inputEl.classList.add('error');
    return false;
  }

  errorEl.textContent = '';
  inputEl.classList.remove('error');
  return true;
}

/**
 * Clear validation state on an input
 * @param {HTMLInputElement} inputEl
 * @param {HTMLElement} errorEl
 */
function clearValidation(inputEl, errorEl) {
  inputEl.classList.remove('error');
  errorEl.textContent = '';
}

// ============================================
// Task CRUD Operations
// ============================================

/**
 * Create and add a new task
 * @param {string} title
 * @param {string} description
 */
function addTask(title, description) {
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  tasks.unshift(task);
  saveTasks();
  render();
  showToast('Task added successfully!', 'success');
}

/**
 * Mark a task as completed
 * @param {string} id
 */
function completeTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task || task.status === 'completed') return;

  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  saveTasks();

  // Animate the card before re-rendering
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('completing');
    card.addEventListener('animationend', () => {
      render();
      showToast('Task marked as completed!', 'success');
    }, { once: true });
  } else {
    render();
    showToast('Task marked as completed!', 'success');
  }
}

/**
 * Update an existing task
 * @param {string} id
 * @param {string} title
 * @param {string} description
 */
function updateTask(id, title, description) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.title = title.trim();
  task.description = description.trim();
  saveTasks();
  render();
  showToast('Task updated successfully!', 'edit');
}

/**
 * Delete a task by ID
 * @param {string} id
 */
function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
      showToast('Task deleted.', 'warning');
    }, { once: true });
  } else {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
    showToast('Task deleted.', 'warning');
  }
}

// ============================================
// Filtering & Search
// ============================================

/**
 * Get tasks filtered by current search and filter settings
 * @param {'pending' | 'completed'} status
 * @returns {Array<Task>}
 */
function getFilteredTasks(status) {
  return tasks.filter((task) => {
    const matchesStatus = task.status === status;
    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
}

/**
 * Set the active filter
 * @param {string} filter
 */
function setFilter(filter) {
  currentFilter = filter;
  DOM.filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  render();
}

// ============================================
// Statistics
// ============================================

/**
 * Update the statistics dashboard
 */
function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  DOM.statTotal.textContent = total;
  DOM.statPending.textContent = pending;
  DOM.statCompleted.textContent = completed;
  DOM.statPercentage.textContent = `${percentage}%`;
  DOM.progressFill.style.width = `${percentage}%`;
}

// ============================================
// Rendering
// ============================================

/**
 * Build HTML for a single task card
 * @param {Task} task
 * @returns {string}
 */
function createTaskCardHTML(task) {
  const isPending = task.status === 'pending';
  const statusLabel = isPending ? 'Pending' : 'Completed';
  const statusClass = isPending ? 'pending' : 'completed';

  const completeBtn = isPending
    ? `<button type="button" class="btn-icon complete" data-action="complete" data-id="${task.id}" aria-label="Mark as complete" title="Complete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </button>`
    : '';

  const completedMeta = !isPending
    ? `<span class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Completed: ${formatDateTime(task.completedAt)}
      </span>`
    : '';

  return `
    <article class="task-card ${statusClass}" data-id="${task.id}" role="listitem">
      <div class="task-content">
        <div class="task-header">
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <p class="task-description">${escapeHTML(task.description)}</p>
        <div class="task-meta">
          <span class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Created: ${formatDateTime(task.createdAt)}
          </span>
          ${completedMeta}
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="btn-icon edit" data-action="edit" data-id="${task.id}" aria-label="Edit task" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        ${completeBtn}
        <button type="button" class="btn-icon delete" data-action="delete" data-id="${task.id}" aria-label="Delete task" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}

/**
 * Render all task lists and UI state
 */
function render() {
  const pendingTasks = getFilteredTasks('pending');
  const completedTasks = getFilteredTasks('completed');
  const allTasks = [...pendingTasks, ...completedTasks];
  const hasTasks = tasks.length > 0;
  const hasVisibleTasks = allTasks.length > 0;

  // Render all tasks in single list
  DOM.pendingList.innerHTML = allTasks.length
    ? allTasks.map(createTaskCardHTML).join('')
    : '';

  // Hide completed list
  DOM.completedList.innerHTML = '';

  // Empty state
  DOM.emptyState.hidden = hasTasks;

  // Show no-results message when search yields nothing
  if (hasTasks && !hasVisibleTasks) {
    const noResultsHTML = '<p class="no-results glass-card">No tasks match your search.</p>';
    DOM.pendingList.innerHTML = noResultsHTML;
  }

  updateStats();
  attachCardListeners();
}

/**
 * Attach event listeners to task card action buttons
 */
function attachCardListeners() {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', handleCardAction);
  });
}

/**
 * Handle task card button clicks via event delegation
 * @param {Event} e
 */
function handleCardAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    case 'complete':
      completeTask(id);
      break;
    case 'edit':
      openEditModal(id);
      break;
    case 'delete':
      openDeleteModal(id);
      break;
  }
}

// ============================================
// Modal Handlers
// ============================================

/**
 * Open delete confirmation modal
 * @param {string} id
 */
function openDeleteModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  deleteTargetId = id;
  DOM.modalMessage.textContent = `Are you sure you want to delete "${task.title}"? This action cannot be undone.`;
  DOM.deleteModal.hidden = false;
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
  deleteTargetId = null;
  DOM.deleteModal.hidden = true;
}

/**
 * Open edit task modal
 * @param {string} id
 */
function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editTargetId = id;
  DOM.editTitle.value = task.title;
  DOM.editDescription.value = task.description;
  clearValidation(DOM.editTitle, DOM.editTitleError);
  DOM.editModal.hidden = false;
  DOM.editTitle.focus();
}

/**
 * Close edit task modal
 */
function closeEditModal() {
  editTargetId = null;
  DOM.editForm.reset();
  DOM.editModal.hidden = true;
}

// ============================================
// Event Listeners
// ============================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
  // Add task form submission
  DOM.addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = DOM.taskTitle.value;
    const description = DOM.taskDescription.value;

    if (!validateTitle(title, DOM.titleError, DOM.taskTitle)) return;

    addTask(title, description);
    DOM.addForm.reset();
    clearValidation(DOM.taskTitle, DOM.titleError);
  });

  // Clear validation on input
  DOM.taskTitle.addEventListener('input', () => {
    if (DOM.taskTitle.classList.contains('error')) {
      clearValidation(DOM.taskTitle, DOM.titleError);
    }
  });

  // Enter key support in description textarea (Shift+Enter for newline)
  DOM.taskDescription.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      DOM.addForm.dispatchEvent(new Event('submit'));
    }
  });

  // Search input
  // Removed - no longer needed

  // Filter buttons
  // Removed - no longer needed

  // Theme toggle
  DOM.themeToggle.addEventListener('click', toggleTheme);

  // Delete modal
  DOM.modalCancel.addEventListener('click', closeDeleteModal);
  DOM.modalConfirm.addEventListener('click', () => {
    if (deleteTargetId) {
      deleteTask(deleteTargetId);
      closeDeleteModal();
    }
  });

  DOM.deleteModal.addEventListener('click', (e) => {
    if (e.target === DOM.deleteModal) closeDeleteModal();
  });

  // Edit modal
  DOM.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateTitle(DOM.editTitle.value, DOM.editTitleError, DOM.editTitle)) return;

    if (editTargetId) {
      updateTask(editTargetId, DOM.editTitle.value, DOM.editDescription.value);
      closeEditModal();
    }
  });

  DOM.editCancel.addEventListener('click', closeEditModal);

  DOM.editModal.addEventListener('click', (e) => {
    if (e.target === DOM.editModal) closeEditModal();
  });

  DOM.editTitle.addEventListener('input', () => {
    if (DOM.editTitle.classList.contains('error')) {
      clearValidation(DOM.editTitle, DOM.editTitleError);
    }
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!DOM.deleteModal.hidden) closeDeleteModal();
      if (!DOM.editModal.hidden) closeEditModal();
    }
  });
}

// ============================================
// Application Initialization
// ============================================

/**
 * Initialize the application
 */
function init() {
  applyTheme(loadTheme());
  tasks = loadTasks();
  initEventListeners();
  render();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
