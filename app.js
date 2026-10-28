// Keep task data in one array and render the visible list from that state.
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const filterControls = document.querySelector("#filter-controls");
const emptyState = document.querySelector("#empty-state");
const taskList = document.querySelector("#task-list");

const appStatus = document.createElement("p");
appStatus.className = "app-status";
appStatus.setAttribute("role", "status");
appStatus.setAttribute("aria-live", "polite");
taskForm.insertAdjacentElement("afterend", appStatus);

const deleteDialog = document.createElement("dialog");
deleteDialog.setAttribute("aria-labelledby", "delete-dialog-title");
deleteDialog.setAttribute("aria-describedby", "delete-dialog-description");

const deleteDialogTitle = document.createElement("h2");
deleteDialogTitle.id = "delete-dialog-title";
deleteDialogTitle.textContent = "Delete task?";

const deleteDialogDescription = document.createElement("p");
deleteDialogDescription.id = "delete-dialog-description";
deleteDialogDescription.className = "delete-confirmation-text";

const dialogActions = document.createElement("div");
dialogActions.className = "dialog-actions";

const cancelDeleteButton = document.createElement("button");
cancelDeleteButton.type = "button";
cancelDeleteButton.className = "cancel-btn";
cancelDeleteButton.autofocus = true;
cancelDeleteButton.textContent = "Cancel";

const confirmDeleteButton = document.createElement("button");
confirmDeleteButton.type = "button";
confirmDeleteButton.className = "dialog-delete-btn";
confirmDeleteButton.textContent = "Delete task";

dialogActions.append(cancelDeleteButton, confirmDeleteButton);
deleteDialog.append(deleteDialogTitle, deleteDialogDescription, dialogActions);
document.body.append(deleteDialog);

const storageKey = "task-tracker-tasks";
let tasks = [];
let storage;
let storageAvailable = true;
let idFallbackCounter = 0;
let pendingDelete = null;

function showStatus(message) {
  appStatus.textContent = message;
}

function isValidTaskList(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  const seenIds = new Set();

  return value.every((task) => {
    if (
      task === null ||
      typeof task !== "object" ||
      typeof task.id !== "string" ||
      task.id.length === 0 ||
      seenIds.has(task.id) ||
      typeof task.text !== "string" ||
      task.text.trim().length === 0 ||
      task.text.length > taskInput.maxLength ||
      typeof task.completed !== "boolean"
    ) {
      return false;
    }

    seenIds.add(task.id);
    return true;
  });
}

function loadTasks() {
  let savedTasks;

  try {
    storage = window.localStorage;
    savedTasks = storage.getItem(storageKey);
  } catch {
    storageAvailable = false;
    showStatus(
      "Browser storage is unavailable. Tasks will only be kept until you close or reload this page."
    );
    return;
  }

  if (savedTasks === null) {
    return;
  }

  let parsedTasks;
  try {
    parsedTasks = JSON.parse(savedTasks);
  } catch {
    showStatus("Saved tasks could not be read, so the list started empty.");
    return;
  }

  if (!isValidTaskList(parsedTasks)) {
    showStatus("Saved tasks were invalid, so the list started empty.");
    return;
  }

  tasks = parsedTasks;
}

function saveTasks() {
  if (!storageAvailable) {
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(tasks));
    showStatus("");
  } catch {
    storageAvailable = false;
    showStatus(
      "Tasks are available for this session, but could not be saved in browser storage."
    );
  }
}

function createTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    const randomId = crypto.randomUUID();

    if (
      typeof randomId === "string" &&
      randomId.length > 0 &&
      !tasks.some((task) => task.id === randomId)
    ) {
      return randomId;
    }
  }

  // The fallback also covers an unavailable or unexpectedly repeated UUID.
  let id;
  do {
    idFallbackCounter += 1;
    id = `${Date.now()}-${idFallbackCounter}`;
  } while (tasks.some((task) => task.id === id));

  return id;
}

function getCurrentFilter() {
  const selectedFilter = filterControls.querySelector(
    'input[name="task-filter"]:checked'
  );
  return selectedFilter ? selectedFilter.value : "all";
}

function getVisibleTasks() {
  const filter = getCurrentFilter();

  if (filter === "active") {
    return tasks.filter((task) => !task.completed);
  }

  if (filter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  const items = visibleTasks.map((task) => {
    const item = document.createElement("li");
    item.classList.add("task-item");
    item.dataset.id = task.id;

    if (task.completed) {
      item.classList.add("task-item--completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `task-checkbox-${task.id}`;
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";

    const taskLabel = document.createElement("label");
    taskLabel.className = "task-text";
    taskLabel.htmlFor = checkbox.id;
    taskLabel.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.text}`);
    deleteButton.textContent = "Delete";

    item.append(checkbox, taskLabel, deleteButton);
    return item;
  });

  taskList.replaceChildren(...items);

  if (tasks.length === 0) {
    emptyState.textContent = "No tasks yet. Add a task to get started.";
    emptyState.hidden = false;
  } else if (visibleTasks.length === 0) {
    const filter = getCurrentFilter();
    emptyState.textContent =
      filter === "completed"
        ? "No completed tasks to display."
        : "No active tasks to display.";
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
  }
}

function openDeleteConfirmation(task, trigger) {
  const visibleIndex = Array.from(taskList.children).indexOf(
    trigger.closest("li[data-id]")
  );

  pendingDelete = {
    taskId: task.id,
    trigger,
    visibleIndex,
    confirmed: false
  };
  deleteDialogDescription.textContent =
    `Are you sure you want to delete "${task.text}"? This cannot be undone.`;
  deleteDialog.showModal();
  cancelDeleteButton.focus();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();

  if (text.length === 0) {
    showStatus("Enter a task before adding it.");
    taskInput.focus();
    return;
  }

  if (text.length > taskInput.maxLength) {
    showStatus(`Tasks must be ${taskInput.maxLength} characters or fewer.`);
    taskInput.focus();
    return;
  }

  tasks.push({
    id: createTaskId(),
    text,
    completed: false
  });

  taskInput.value = "";
  saveTasks();
  renderTasks();
  taskInput.focus();
});

filterControls.addEventListener("change", (event) => {
  if (event.target.matches('input[name="task-filter"]')) {
    renderTasks();
  }
});

// Delegate task actions so new list items need no individual event handlers.
taskList.addEventListener("change", (event) => {
  if (!event.target.matches('input[data-action="toggle"]')) {
    return;
  }

  const item = event.target.closest("li[data-id]");
  const task = tasks.find((currentTask) => currentTask.id === item?.dataset.id);

  if (!task) {
    return;
  }

  task.completed = event.target.checked;
  saveTasks();
  renderTasks();
});

taskList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest('button[data-action="delete"]');

  if (!deleteButton) {
    return;
  }

  const item = deleteButton.closest("li[data-id]");

  if (!item) {
    return;
  }

  const task = tasks.find((currentTask) => currentTask.id === item.dataset.id);

  if (!task) {
    return;
  }

  openDeleteConfirmation(task, deleteButton);
});

cancelDeleteButton.addEventListener("click", () => {
  deleteDialog.close();
});

deleteDialog.addEventListener("cancel", () => {
  // Escape closes the dialog without changing the pending task.
  deleteDialog.close();
});

confirmDeleteButton.addEventListener("click", () => {
  if (!pendingDelete) {
    return;
  }

  const { taskId, visibleIndex } = pendingDelete;
  const task = tasks.find((currentTask) => currentTask.id === taskId);

  if (!task) {
    deleteDialog.close();
    return;
  }

  pendingDelete.confirmed = true;
  tasks = tasks.filter((currentTask) => currentTask.id !== taskId);
  deleteDialog.close();
  saveTasks();
  renderTasks();

  const nextRow = taskList.children[
    Math.min(visibleIndex, taskList.children.length - 1)
  ];
  const nextCheckbox = nextRow?.querySelector('input[data-action="toggle"]');
  (nextCheckbox || taskInput).focus();
});

deleteDialog.addEventListener("close", () => {
  if (!pendingDelete) {
    return;
  }

  const { trigger, confirmed } = pendingDelete;
  pendingDelete = null;

  if (!confirmed && trigger.isConnected) {
    trigger.focus();
  }
});

loadTasks();
renderTasks();
