/* =========================================================
   TaskFlow - Application Logic
   Uses:
   - DOM manipulation
   - Event handling
   - LocalStorage
   - Array methods
   - Form validation
   ========================================================= */

const STORAGE_KEY = "taskflow_tasks_v1";

let tasks = loadTasks();
let currentFilter = "all";
let currentEditingId = null;

// DOM elements
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");

const totalTasks = document.getElementById("totalTasks");
const activeTasks = document.getElementById("activeTasks");
const completedTasks = document.getElementById("completedTasks");
const highTasks = document.getElementById("highTasks");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const listTitle = document.getElementById("listTitle");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");

const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const modalTitle = document.getElementById("modalTitle");
const taskId = document.getElementById("taskId");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");

const toast = document.getElementById("toast");
const saveStatus = document.getElementById("saveStatus");

// ---------------------------
// Storage
// ---------------------------

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);

    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

  saveStatus.textContent = "Saved locally";
  window.clearTimeout(saveTasks.statusTimer);

  saveTasks.statusTimer = window.setTimeout(() => {
    saveStatus.textContent = "All changes saved";
  }, 500);
}

// ---------------------------
// Rendering
// ---------------------------

function render() {
  updateStats();

  const visibleTasks = getVisibleTasks();

  taskList.innerHTML = "";

  if (visibleTasks.length === 0) {
    taskList.classList.add("hidden");
    emptyState.classList.remove("hidden");
    updateEmptyState();
    return;
  }

  taskList.classList.remove("hidden");
  emptyState.classList.add("hidden");

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskCard(task));
  });
}

function updateStats() {
  const completed = tasks.filter((task) => task.completed).length;
  const active = tasks.length - completed;
  const high = tasks.filter(
    (task) => task.priority === "high" && !task.completed
  ).length;

  totalTasks.textContent = tasks.length;
  activeTasks.textContent = active;
  completedTasks.textContent = completed;
  highTasks.textContent = high;
}

function getVisibleTasks() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  let filtered = tasks.filter((task) => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    const searchableText =
      `${task.title} ${task.description} ${task.priority}`.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  filtered.sort((a, b) => {
    switch (sortSelect.value) {
      case "oldest":
        return a.createdAt - b.createdAt;

      case "priority": {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }

      case "dueDate":
        return compareDueDates(a, b);

      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  return filtered;
}

function compareDueDates(a, b) {
  if (!a.dueDate && !b.dueDate) {
    return b.createdAt - a.createdAt;
  }

  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;

  return new Date(a.dueDate) - new Date(b.dueDate);
}

function createTaskCard(task) {
  const article = document.createElement("article");
  article.className = `task-card ${task.completed ? "completed" : ""}`;

  const checkButton = document.createElement("button");
  checkButton.className = "check-btn";
  checkButton.type = "button";
  checkButton.dataset.action = "toggle";
  checkButton.dataset.id = task.id;
  checkButton.setAttribute(
    "aria-label",
    task.completed ? "Mark task active" : "Mark task completed"
  );
  checkButton.textContent = task.completed ? "✓" : "";

  const content = document.createElement("div");

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  content.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    content.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `badge ${task.priority}`;
  priority.textContent = task.priority;
  meta.appendChild(priority);

  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "due-date";
    due.textContent = `Due ${formatDate(task.dueDate)}`;
    meta.appendChild(due);
  }

  content.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.className = "icon-btn";
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.dataset.id = task.id;
  editButton.setAttribute("aria-label", "Edit task");
  editButton.textContent = "✎";

  const deleteButton = document.createElement("button");
  deleteButton.className = "icon-btn delete-btn";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = task.id;
  deleteButton.setAttribute("aria-label", "Delete task");
  deleteButton.textContent = "⌫";

  actions.append(editButton, deleteButton);
  article.append(checkButton, content, actions);

  return article;
}

function updateEmptyState() {
  const hasTasks = tasks.length > 0;
  const hasSearch = searchInput.value.trim().length > 0;

  if (hasSearch) {
    emptyTitle.textContent = "No matching tasks";
    emptyText.textContent = "Try another search term or change the filter.";
    return;
  }

  if (currentFilter === "completed") {
    emptyTitle.textContent = "No completed tasks";
    emptyText.textContent = "Completed tasks will appear here.";
    return;
  }

  if (currentFilter === "active") {
    emptyTitle.textContent = "No active tasks";
    emptyText.textContent = hasTasks
      ? "Everything is completed. Nice work."
      : "Create a task to get started.";
    return;
  }

  emptyTitle.textContent = "No tasks yet";
  emptyText.textContent = "Create your first task to get started.";
}

// ---------------------------
// Modal / Form
// ---------------------------

function openAddModal() {
  currentEditingId = null;

  modalTitle.textContent = "Add a new task";
  taskForm.reset();
  taskId.value = "";
  taskPriority.value = "medium";

  openModal();
  taskTitle.focus();
}

function openEditModal(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  currentEditingId = id;

  modalTitle.textContent = "Edit task";
  taskId.value = task.id;
  taskTitle.value = task.title;
  taskDescription.value = task.description || "";
  taskPriority.value = task.priority;
  taskDueDate.value = task.dueDate || "";

  openModal();
  taskTitle.focus();
}

function openModal() {
  taskModal.classList.remove("hidden");
  taskModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  taskModal.classList.add("hidden");
  taskModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  currentEditingId = null;
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const priority = taskPriority.value;
  const dueDate = taskDueDate.value;

  if (!title) {
    showToast("Please enter a task title.");
    taskTitle.focus();
    return;
  }

  if (currentEditingId) {
    const task = tasks.find((item) => item.id === currentEditingId);

    if (task) {
      task.title = title;
      task.description = description;
      task.priority = priority;
      task.dueDate = dueDate;
      task.updatedAt = Date.now();
      showToast("Task updated successfully.");
    }
  } else {
    const newTask = {
      id: createId(),
      title,
      description,
      priority,
      dueDate,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    tasks.unshift(newTask);
    showToast("Task created successfully.");
  }

  saveTasks();
  closeModal();
  render();
}

// ---------------------------
// Task actions
// ---------------------------

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  task.completed = !task.completed;
  task.updatedAt = Date.now();

  saveTasks();
  render();

  showToast(task.completed ? "Task completed." : "Task moved to active.");
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);

  if (!task) return;

  const confirmed = window.confirm(`Delete "${task.title}"?`);

  if (!confirmed) return;

  tasks = tasks.filter((item) => item.id !== id);

  saveTasks();
  render();

  showToast("Task deleted.");
}

function clearCompleted() {
  const completedCount = tasks.filter((task) => task.completed).length;

  if (completedCount === 0) {
    showToast("There are no completed tasks to clear.");
    return;
  }

  const confirmed = window.confirm(
    `Remove ${completedCount} completed task${completedCount > 1 ? "s" : ""}?`
  );

  if (!confirmed) return;

  tasks = tasks.filter((task) => !task.completed);

  saveTasks();
  render();

  showToast("Completed tasks cleared.");
}

// ---------------------------
// Helpers
// ---------------------------

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// ---------------------------
// Event listeners
// ---------------------------

document.getElementById("openAddBtn").addEventListener("click", openAddModal);
document.getElementById("emptyAddBtn").addEventListener("click", openAddModal);

document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

document.querySelector("[data-close-modal]").addEventListener(
  "click",
  closeModal
);

taskForm.addEventListener("submit", handleFormSubmit);

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    currentFilter = button.dataset.filter;

    const titles = {
      all: "All tasks",
      active: "Active tasks",
      completed: "Completed tasks"
    };

    listTitle.textContent = titles[currentFilter];
    render();
  });
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "toggle") toggleTask(id);
  if (action === "edit") openEditModal(id);
  if (action === "delete") deleteTask(id);
});

clearCompletedBtn.addEventListener("click", clearCompleted);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !taskModal.classList.contains("hidden")) {
    closeModal();
  }
});

// Initial render
render();
