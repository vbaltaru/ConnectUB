const FriendRequest = require("../models/FriendRequest");
const Friendship = require("../models/Friendship");
const User = require("../models/Users");
const { Op } = require("sequelize");

const friendRequestController = {
  // =========================================
  // 1. SEND: Trimite o cerere de prietenie
  // =========================================
  async sendRequest(req, res) {
    try {
      const { requester_id, recipient_id } = req.body;

      // Validare: Nu poți să-ți trimiți cerere ție însuți
      if (parseInt(requester_id) === parseInt(recipient_id)) {
        return res.status(400).json({
          success: false,
          message: "Nu îți poți trimite cerere de prietenie singur.",
        });
      }

      // Verificăm dacă sunt deja prieteni în tabelul friendships
      const alreadyFriends = await Friendship.findOne({
        where: {
          [Op.or]: [
            { user1_id: requester_id, user2_id: recipient_id },
            { user1_id: recipient_id, user2_id: requester_id },
          ],
        },
      });

      if (alreadyFriends) {
        return res.status(400).json({
          success: false,
          message: "Sunteți deja prieteni.",
        });
      }

      // Verificăm dacă există deja o cerere PENDING între acești doi
      const existingRequest = await FriendRequest.findOne({
        where: {
          [Op.or]: [
            {
              requester_id: requester_id,
              recipient_id: recipient_id,
              status: "pending",
            },
            {
              requester_id: recipient_id,
              recipient_id: requester_id,
              status: "pending",
            },
          ],
        },
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "Există deja o cerere de prietenie în așteptare între voi.",
        });
      }

      // Creăm cererea în tabelul friend_requests
      await FriendRequest.create({
        requester_id,
        recipient_id,
        status: "pending",
      });

      res.status(201).json({
        success: true,
        message: "Cerere de prietenie trimisă cu succes!",
      });
    } catch (error) {
      console.error("Error in sendRequest:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Eroare server la trimiterea cererii.",
        });
    }
  },

  // =========================================
  // 2. READ: Vezi cererile primite (PENDING)
  // =========================================
  async getReceivedRequests(req, res) {
    try {
      const { userId } = req.params;

      const requests = await FriendRequest.findAll({
        where: {
          recipient_id: userId,
          status: "pending",
        },
        include: [
          {
            model: User,
            as: "Requester", // Alias definit în modelul FriendRequest
            attributes: ["id_user", "username", "email"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      res.json({
        success: true,
        requests: requests,
      });
    } catch (error) {
      console.error("Error in getReceivedRequests:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Eroare server la încărcarea cererilor.",
        });
    }
  },

  // =========================================
  // 3. UPDATE: Răspunde la cerere (Accept/Reject)
  // =========================================
  async respondToRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { status } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Status invalid." });
      }

      const request = await FriendRequest.findByPk(requestId);

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Cererea nu a fost găsită." });
      }

      // 1. Actualizăm cererea
      request.status = status;
      request.responded_at = new Date();
      await request.save();

      // 2. Dacă este ACCEPTED, creăm relația de prietenie
      if (status === "accepted") {
        try {
          await Friendship.create({
            user1_id: request.requester_id,
            user2_id: request.recipient_id,
          });
        } catch (friendshipError) {
          console.error(
            "❌ Eroare la crearea prieteniei în tabelul friendships:",
            friendshipError
          );
          return res
            .status(500)
            .json({
              success: false,
              message:
                "Cererea a fost acceptată, dar eroarea a apărut la salvarea prieteniei.",
            });
        }
      }

      res.json({
        success: true,
        message: `Cerere de prietenie ${
          status === "accepted" ? "acceptată" : "respinsă"
        }.`,
      });
    } catch (error) {
      console.error("❌ Eroare generală respondToRequest:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Eroare server la procesarea cererii.",
        });
    }
  },
};

module.exports = friendRequestController;
