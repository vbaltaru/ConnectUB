const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");

// GET: Ia orarul
router.get("/user/:userId", scheduleController.getUserSchedule);

// POST: Adaugă
router.post("/add", scheduleController.createScheduleItem);

// --- RUTĂ NOUĂ ---
// DELETE: Șterge un element după ID (ex: /api/schedule/15)
router.delete("/:itemId", scheduleController.deleteScheduleItem);

module.exports = router;