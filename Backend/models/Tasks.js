const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./Users");

const Task = db.define("Task", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  task_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  task_status: {
    type: DataTypes.ENUM('To do', 'In progress', 'Done'),
    defaultValue: 'To do',
    allowNull: false,
  },
  task_subject: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
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
  tableName: "tasks",
  // === MODIFICARE CRITICĂ ===
  // Setăm false pentru că tabelul tău nu are createdAt/updatedAt.
  timestamps: false, 
  // ==========================
});

User.hasMany(Task, { foreignKey: 'user_id' });
Task.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Task;