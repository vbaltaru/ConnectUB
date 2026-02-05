const express = require("express");
const router = express.Router();
// Importăm controllerul care conține logica pentru prieteni
const friendController = require("../controllers/friendController");

// Exemplu de apel URL: http://localhost:3000/api/friends/list/22
router.get("/list/:userId", friendController.getFriends);


router.get("/conversation/:userId1/:userId2", friendController.getConversationId);


module.exports = router;