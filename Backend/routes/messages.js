const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

router.get("/history/:conversationId", messageController.getHistory);
router.post("/upload", messageController.uploadMessageFile);
router.post("/attachment", messageController.uploadAttachment);

module.exports = router;