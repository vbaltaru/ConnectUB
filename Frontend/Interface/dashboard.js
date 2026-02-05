const API_BASE = "http://localhost:3000/api";

const Limits = {
  TASKS: 4,
  FRIENDS: 3,
  GROUPS: 3,
};

let dashboardTasksData = []; // Stocăm sarcinile global pentru filtrare

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    // 1. Verificăm token-ul și luăm datele user-ului
    const userRes = await fetch(`${API_BASE}/auth/verify`, {
      method: "GET",
      headers: { Authorization: token },
    });

    if (!userRes.ok) throw new Error("Auth failed");

    const userData = await userRes.json();
    if (!userData.success) throw new Error(userData.message);

    const user = userData.user;
    localStorage.setItem("user", JSON.stringify(user));

    // 2. Populăm Dashboard-ul
    renderUserInfo(user);
    setupTaskFilters();

    // Încărcăm datele în paralel pentru performanță
    await Promise.all([
      loadFriends(user.id_user),
      loadGroups(user.id_user),
      loadTasks(user.id_user),
      loadSchedule(user.id_user),
    ]);
  } catch (error) {
    console.error("Dashboard Error:", error);
    // Dacă e eroare de auth, delogăm
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
});

// --- 1. User Info ---
function renderUserInfo(user) {
  // Presupunem că există aceste ID-uri în HTML-ul dashboard-ului (index.html)
  const welcomeEl = document.getElementById("welcome-message");
  const nameEl =
    document.getElementById("name") ||
    document.getElementById("user-full-name");
  const specEl =
    document.getElementById("Specialisation") ||
    document.getElementById("user-specialization");
  const avatarEl =
    document.getElementById("Profile-picture") ||
    document.getElementById("user-avatar");

  // Folosim username ca fallback dacă nu avem Nume/Prenume
  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || "User";

  if (welcomeEl)
    welcomeEl.textContent = `Welcome back, ${user.first_name || user.username || ""}!`;
  if (nameEl) nameEl.textContent = displayName;

  if (specEl) {
    specEl.textContent =
      user.specialization && user.study_year
        ? `${user.specialization}, Year ${user.study_year}`
        : user.email || "Student";
  }

  if (avatarEl) {
    const hasImage =
      user.profile_picture_url &&
      user.profile_picture_url !== "default_avatar.png" &&
      user.profile_picture_url.trim() !== "";

    if (hasImage) {
      avatarEl.src = user.profile_picture_url;
      avatarEl.style.display = "block";
      const placeholder = document.getElementById("user-avatar-placeholder");
      if (placeholder) placeholder.remove();
    } else {
      avatarEl.style.display = "none";
      let placeholder = document.getElementById("user-avatar-placeholder");
      if (!placeholder) {
        placeholder = document.createElement("div");
        placeholder.id = "user-avatar-placeholder";
        placeholder.className = "avatar-circle";
        placeholder.style.border = "3px solid #8b70f9"; // Asigurăm border-ul și pe placeholder
        placeholder.style.borderRadius = "50%";
        placeholder.style.color = "#8b70f9";
        placeholder.style.display = "flex";
        placeholder.style.alignItems = "center";
        placeholder.style.justifyContent = "center";
        placeholder.style.width = "clamp(30px, 3.5vw, 50px)";
        placeholder.style.height = "clamp(30px, 3.5vw, 50px)";
        placeholder.style.backgroundColor = "#ffffff";
        avatarEl.parentNode.insertBefore(placeholder, avatarEl);
      }
      const initial = (user.username || "?").charAt(0).toUpperCase();
      placeholder.textContent = initial;
    }
  }
}

// --- 2. Friends (Max 3) ---
async function loadFriends(userId) {
  try {
    const res = await fetch(`${API_BASE}/friends/list/${userId}`);
    const data = await res.json();
    const container = document.getElementById("dashboard-friends-list");

    if (!container) return;
    container.innerHTML = "";

    if (data.success && data.friends.length > 0) {
      // Luăm doar primii 3
      const limitedFriends = data.friends.slice(0, Limits.FRIENDS);

      limitedFriends.forEach((friend) => {
        const initial = friend.username.charAt(0).toUpperCase();
        const html = `
                    <div class="dashboard-item" style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div class="avatar-circle-sm" style="background-color: #e2e8f0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: 10px; font-weight: bold; color: #475569;">
                                ${initial}
                            </div>
                            <div class="info">
                                <span class="name" style="font-weight: 500;">${friend.username}</span>
                            </div>
                        </div>
                        <button onclick="window.location.href='/messages?startChat=${friend.id_user}'" style="width: auto; padding: 3px 12px; background-color: #8b70f9; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 500; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#7861d6'" onmouseout="this.style.backgroundColor='#8b70f9'">Message</button>
                    </div>
                `;
        container.insertAdjacentHTML("beforeend", html);
      });
    } else {
      container.innerHTML = "<p class='empty-state'>No friends added yet.</p>";
    }
  } catch (e) {
    console.error("Friends load error", e);
  }
}

// --- 3. Groups (Max 3) ---
async function loadGroups(userId) {
  try {
    const res = await fetch(`${API_BASE}/groups/list/${userId}`);
    const data = await res.json();
    const container = document.getElementById("dashboard-groups-list");

    if (!container) return;
    container.innerHTML = "";

    if (data.success && data.groups.length > 0) {
      const limitedGroups = data.groups.slice(0, Limits.GROUPS);

      limitedGroups.forEach((group) => {
        const initial = group.name.charAt(0).toUpperCase();
        const html = `
                    <div class="dashboard-item">
                        <div class="avatar-circle-sm" style="background-color: #6366f1; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-right: 10px; font-weight: bold;">
                            ${initial}
                        </div>
                        <div class="info">
                            <span class="name" style="font-weight: 500;">${group.name}</span>
                        </div>
                    </div>
                `;
        container.insertAdjacentHTML("beforeend", html);
      });
    } else {
      container.innerHTML = "<p class='empty-state'>No groups joined.</p>";
    }
  } catch (e) {
    console.error("Groups load error", e);
  }
}

// --- 4. Tasks (Max 4) ---
async function loadTasks(userId) {
  try {
    const res = await fetch(`${API_BASE}/tasks/user/${userId}`);
    const data = await res.json();

    if (data.success) {
      dashboardTasksData = data.tasks;
      renderDashboardTasks("all");
    } else {
      renderDashboardTasks("all");
    }
  } catch (e) {
    console.error("Tasks load error", e);
  }
}

function renderDashboardTasks(filter) {
  const container = document.getElementById("dashboard-tasks-list");
  if (!container) return;
  container.innerHTML = "";

  let filtered = dashboardTasksData;
  if (filter !== "all") {
    filtered = dashboardTasksData.filter((t) => t.task_status === filter);
  }

  if (filtered.length > 0) {
    const limitedTasks = filtered.slice(0, Limits.TASKS);

    limitedTasks.forEach((task) => {
      let statusColor = "#64748b"; // Slate 500 for To do
      let statusIcon = "radio_button_unchecked";

      if (task.task_status === "In progress") {
        statusColor = "#3b82f6"; // Blue
        statusIcon = "timelapse";
      }
      if (task.task_status === "Done") {
        statusColor = "#22c55e"; // Green
        statusIcon = "check_circle";
      }

      const html = `
                    <div class="dashboard-task-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; margin-bottom: 12px; background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; transition: all 0.2s ease; cursor: default; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" 
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.06)'; this.style.borderColor='#e2e8f0'" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#f1f5f9'">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background-color: ${statusColor}15; display: flex; align-items: center; justify-content: center; color: ${statusColor}; flex-shrink: 0;">
                                <span class="material-symbols-rounded" style="font-size: 22px;">${statusIcon}</span>
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 15px; color: #1e293b; margin-bottom: 3px;">${task.task_name}</div>
                                <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px; font-weight: 500;">
                                    <span class="material-symbols-rounded" style="font-size: 14px; color: #94a3b8;">folder_open</span>
                                    ${task.task_subject || "General"}
                                </div>
                            </div>
                        </div>
                        <span style="font-size: 11px; padding: 6px 12px; border-radius: 20px; background-color: ${statusColor}10; color: ${statusColor}; font-weight: 700; letter-spacing: 0.3px; border: 1px solid ${statusColor}30;">
                            ${task.task_status.toUpperCase()}
                        </span>
                    </div>
                `;
      container.insertAdjacentHTML("beforeend", html);
    });
  } else {
    container.innerHTML = "<p class='empty-state'>No tasks found.</p>";
  }
}

function setupTaskFilters() {
  const filters = {
    All_Tasks: "all",
    In_Progress: "In progress",
    To_do: "To do",
    Done: "Done",
  };

  // Setăm stilul activ implicit pentru All Tasks
  const allBtn = document.getElementById("All_Tasks");
  if (allBtn) {
    allBtn.style.fontWeight = "700";
    allBtn.style.color = "#6366f1";
  }

  for (const [id, status] of Object.entries(filters)) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => {
        // Resetăm stilurile
        Object.keys(filters).forEach((fid) => {
          const el = document.getElementById(fid);
          if (el) {
            el.style.fontWeight = "400";
            el.style.color = "";
          }
        });
        // Setăm stilul activ
        btn.style.fontWeight = "700";
        btn.style.color = "#6366f1";

        renderDashboardTasks(status);
      });
    }
  }
}

// --- 5. Schedule (Today) ---
async function loadSchedule(userId) {
  try {
    const res = await fetch(`${API_BASE}/schedule/user/${userId}`);
    const data = await res.json();
    const container = document.getElementById("dashboard-schedule-list");

    if (!container) return;
    container.innerHTML = "";

    if (data.success && data.schedule.length > 0) {
      // Determinăm ziua curentă
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const today = days[new Date().getDay()];

      // Filtrăm doar evenimentele de azi
      const todaysEvents = data.schedule.filter(
        (item) => item.day_of_week === today
      );

      // Sortăm după oră
      todaysEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (todaysEvents.length > 0) {
        // Afișăm titlul zilei
        container.insertAdjacentHTML(
          "beforeend",
          `<h4 style="margin: 0 0 10px 0; font-size: 14px; color: #6366f1;">Today (${today})</h4>`
        );

        todaysEvents.forEach((item) => {
          // Formatăm ora (scoatem secundele dacă există HH:MM:SS)
          const timeFormatted = item.start_time.substring(0, 5);

          const html = `
                        <div class="schedule-item" style="display: flex; margin-bottom: 10px; padding: 8px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-weight: 700; color: #334155; margin-right: 15px; min-width: 45px;">${timeFormatted}</div>
                            <div>
                                <div style="font-weight: 600; font-size: 14px;">${item.event_name}</div>
                                <div style="font-size: 12px; color: #64748b;">
                                    ${item.location ? `<span style="margin-right:8px;">📍 ${item.location}</span>` : ""}
                                    ${item.teacher_name ? `<span>👤 ${item.teacher_name}</span>` : ""}
                                </div>
                            </div>
                        </div>
                    `;
          container.insertAdjacentHTML("beforeend", html);
        });
      } else {
        container.innerHTML = `<p class='empty-state'>No classes for today (${today}). Relax!</p>`;
      }
    } else {
      container.innerHTML = "<p class='empty-state'>Schedule is empty.</p>";
    }
  } catch (e) {
    console.error("Schedule load error", e);
  }
}
