const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Rute existente pentru autentificare
router.post("/register", userController.register);
router.post("/login", userController.login);

// === RUTĂ NOUĂ PENTRU CĂUTARE ===
// GET /api/users/search?query=...&currentUserId=...
router.get("/search", userController.searchUsers);

// === RUTE NOI PENTRU PROFIL ===
// GET: Obține datele profilului (pentru afișare username lângă poză)
router.get("/profile/:userId", userController.getUserProfile);

// PUT: Actualizează profilul
router.put("/profile/:userId", userController.updateUserProfile);

router.put("/change-password/:userId", userController.changePassword);

module.exports = router;