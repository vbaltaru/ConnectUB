document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ tasks.js încărcat cu succes! (Update: Delete/Status)");

    // 1. VERIFICARE AUTENTIFICARE
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { window.location.href = '/login'; return; }
    const userObj = JSON.parse(storedUser);
    const userId = userObj.id_user;

    // REFERINȚE DOM
    const tasksListContainer = document.getElementById('tasksList');
    const filterButtons = document.querySelectorAll('.filter-pill');
    
    // Referințe Modal
    const modal = document.getElementById('addTaskModal');
    const openModalBtn = document.querySelector('.btn-add-task');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalForm = document.getElementById('modalTaskForm');

    let currentTasks = []; // Păstrăm lista locală de sarcini

    // --- LOGICĂ MODAL ---
    function openModal() { modal.classList.add('show'); document.getElementById('modalTaskName').focus(); }
    function closeModal() { modal.classList.remove('show'); modalForm.reset(); }

    if(openModalBtn) openModalBtn.addEventListener('click', openModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if(modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });


    // --- LOGICĂ ADĂUGARE SARCINĂ ---
    if(modalForm) {
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskData = {
                user_id: userId,
                task_name: document.getElementById('modalTaskName').value,
                task_subject: document.getElementById('modalTaskSubject').value,
                due_date: document.getElementById('modalTaskDate').value || null
            };
            try {
                const res = await fetch('/api/tasks/add', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData)
                });
                const data = await res.json();
                if (data.success) { closeModal(); fetchTasks(); } else { alert("Error: " + data.message); }
            } catch (error) { console.error("Error adding task:", error); alert("Server error."); }
        });
    }


    // Ascultăm click-uri pe întregul container al listei
    tasksListContainer.addEventListener('click', async (e) => {
        // 1. Găsim cartonașul părinte al elementului clickuit
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return; // Dacă nu am dat click într-un cartonaș, ignorăm
        
        const taskId = taskCard.dataset.id; // Luăm ID-ul sarcinii din atributul data-id

    
        // Verificăm dacă s-a dat click pe butonul de delete (sau iconița din el)
        if (e.target.closest('.btn-delete')) {
            // Confirmare simplă
            if(confirm("Are you sure you want to delete this task?")) {
                deleteTaskApi(taskId);
            }
        }

        
        if (e.target.closest('.btn-toggle-status')) {
            // Găsim sarcina curentă în lista noastră locală
            const currentTaskObj = currentTasks.find(t => t.id == taskId);
            if(currentTaskObj) {
                cycleTaskStatusApi(taskId, currentTaskObj.statusRaw);
            }
        }
    });

    // --- FUNCȚII API NOI ---

    // Funcție care cheamă API-ul de DELETE
    async function deleteTaskApi(taskId) {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchTasks(); // Reîncărcăm lista după ștergere
            } else {
                alert("Error deleting: " + data.message);
            }
        } catch (error) {
            console.error("Error deleting task:", error); alert("Server connection error.");
        }
    }

    // Funcție care calculează următorul status și cheamă API-ul de PATCH
    async function cycleTaskStatusApi(taskId, currentStatusRaw) {
        let nextStatus;
        // Rotim statusurile: To do -> In progress -> Done -> To do
        if (currentStatusRaw === 'To do') nextStatus = 'In progress';
        else if (currentStatusRaw === 'In progress') nextStatus = 'Done';
        else nextStatus = 'To do';

        try {
            const res = await fetch(`/api/tasks/${taskId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchTasks(); // Reîncărcăm lista pentru a vedea noul status
            } else {
                alert("Error updating status: " + data.message);
            }
        } catch (error) {
            console.error("Error updating status:", error); alert("Server connection error.");
        }
    }


    // --- FUNCȚII ÎNCĂRCARE ȘI RANDARE (Actualizate puțin) ---
    async function fetchTasks() {
        try {
            // Nu mai afișăm "Loading..." la fiecare refresh mic, e deranjant
            const res = await fetch(`/api/tasks/user/${userId}`);
            const data = await res.json();
            if (data.success) {
                currentTasks = data.tasks.map(dbTask => ({
                    id: dbTask.id,
                    title: dbTask.task_name,
                    subject: dbTask.task_subject || "General",
                    dueDate: dbTask.due_date || "No date",
                    // Păstrăm și statusul original din DB
                    statusRaw: dbTask.task_status,
                    // Status normalizat pentru filtrare CSS
                    statusFilter: dbTask.task_status.toLowerCase().replace(' ', ''),
                    completed: dbTask.task_status === 'Done'
                }));
                // Re-aplicăm filtrul activ curent
                const activeFilterBtn = document.querySelector('.filter-pill.active');
                const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
                renderTasks(currentFilter);
            } else { tasksListContainer.innerHTML = `<p style="color: var(--danger-red);">Error: ${data.message}</p>`; }
        } catch (error) { tasksListContainer.innerHTML = '<p style="color: var(--danger-red);">Server connection error.</p>'; console.error(error);}
    }

    function renderTasks(filter = 'all') {
        tasksListContainer.innerHTML = '';
        const filteredTasks = currentTasks.filter(task => {
            if (filter === 'all') return true;
            return task.statusFilter === filter.toLowerCase().replace(' ', '');
        });

        if (filteredTasks.length === 0) {
            tasksListContainer.innerHTML = '<p style="text-align:center; color: var(--text-grey); margin-top: 30px;">No tasks found.</p>';
            return;
        }

        filteredTasks.forEach(task => {
            const isCompletedClass = task.completed ? 'completed' : '';
            let statusBadgeHtml = '';
            // Folosim statusRaw pentru verificare precisă
            if(task.statusRaw === 'To do') statusBadgeHtml = '<span class="task-status-badge badge-todo">To Do</span>';
            else if (task.statusRaw === 'In progress') statusBadgeHtml = '<span class="task-status-badge badge-progress">In Progress</span>';
            else if (task.statusRaw === 'Done') statusBadgeHtml = '<span class="task-status-badge badge-done">Done</span>';
            
            // AICI AM ADĂUGAT CLASA 'btn-toggle-status' LA PRIMUL BUTON
            const taskHtml = `
                <div class="task-card ${isCompletedClass}" data-id="${task.id}">
                    <div class="task-checkbox-container">
                        <div class="task-checkbox"><span class="material-symbols-rounded">check</span></div>
                    </div>
                    <div class="task-content">
                        <h3 class="task-title">${task.title}</h3>
                        <div class="task-details-row" style="margin-top: 10px">
                            <div class="task-detail-item"><span class="material-symbols-rounded">menu_book</span><span>${task.subject}</span></div>
                        </div>
                    </div>
                    <div class="task-meta-actions">
                        ${statusBadgeHtml}
                        <div class="task-detail-item" style="font-size: 0.85rem;"><span class="material-symbols-rounded">event</span><span>${task.dueDate}</span></div>
                        <div class="task-actions">
                            <button class="btn-icon btn-toggle-status" title="Change Status"><span class="material-symbols-rounded">edit</span></button>
                            <button class="btn-icon btn-delete" title="Delete Task"><span class="material-symbols-rounded">delete</span></button>
                        </div>
                    </div>
                </div>`;
            tasksListContainer.insertAdjacentHTML('beforeend', taskHtml);
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTasks(btn.dataset.filter);
        });
    });

    // Încărcare inițială cu indicator
    tasksListContainer.innerHTML = '<p style="color: var(--text-grey); text-align:center; margin-top: 20px;">Loading tasks...</p>';
    fetchTasks();
});