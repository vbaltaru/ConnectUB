const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./Users");

const ScheduleItem = db.define("ScheduleItem", {
  // Structura EXACTĂ din baza ta de date
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  day_of_week: {
    type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    allowNull: false,
  },
  start_time: {
    type: DataTypes.TIME, // Format HH:MM:SS (ex: '08:00:00')
    allowNull: false,
  },
  event_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  teacher_name: {
    type: DataTypes.STRING(100),
    allowNull: true, // Poate fi gol
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true, // Poate fi gol
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id_user'
    }
  }
}, {
  // IMPORTANT: Numele tabelului din MySQL (am presupus 'schedule' sau 'schedule_items'. Ajustează dacă e diferit)
  tableName: "schedule", 
  
  // === CRITIC PENTRU STRUCTURA TA ===
  timestamps: false, // Nu ai createdAt/updatedAt
  // =================================
});

// Definim relațiile
User.hasMany(ScheduleItem, { foreignKey: 'user_id' });
ScheduleItem.belongsTo(User, { foreignKey: 'user_id' });

module.exports = ScheduleItem;