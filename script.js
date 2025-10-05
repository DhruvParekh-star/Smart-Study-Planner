document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDueDateTimeInput = document.getElementById('task-due-datetime');
    const taskPriorityInput = document.getElementById('task-priority');
    const taskList = document.getElementById('task-list');
    const filterButtons = document.getElementById('filter-buttons');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const reminderSection = document.getElementById('reminder-section');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // --- Audio alert setup ---
    const alertSound = new Audio('assets/alert.mp3');

    // --- Theme Toggle Setup ---
    const userPref = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (userPref) {
        document.documentElement.setAttribute('data-theme', userPref);
        themeToggleBtn.textContent = userPref === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.textContent = '☀️ Light Mode';
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggleBtn.textContent = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    });

    // --- State Management ---
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';

    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    // --- Render Tasks ---
    const renderTasks = () => {
        taskList.innerHTML = '';

        let filteredTasks = tasks;
        if (currentFilter === 'pending') {
            filteredTasks = tasks.filter(task => !task.isCompleted);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.isCompleted);
        }

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<p>No tasks found for this filter. 🎉</p>`;
        } else {
            filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            filteredTasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = `task-item priority-${task.priority}`;
                if (task.isCompleted) taskItem.classList.add('completed');
                taskItem.dataset.id = task.id;

                const formattedDueDate = new Date(task.dueDate).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });

                taskItem.innerHTML = `
                    <div class="task-details">
                        <p>${task.title}</p>
                        <span class="due-date">Due: ${formattedDueDate}</span>
                        <span class="priority-text">${task.priority}</span>
                    </div>
                    <div class="task-actions">
                        <button class="complete-btn">${task.isCompleted ? 'Undo' : 'Complete'}</button>
                        <button class="edit-btn">Edit</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                `;
                taskList.appendChild(taskItem);
            });
        }
        updateProgressBar();
        checkReminders();
    };

    // --- Add Task ---
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now(),
            title: taskTitleInput.value.trim(),
            dueDate: taskDueDateTimeInput.value,
            priority: taskPriorityInput.value,
            isCompleted: false,
            alerted: false
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskForm.reset();
    });

    // --- Handle Task Actions ---
    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;
        const taskId = Number(taskItem.dataset.id);
        const task = tasks.find(t => t.id === taskId);

        if (target.classList.contains('save-btn')) {
            const newTitle = taskItem.querySelector('.edit-title').value.trim();
            const newDateTime = taskItem.querySelector('.edit-datetime').value;
            const newPriority = taskItem.querySelector('.edit-priority').value;

            if (newTitle && newDateTime) {
                task.title = newTitle;
                task.dueDate = newDateTime;
                task.priority = newPriority;
                task.alerted = false;
                saveTasks();
                renderTasks();
            }
        } else if (target.classList.contains('edit-btn')) {
            taskItem.innerHTML = `
                <input type="text" class="edit-title" value="${task.title}">
                <input type="datetime-local" class="edit-datetime" value="${task.dueDate}">
                <select class="edit-priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
                <button class="save-btn">Save</button>
            `;
        } else if (target.classList.contains('complete-btn')) {
            task.isCompleted = !task.isCompleted;
            saveTasks();
            renderTasks();
        } else if (target.classList.contains('delete-btn')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
        }
    });

    // --- Progress Bar ---
    const updateProgressBar = () => {
        const completedTasks = tasks.filter(task => task.isCompleted).length;
        const totalTasks = tasks.length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% Complete`;
    };

    // --- Reminders ---
    const checkReminders = () => {
        reminderSection.innerHTML = '';
        const today = new Date().toISOString().slice(0, 10);
        const dueTodayTasks = tasks.filter(task => task.dueDate.startsWith(today) && !task.isCompleted);
        if (dueTodayTasks.length > 0) {
            const reminder = document.createElement('div');
            reminder.className = 'reminder-item';
            reminder.textContent = `🔔 You have ${dueTodayTasks.length} task(s) due today!`;
            reminderSection.appendChild(reminder);
        }
    };

    // --- Task Alert Check ---
    const checkTaskAlerts = () => {
        const now = new Date();
        tasks.forEach(task => {
            if (!task.isCompleted && !task.alerted) {
                const taskDueDate = new Date(task.dueDate);
                if (now >= taskDueDate) {
                    alert(`⏰ TIME'S UP! Your task "${task.title}" is due.`);
                    alertSound.play().catch(error => console.error("Audio playback failed:", error));
                    task.alerted = true;
                    saveTasks();
                }
            }
        });
    };

    // --- Filters ---
    filterButtons.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        }
    });

    // --- Initial Load ---
    renderTasks();
    setInterval(checkTaskAlerts, 30000);
});
