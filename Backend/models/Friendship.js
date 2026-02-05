const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./Users");

const Friendship = db.define("Friendship", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user1_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id_user' }
  },
  user2_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id_user' }
  }
}, {
  tableName: "friendships",
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // CRITIC: Tabela ta nu are coloana updated_at
});

Friendship.belongsTo(User, { as: 'User1', foreignKey: 'user1_id' });
Friendship.belongsTo(User, { as: 'User2', foreignKey: 'user2_id' });

module.exports = Friendship;