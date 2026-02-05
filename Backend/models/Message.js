const { DataTypes } = require("sequelize");
const db = require("../config/database");
const User = require("./Users");
// IMPORTANT: Dacă ai probleme la pornire, importă Friendship doar în interiorul asocierilor sau după definire
const Friendship = require("./Friendship"); 

const Message = db.define("Message", {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  conversation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'friendships', // ASIGURĂ-TE CĂ ACESTA ESTE NUMELE TABELULUI DIN DB
      key: 'id'
    }
  },
  sender_id: {
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: { 
      model: User, 
      key: 'id_user' 
    }
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'file'),
    defaultValue: 'text', 
    allowNull: false
  },
  message_text: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  file_name: { 
    type: DataTypes.STRING(255), 
    allowNull: true 
  },
  file_url: { 
    type: DataTypes.STRING(500), 
    allowNull: true 
  },
  file_size: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  is_read: { 
    type: DataTypes.BOOLEAN, // TINYINT(1) în SQL este echivalent cu BOOLEAN în Sequelize
    defaultValue: false 
  }
}, {
  tableName: "messages",
  timestamps: true, 
  createdAt: 'created_at', 
  updatedAt: false
});

// === ASOCIERI ===
// Această asocieri permit folosirea lui "include" în controller pentru a aduce numele expeditorului
Message.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id' });
Message.belongsTo(Friendship, { as: 'Conversation', foreignKey: 'conversation_id' });

module.exports = Message;