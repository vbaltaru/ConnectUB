const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./Users");

const GroupMessage = sequelize.define(
  "GroupMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message_type: {
      type: DataTypes.ENUM("text", "image", "file"),
      defaultValue: "text",
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "group_messages",
    timestamps: false,
  }
);

// Definim relația direct în model
GroupMessage.belongsTo(User, { foreignKey: "sender_id", as: "Sender" });

module.exports = GroupMessage;
