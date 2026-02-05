const User = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// === IMPORT NOU CRITIC PENTRU CĂUTARE ===
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const userController = {
  // =========================================
  // REGISTER
  // =========================================
  async register(req, res) {
    try {
      const { username, email, password, security_question, security_answer } =
        req.body;

      // Validări de bază
      if (
        !username ||
        !email ||
        !password ||
        !security_question ||
        !security_answer
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Toate câmpurile sunt obligatorii.",
          });
      }

      // Verificăm dacă userul există deja
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: "Emailul este deja folosit." });
      }

      // Hash la parolă și la răspunsul de securitate
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const hashedAnswer = await bcrypt.hash(
        security_answer.toLowerCase(),
        saltRounds
      );

      // Creăm userul
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        security_question,
        security_answer: hashedAnswer,
      });

      res.status(201).json({
        success: true,
        message: "Cont creat cu succes!",
        user: {
          id: newUser.id_user,
          username: newUser.username,
          email: newUser.email,
        },
      });
    } catch (error) {
      console.error("Eroare la înregistrare:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // LOGIN
  // =========================================
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validare
      if (!username || !password) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Username și parola sunt obligatorii.",
          });
      }

      // Căutăm userul
      const user = await User.findOne({ where: { username } });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Username sau parolă incorectă." });
      }

      // Verificăm parola
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Username sau parolă incorectă." });
      }

      // Generăm token (opțional, pentru sesiuni viitoare)
      const token = jwt.sign(
        { id: user.id_user, email: user.email },
        "SECRET_KEY_TEMPORARA", // În producție folosește process.env.JWT_SECRET
        { expiresIn: "1h" }
      );

      // Răspuns de succes
      res.json({
        success: true,
        message: "Autentificare reușită!",
        token,
        user: {
          id_user: user.id_user,
          username: user.username,
          email: user.email,
          // profile_picture va fi null momentan
          profile_picture: user.profile_picture,
        },
      });
    } catch (error) {
      console.error("Eroare la login:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // NOU: Căutare utilizatori după nume
  // =========================================
  async searchUsers(req, res) {
    try {
      const { query, currentUserId } = req.query;

      if (!query || query.trim() === "") {
        return res.json({ success: true, users: [] });
      }

      const users = await User.findAll({
        attributes: ["id_user", "username", "email"],
        where: {
          username: {
            [Op.like]: `%${query}%`,
          },
          id_user: {
            [Op.ne]: currentUserId, // Excludem utilizatorul logat
          },
        },
        limit: 10,
      });

      res.json({ success: true, users: users });
    } catch (error) {
      console.error("DETALII EROARE 500:", error); // Verifică terminalul pentru acest mesaj
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // =========================================
  // GET PROFILE: Obține datele profilului (inclusiv username)
  // =========================================
  async getUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password_hash", "security_answer"] },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Utilizatorul nu a fost găsit." });
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Eroare getUserProfile:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // UPDATE PROFILE: Actualizează datele și poza
  // =========================================
  async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const { first_name, last_name, study_year, specialization } = req.body;

      const user = await User.findByPk(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      // Actualizare câmpuri text
      if (first_name) user.first_name = first_name;
      if (last_name) user.last_name = last_name;
      if (study_year) user.study_year = study_year;
      if (specialization) user.specialization = specialization;

      // Actualizare poză profil
      if (req.files && req.files.profile_picture) {
        const file = req.files.profile_picture;
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.mimetype)) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Format invalid (JPG, PNG, WEBP).",
            });
        }

        const fileExtension = path.extname(file.name);
        const fileName = `profile_${user.username}_${Date.now()}${fileExtension}`;
        const uploadPath = path.join(
          __dirname,
          "../uploads/profiles",
          fileName
        );

        // Asigurare folder
        const uploadDir = path.join(__dirname, "../uploads/profiles");
        if (!fs.existsSync(uploadDir))
          fs.mkdirSync(uploadDir, { recursive: true });

        await file.mv(uploadPath);
        user.profile_picture_url = `/uploads/profiles/${fileName}`;
      }

      await user.save();
      res.json({ success: true, message: "Profil actualizat!", user });
    } catch (error) {
      console.error("Eroare updateUserProfile:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // =========================================
  // CHANGE PASSWORD
  // =========================================
  async changePassword(req, res) {
    // Implementare simplificată pentru a evita erorile 404 din frontend
    // (Poți adăuga logica completă de verificare hash aici dacă dorești)
    res.json({ success: false, message: "Funcționalitate în lucru." });
  },
};

module.exports = userController;
