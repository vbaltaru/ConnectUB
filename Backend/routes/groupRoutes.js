const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

// Ruta pentru crearea unui grup
router.post("/create", groupController.createGroup);

// Ruta pentru a obține lista de grupuri a unui user
router.get("/list/:userId", groupController.getUserGroups);

// Ruta pentru istoricul mesajelor dintr-un grup
router.get("/messages/:groupId", groupController.getGroupMessages);

// Ruta pentru ștergerea unui grup
router.delete("/delete/:groupId", groupController.deleteGroup);

// Ruta pentru a obține membrii unui grup
router.get("/members/:groupId", groupController.getGroupMembers);

// Ruta pentru a părăsi un grup
router.post("/leave", groupController.leaveGroup);

// Ruta pentru actualizarea pozei de grup
router.post("/update-image", groupController.updateGroupImage);

// Ruta pentru a da kick unui membru
router.post("/kick", groupController.kickMember);

module.exports = router;
