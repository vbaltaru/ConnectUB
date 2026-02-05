/**
 * 🎯 AUTHENTICATION CONTROLLER
 * Handles user registration, login, logout, and token verification
 * @module controllers/authController
 */

const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

// JWT secret key for token signing (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_key_2024";

/**
 * 🔐 VALIDATE PASSWORD STRENGTH
 * Ensures passwords meet security requirements
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid flag and error messages
 */
function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}


/**
 * 🚀 AUTHENTICATION CONTROLLER OBJECT
 * Contains all authentication-related business logic
 */
const authController = {
  /**
   * 📝 USER REGISTRATION
   * Creates a new user account with validation and profile picture handling
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      // 1. EXTRACT DATA FROM REQUEST BODY
      const {
        username,
        email,
        password,
        first_name,
        last_name,
        study_year,
        specialization,
        gender,
      } = req.body;

      // 2. VALIDATE REQUIRED FIELDS
      const requiredFields = [
        "username",
        "email",
        "password",
        "first_name",
        "last_name",
        "study_year",
        "specialization",
      ];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      // 3. VALIDATE PASSWORD STRENGTH
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors,
        });
      }

      // 4. CHECK FOR EXISTING EMAIL (Prevent duplicate accounts)
      const existingUser = await User.findOne({
        where: { email },
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "This email is already registered",
        });
      }

      // 5. CHECK FOR EXISTING USERNAME (Ensure unique usernames)
      const existingUsername = await User.findOne({
        where: { username },
      });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: "This username is already taken",
        });
      }

      // 6. VALIDATE STUDY YEAR (Must be between 1-6)
      if (study_year < 1 || study_year > 6) {
        return res.status(400).json({
          success: false,
          message: "Study year must be between 1 and 6",
        });
      }

      // 8. HASH PASSWORD (Never store plain text passwords)
      const password_hash = await bcrypt.hash(password, 12);

      
      let profile_picture_url = "default_avatar.png"; /

      if (req.files && req.files.profile_picture) {
        const profilePicture = req.files.profile_picture;
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];

        if (!allowedTypes.includes(profilePicture.mimetype)) {
          return res.status(400).json({
            success: false,
            message: "Invalid image format. Use JPEG, PNG, or WEBP",
          });
        }

        if (profilePicture.size > 5 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: "Image is too large. Maximum 5MB",
          });
        }

        // Generate unique filename and save file
        const fileExtension = path.extname(profilePicture.name) || ".jpg";
        const fileName = `profile_${username}_${Date.now()}${fileExtension}`;
        const uploadPath = path.join(
          __dirname,
          "../uploads/profiles",
          fileName
        );
        const uploadDir = path.join(__dirname, "../uploads/profiles");

        // Create upload directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Move uploaded file to destination
        await profilePicture.mv(uploadPath);
        profile_picture_url = `/uploads/profiles/${fileName}`;
      }

      // 10. CREATE USER IN DATABASE
      const newUser = await User.create({
        username,
        email,
        password_hash: password_hash,
        first_name,
        last_name,
        study_year: parseInt(study_year),
        specialization,
        gender: gender || "prefer not to say",
        profile_picture_url,
      });

      // 11. SUCCESS RESPONSE (Exclude sensitive data)
      res.status(201).json({
        success: true,
        message: "Account created successfully!",
        user: {
          id_user: newUser.id_user,
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          profile_picture_url: newUser.profile_picture_url,
          study_year: newUser.study_year,
          specialization: newUser.specialization,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      // Handle Sequelize validation errors
      if (error.name === "SequelizeValidationError") {
        const errors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: "Invalid data",
          errors,
        });
      }

      // Generic server error
      res.status(500).json({
        success: false,
        message: "Internal server error. Please try again.",
      });
    }
  },

  /**
   * 🔑 USER LOGIN
   * Authenticates user and returns JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      // 1. EXTRACT CREDENTIALS FROM REQUEST
      const { email, password } = req.body;

      // 2. VALIDATE INPUT
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // 3. FIND USER BY EMAIL
      const user = await User.findOne({ where: { email } });

      // 4. USER EXISTENCE CHECK (Security: generic error message)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // 5. VERIFY PASSWORD (Compare with stored hash)
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // 6. CHECK ACCOUNT STATUS
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Your account is deactivated. Please contact administrator.",
        });
      }

      // 7. GENERATE JWT TOKEN (Digital fingerprint)
      const token = jwt.sign(
        {
          userId: user.id_user,
          email: user.email,
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // 8. SUCCESS RESPONSE WITH TOKEN
      res.json({
        success: true,
        message: "Login successful!",
        token,
        user: {
          id_user: user.id_user,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture_url: user.profile_picture_url,
          study_year: user.study_year,
          specialization: user.specialization,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during authentication",
      });
    }
  },

  /**
   * 🚪 USER LOGOUT
   * Handles user logout (primarily a frontend operation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // Extract token from Authorization header
      const token = req.header("Authorization")?.replace("Bearer ", "");

      // If no token provided, consider logout successful
      if (!token) {
        return res.json({
          success: true,
          message: "Logout successful",
        });
      }

      // Success response
      res.json({
        success: true,
        message: "Logout successful.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({
        success: true,
        message: "Logout successful",
      });
    }
  },

  /**
   * ✅ TOKEN VERIFICATION
   * Validates JWT token and returns user data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyToken(req, res) {
    try {
      // 1. EXTRACT TOKEN FROM HEADER
      const token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token missing. Please authenticate.",
        });
      }

      // 2. VERIFY TOKEN SIGNATURE AND EXPIRATION
      const decoded = jwt.verify(token, JWT_SECRET);

      // 3. FIND USER IN DATABASE
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ["password_hash"] },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token. User does not exist.",
        });
      }

      // 4. CHECK ACCOUNT STATUS
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated.",
        });
      }

      // 5. SUCCESS RESPONSE WITH USER DATA
      res.json({
        success: true,
        user: {
          id_user: user.id_user,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture_url: user.profile_picture_url,
          study_year: user.study_year,
          specialization: user.specialization,
          gender: user.gender,
          is_active: user.is_active,
          is_email_verified: user.is_email_verified,
        },
      });
    } catch (error) {
      console.error("Token verification error:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token.",
        });
      }

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error during token verification.",
      });
    }
  },

  /**
   * 🔍 CHECK EMAIL AVAILABILITY
   * Checks if an email is already registered
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Check if email exists
      const existingUser = await User.findOne({
        where: { email },
      });

      res.json({
        success: true,
        exists: !!existingUser,
        message: existingUser
          ? "Email is already registered"
          : "Email is available",
      });
    } catch (error) {
      console.error("Check email error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during email check",
      });
    }
  },

  /**
   * 🔍 CHECK USERNAME AVAILABILITY
   * Checks if a username is already taken
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkUsername(req, res) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "Username is required",
        });
      }

      // Check if username exists
      const existingUser = await User.findOne({
        where: { username },
      });

      res.json({
        success: true,
        exists: !!existingUser,
        message: existingUser
          ? "Username is already taken"
          : "Username is available",
      });
    } catch (error) {
      console.error("Check username error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during username check",
      });
    }
  },
};

module.exports = authController;
