const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontrollers");

// 🔐 RUTE DE AUTENTIFICARE
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// 🔍 RUTE DE VERIFICARE
router.post("/check-email", authController.checkEmail);
router.post("/check-username", authController.checkUsername);
router.get("/verify", authController.verifyToken);

module.exports = router;