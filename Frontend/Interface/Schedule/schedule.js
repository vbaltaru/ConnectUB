document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ schedule.js loaded! (With Weekend & Delete)");

  const storedUser = localStorage.getItem("user");
  if (!storedUser) {
    window.location.href = "/login";
    return;
  }
  const userObj = JSON.parse(storedUser);
  const userId = userObj.id_user;

  const scheduleGrid = document.querySelector(".schedule-grid");
  const modal = document.getElementById("addEventModal");
  const openModalBtn = document.querySelector(".btn-add-event");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const modalForm = document.getElementById("modalEventForm");

  // --- LOGICĂ MODAL (Neschimbată) ---
  function openModal() {
    modal.classList.add("show");
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, "0");
    const defaultTime =
      now.getHours() >= 7 && now.getHours() <= 19 ? `${hour}:00` : "08:00";
    document.getElementById("eventTime").value = defaultTime;
    document.getElementById("eventName").focus();
  }
  function closeModal() {
    modal.classList.remove("show");
    modalForm.reset();
  }
  if (openModalBtn) openModalBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (modal)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

  // --- LOGICĂ ADĂUGARE (Neschimbată) ---
  if (modalForm) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const eventData = {
        user_id: userId,
        event_name: document.getElementById("eventName").value,
        day_of_week: document.getElementById("eventDay").value,
        start_time: document.getElementById("eventTime").value,
        teacher_name: document.getElementById("teacherName").value || null,
        location: document.getElementById("eventLocation").value || null,
      };
      try {
        const res = await fetch("/api/schedule/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        const data = await res.json();
        if (data.success) {
          closeModal();
          fetchSchedule();
        } else {
          alert("Error: " + data.message);
        }
      } catch (error) {
        console.error("Error adding event:", error);
        alert("Server error.");
      }
    });
  }

  // ============================================================
  // === LOGICĂ NOUĂ: ȘTERGERE EVENIMENT (Event Delegation) ===
  // ============================================================
  // Ascultăm click-uri pe toată grila
  if (scheduleGrid) {
    scheduleGrid.addEventListener("click", async (e) => {
      // Verificăm dacă s-a dat click pe un buton de delete (sau iconița din el)
      const deleteBtn = e.target.closest(".btn-delete-event");
      if (!deleteBtn) return; // Dacă nu e buton de delete, ignorăm

      const eventId = deleteBtn.dataset.id; // Luăm ID-ul evenimentului

      if (confirm("Are you sure you want to delete this class?")) {
        try {
          const res = await fetch(`/api/schedule/${eventId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            fetchSchedule(); // Reîncărcăm grila după ștergere
          } else {
            alert("Error deleting: " + data.message);
          }
        } catch (error) {
          console.error("Error deleting event:", error);
          alert("Server error.");
        }
      }
    });
  }

  // --- FUNCȚII ÎNCĂRCARE ȘI POPULARE GRILĂ ---
  async function fetchSchedule() {
    try {
      document
        .querySelectorAll(".grid-cell")
        .forEach((cell) => (cell.innerHTML = "")); // Curățăm
      const res = await fetch(`/api/schedule/user/${userId}`);
      const data = await res.json();
      if (data.success) {
        populateGrid(data.schedule);
      } else {
        console.error("Server error:", data.message);
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  }

  function populateGrid(scheduleItems) {
    if (scheduleItems.length === 0) return;
    scheduleItems.forEach((item) => {
      // Parsăm ora și minutele pentru a găsi celula corectă și a calcula poziția
      const [hourStr, minuteStr] = item.start_time.split(":");
      const hour = parseInt(hourStr);
      const minutes = parseInt(minuteStr);

      const dayKey = item.day_of_week;
      // Construim selectorul pentru ora fixă (ex: "09:00:00") așa cum e în HTML
      const cellTime = `${String(hour).padStart(2, "0")}:00:00`;

      const targetCell = document.querySelector(
        `.grid-cell[data-day="${dayKey}"][data-time="${cellTime}"]`
      );

      if (targetCell) {
        const formattedTime = item.start_time.substring(0, 5);

        // Creăm elementul vizual
        const eventDiv = document.createElement("div");
        eventDiv.className = "event-card";

        // Stiluri inline pentru aspect modern
        eventDiv.style.backgroundColor = "#e0e7ff";
        eventDiv.style.color = "#4338ca";
        eventDiv.style.padding = "8px";
        eventDiv.style.borderRadius = "8px";
        eventDiv.style.borderLeft = "4px solid #6366f1";
        eventDiv.style.marginBottom = "5px";
        eventDiv.style.position = "relative";
        eventDiv.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
        eventDiv.style.transition = "transform 0.2s";

        // Adăugăm efect de hover
        eventDiv.onmouseover = () =>
          (eventDiv.style.transform = "translateY(-2px)");
        eventDiv.onmouseout = () =>
          (eventDiv.style.transform = "translateY(0)");

        // Dacă cursul începe la și jumătate (ex: 13:30), îl împingem mai jos
        if (minutes > 0 && targetCell.children.length === 0) {
          const topOffset = (minutes / 60) * 100;
          eventDiv.style.marginTop = `${topOffset}%`;
        }

        eventDiv.innerHTML = `
            <button class="btn-delete-event" data-id="${item.id}" title="Delete Class" style="position: absolute; top: 4px; right: 4px; background: none; border: none; cursor: pointer; color: #ef4444; padding: 2px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
            </button>
            <div class="event-title" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; padding-right: 20px;">${item.event_name}</div>
            <div class="event-detail" style="font-size: 0.75rem; display: flex; align-items: center; gap: 4px; opacity: 0.9;"><span class="material-symbols-rounded" style="font-size: 14px;">schedule</span> ${formattedTime}</div>
            ${item.teacher_name ? `<div class="event-detail" style="font-size: 0.75rem; display: flex; align-items: center; gap: 4px; opacity: 0.9;"><span class="material-symbols-rounded" style="font-size: 14px;">person</span> ${item.teacher_name}</div>` : ""}
            ${item.location ? `<div class="event-detail" style="font-size: 0.75rem; display: flex; align-items: center; gap: 4px; opacity: 0.9;"><span class="material-symbols-rounded" style="font-size: 14px;">location_on</span> ${item.location}</div>` : ""}
        `;

        targetCell.appendChild(eventDiv);
      }
    });
  }

  fetchSchedule();
});
