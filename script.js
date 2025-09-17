class KanbanBoard {
  constructor() {
    this.tasks = this.loadTasksFromStorage();
    this.draggedTask = null;
    this.editingTaskId = null;
    this.init();
  }

  // Initialize the application
  init() {
    this.renderAllTasks();
    this.attachEventListeners();
    this.setupDragAndDrop();
  }

  // Storage Management Module
  loadTasksFromStorage() {
    const stored = localStorage.getItem("kanban-tasks");
    return stored
      ? JSON.parse(stored)
      : {
          todo: [],
          inprogress: [],
          done: [],
        };
  }

  saveTasksToStorage() {
    localStorage.setItem("kanban-tasks", JSON.stringify(this.tasks));
  }

  // Task Management Module
  createTask(title, description) {
    if (!title.trim()) {
      alert("Task title is required!");
      return;
    }

    const task = {
      id: this.generateUniqueId(),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    this.tasks.todo.push(task);
    this.saveTasksToStorage();
    this.renderAllTasks();
    this.clearInputFields();
  }

  updateTask(taskId, newTitle, newDescription) {
    let taskFound = false;

    Object.keys(this.tasks).forEach((column) => {
      const taskIndex = this.tasks[column].findIndex(
        (task) => task.id === taskId
      );
      if (taskIndex !== -1) {
        this.tasks[column][taskIndex].title = newTitle.trim();
        this.tasks[column][taskIndex].description = newDescription.trim();
        this.tasks[column][taskIndex].updatedAt = new Date().toISOString();
        taskFound = true;
      }
    });

    if (taskFound) {
      this.saveTasksToStorage();
      this.renderAllTasks();
    }
  }

  deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    Object.keys(this.tasks).forEach((column) => {
      this.tasks[column] = this.tasks[column].filter(
        (task) => task.id !== taskId
      );
    });

    this.saveTasksToStorage();
    this.renderAllTasks();
  }

  moveTask(taskId, targetColumn) {
    let movedTask = null;

    // Find and remove task from current column
    Object.keys(this.tasks).forEach((column) => {
      const taskIndex = this.tasks[column].findIndex(
        (task) => task.id === taskId
      );
      if (taskIndex !== -1) {
        movedTask = this.tasks[column].splice(taskIndex, 1)[0];
      }
    });

    // Add task to target column
    if (movedTask && this.tasks[targetColumn]) {
      this.tasks[targetColumn].push(movedTask);
      this.saveTasksToStorage();
      this.renderAllTasks();
    }
  }

  // UI Rendering Module
  renderAllTasks() {
    Object.keys(this.tasks).forEach((column) => {
      this.renderColumn(column);
    });
    this.updateTaskCounts();
  }

  renderColumn(columnName) {
    const container = document.getElementById(`${columnName}-tasks`);
    const tasks = this.tasks[columnName];

    // Clear container
    container.innerHTML = "";

    if (tasks.length === 0) {
      container.appendChild(this.createEmptyState());
    } else {
      tasks.forEach((task) => {
        container.appendChild(this.createTaskCard(task));
      });
    }
  }

  createTaskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.draggable = true;
    card.dataset.taskId = task.id;

    card.innerHTML = `
          <div class="task-header">
              <div class="task-title">${this.escapeHtml(task.title)}</div>
              <div class="task-actions">
                  <button class="action-btn edit-btn" data-task-id="${
                    task.id
                  }" title="Edit task">
                      ✏️
                  </button>
                  <button class="action-btn delete-btn" data-task-id="${
                    task.id
                  }" title="Delete task">
                      🗑️
                  </button>
              </div>
          </div>
          ${
            task.description
              ? `<div class="task-description">${this.escapeHtml(
                  task.description
                )}</div>`
              : ""
          }
      `;

    return card;
  }

  createEmptyState() {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
          <p>No tasks yet</p>
          <small>Drag tasks here or create a new one</small>
      `;
    return emptyState;
  }

  updateTaskCounts() {
    Object.keys(this.tasks).forEach((column) => {
      const countElement = document.getElementById(`${column}-count`);
      if (countElement) {
        countElement.textContent = this.tasks[column].length;
      }
    });
  }

  // Event Handling Module
  attachEventListeners() {
    // Add task button
    const addTaskBtn = document.getElementById("add-task-btn");
    addTaskBtn.addEventListener("click", () => this.handleAddTask());

    // Enter key support for input fields
    ["task-title", "task-description"].forEach((inputId) => {
      const input = document.getElementById(inputId);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleAddTask();
        }
      });
    });

    // Task actions (edit/delete) - Event delegation
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-btn")) {
        this.handleEditTask(e.target.dataset.taskId);
      } else if (e.target.classList.contains("delete-btn")) {
        this.deleteTask(e.target.dataset.taskId);
      }
    });

    // Modal event listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    const modal = document.getElementById("edit-modal");
    const saveBtn = document.getElementById("save-edit-btn");
    const cancelBtn = document.getElementById("cancel-edit-btn");

    saveBtn.addEventListener("click", () => this.handleSaveEdit());
    cancelBtn.addEventListener("click", () => this.hideEditModal());

    // Close modal on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.hideEditModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        this.hideEditModal();
      }
    });
  }

  // Drag and Drop Module
  setupDragAndDrop() {
    // Drag start event
    document.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("task-card")) {
        this.draggedTask = e.target.dataset.taskId;
        e.target.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      }
    });

    // Drag end event
    document.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("task-card")) {
        e.target.classList.remove("dragging");
        this.draggedTask = null;
      }
    });

    // Set up drop zones
    const dropZones = document.querySelectorAll(".tasks-container");
    dropZones.forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        zone.classList.add("drag-over");
      });

      zone.addEventListener("dragleave", (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove("drag-over");
        }
      });

      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("drag-over");

        if (this.draggedTask) {
          const targetColumn = zone.id.replace("-tasks", "");
          this.moveTask(this.draggedTask, targetColumn);
        }
      });
    });
  }

  // Event Handlers
  handleAddTask() {
    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-description").value;
    this.createTask(title, description);
  }

  handleEditTask(taskId) {
    const task = this.findTaskById(taskId);
    if (!task) return;

    this.editingTaskId = taskId;
    document.getElementById("edit-title").value = task.title;
    document.getElementById("edit-description").value = task.description;
    this.showEditModal();
  }

  handleSaveEdit() {
    if (!this.editingTaskId) return;

    const newTitle = document.getElementById("edit-title").value;
    const newDescription = document.getElementById("edit-description").value;

    if (!newTitle.trim()) {
      alert("Task title is required!");
      return;
    }

    this.updateTask(this.editingTaskId, newTitle, newDescription);
    this.hideEditModal();
  }

  // Modal Management
  showEditModal() {
    document.getElementById("edit-modal").classList.remove("hidden");
    document.getElementById("edit-title").focus();
  }

  hideEditModal() {
    document.getElementById("edit-modal").classList.add("hidden");
    this.editingTaskId = null;
  }

  // Utility Functions Module
  findTaskById(taskId) {
    let foundTask = null;
    Object.values(this.tasks).forEach((columnTasks) => {
      const task = columnTasks.find((t) => t.id === taskId);
      if (task) foundTask = task;
    });
    return foundTask;
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  clearInputFields() {
    document.getElementById("task-title").value = "";
    document.getElementById("task-description").value = "";
    document.getElementById("task-title").focus();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the Kanban Board when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new KanbanBoard();
});
