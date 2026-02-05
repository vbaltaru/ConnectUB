const Friendship = require('../models/Friendship');
const User = require('../models/Users');
const Message = require('../models/Message');
// === IMPORT CRITIC: Avem nevoie de 'Op' (Operators) din Sequelize pentru condiția "SAU" ===
const { Op } = require("sequelize");

const friendController = {
  // =========================================
  // 1. READ: Obține lista de prieteni
  // (Folosită în pagina /friends și în sidebar-ul de chat)
  // =========================================
  async getFriends(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = parseInt(userId);

      // 1. Găsim TOATE conexiunile din tabelul 'friendships' unde apare utilizatorul curent,
      // fie în coloana user1_id, fie în user2_id.
      // Structura este simetrică: (A, B) este același lucru cu (B, A).
      const connections = await Friendship.findAll({
        where: {
          [Op.or]: [
            { user1_id: currentUserId },
            { user2_id: currentUserId }
          ]
        },
        // Includem datele ambilor posibili useri (User1 și User2) definiti în model,
        // pentru a putea determina mai jos cine este "prietenul".
        include: [
            { model: User, as: 'User1', attributes: ['id_user', 'username', 'email'] },
            { model: User, as: 'User2', attributes: ['id_user', 'username', 'email'] }
        ]
      });

      // 2. Procesăm rezultatele pentru a extrage o listă curată doar cu datele prietenilor.
      // Folosim Promise.all pentru a putea face query-uri asincrone (count) în interiorul map-ului
      const friendsList = await Promise.all(connections.map(async connection => {
          let friend;
          // Dacă utilizatorul curent este 'user1' în această relație, atunci prietenul este 'User2'
          if (connection.user1_id === currentUserId) {
              friend = connection.User2;
          } 
          // Altfel, dacă utilizatorul curent este 'user2', prietenul este 'User1'
          else {
              friend = connection.User1;
          }

          if (!friend) return null;

          // Numărăm mesajele necitite trimise de acest prieten în această conversație
          const unreadCount = await Message.count({
              where: { conversation_id: connection.id, sender_id: friend.id_user, is_read: 0 }
          });

          const friendData = friend.toJSON();
          friendData.unreadCount = unreadCount;
          return friendData;
      }));

      // Filtrăm eventualele valori null pentru siguranță (deși nu ar trebui să apară dacă DB e consistentă)
      const cleanList = friendsList.filter(friend => friend !== null);

      res.json({
        success: true,
        friends: cleanList
      });

    } catch (error) {
      console.error("Eroare citire prieteni (model simetric):", error);
      res.status(500).json({ success: false, message: "Eroare server la încărcarea prietenilor." });
    }
  },

  // =========================================
  // 2. GET Conversation ID (Găsește ID-ul prieteniei)
  // (CRITIC PENTRU CHAT: Folosit când dai click pe un prieten să începi conversația)
  // =========================================
  async getConversationId(req, res) {
    try {
        const { userId1, userId2 } = req.params;

        // Căutăm relația unică dintre acești doi utilizatori în tabelul friendships.
        // Trebuie să verificăm ambele combinații posibile.
        const friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { user1_id: userId1, user2_id: userId2 },
                    { user1_id: userId2, user2_id: userId1 }
                ]
            }
        });

        if (!friendship) {
            // Dacă nu există o intrare în friendships, înseamnă că nu sunt prieteni și nu pot vorbi.
            return res.status(404).json({ success: false, message: "Nu sunteți prieteni. Nu puteți iniția un chat." });
        }

        // ID-ul acestei intrări din tabelul friendships ESTE 'conversation_id'-ul
        // pe care îl folosim în tabelul 'messages'.
        res.json({ success: true, conversationId: friendship.id });

    } catch (error) {
        console.error("Eroare obținere conversation ID:", error);
        res.status(500).json({ success: false, message: "Eroare server la inițierea chatului." });
    }
  }

};

module.exports = friendController;