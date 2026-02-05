const Task = require('../models/Tasks');

const taskController = {
  // =========================================
  // CREATE: Adaugă o sarcină nouă
  // =========================================
  async createTask(req, res) {
    try {
      const { task_name, task_subject, due_date, user_id } = req.body;

      if (!task_name || !user_id) {
        return res.status(400).json({ 
          success: false, 
          message: "Date incomplete." 
        });
      }

      const newTask = await Task.create({
        task_name,
        task_subject: task_subject || 'General',
        due_date: due_date || null,
        user_id,
        task_status: 'To do'
      });

      res.status(201).json({
        success: true,
        message: "Sarcină adăugată cu succes!",
        task: newTask
      });

    } catch (error) {
      console.error("Eroare creare task:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // READ: Obține toate sarcinile unui utilizator
  // =========================================
  async getUserTasks(req, res) {
    try {
      const { userId } = req.params;

      const tasks = await Task.findAll({
        where: { user_id: userId },
        order: [['id', 'DESC']] 
      });

      res.json({
        success: true,
        tasks: tasks
      });

    } catch (error) {
      console.error("Eroare citire tasks:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // UPDATE (PATCH): Schimbă statusul unei sarcini
  // =========================================
  async updateTaskStatus(req, res) {
    try {
        const { taskId } = req.params; // Luăm ID-ul din URL
        const { status } = req.body; // Luăm noul status din datele trimise

        // Validăm statusul
        const validStatuses = ['To do', 'In progress', 'Done'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Status invalid." });
        }

        // Căutăm sarcina după ID
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: "Sarcina nu a fost găsită." });
        }

        // Actualizăm și salvăm
        task.task_status = status;
        await task.save();

        res.json({ success: true, message: "Status actualizat!", task: task });

    } catch (error) {
        console.error("Eroare actualizare status:", error);
        res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // DELETE: Șterge o sarcină
  // =========================================
  async deleteTask(req, res) {
    try {
        const { taskId } = req.params; // Luăm ID-ul din URL

        // Căutăm sarcina
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: "Sarcina nu a fost găsită." });
        }

        // O distrugem (ștergem din DB)
        await task.destroy();

        res.json({ success: true, message: "Sarcină ștearsă cu succes." });

    } catch (error) {
        console.error("Eroare ștergere task:", error);
        res.status(500).json({ success: false, message: "Eroare server." });
    }
  }

};

module.exports = taskController;