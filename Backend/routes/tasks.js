const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

// GET: Ia sarcinile unui user
router.get("/user/:userId", taskController.getUserTasks);

// POST: Adaugă o sarcină nouă
router.post("/add", taskController.createTask);

// PATCH: Actualizează statusul (folosim :taskId pentru a ști ce sarcină modificăm)
router.patch("/:taskId/status", taskController.updateTaskStatus);

// DELETE: Șterge o sarcină
router.delete("/:taskId", taskController.deleteTask);

module.exports = router;