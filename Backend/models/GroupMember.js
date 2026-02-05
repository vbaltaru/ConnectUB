const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./Users");

const GroupMember = sequelize.define(
  "GroupMember",
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("member", "admin"),
      defaultValue: "member",
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "group_members",
    timestamps: false,
  }
);

// Definim relația direct în model
GroupMember.belongsTo(User, { foreignKey: "user_id" });

module.exports = GroupMember;
