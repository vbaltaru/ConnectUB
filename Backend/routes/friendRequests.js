const express = require("express");
const router = express.Router();
const friendRequestController = require("../controllers/friendRequestController");

// POST: Trimite o cerere (body: requester_id, recipient_id)
router.post("/send", friendRequestController.sendRequest);

// GET: Vezi cererile primite de un user
router.get("/received/:userId", friendRequestController.getReceivedRequests);

// PATCH: Răspunde la o cerere (URL: ID-ul cererii, BODY: status 'accepted'/'rejected')
router.patch("/respond/:requestId", friendRequestController.respondToRequest);

module.exports = router;