const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./Users");

const FriendRequest = db.define("FriendRequest", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  requester_id: { type: DataTypes.INTEGER, allowNull: false },
  recipient_id: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'blocked'),
    defaultValue: 'pending'
  },
  responded_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: "friend_requests",
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // Dezactivăm updated_at pentru că folosim responded_at manual
});

FriendRequest.belongsTo(User, { as: 'Requester', foreignKey: 'requester_id' });
FriendRequest.belongsTo(User, { as: 'Recipient', foreignKey: 'recipient_id' });

module.exports = FriendRequest;