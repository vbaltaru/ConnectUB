const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/Users");
const path = require("path");
const fs = require("fs");

const groupController = {
  // 1. Creare grup
  async createGroup(req, res) {
    try {
      const { groupName, memberIds, creatorId } = req.body;

      if (!groupName || !creatorId) {
        return res.status(400).json({
          success: false,
          message: "Numele grupului este obligatoriu.",
        });
      }

      // Creăm grupul
      const newGroup = await Group.create({
        name: groupName,
        owner_id: creatorId,
        created_at: new Date(),
      });

      // Pregătim membrii (creatorul + prietenii selectați)
      // Folosim Set pentru a evita duplicatele
      const uniqueMembers = new Set([
        parseInt(creatorId),
        ...memberIds.map((id) => parseInt(id)),
      ]);

      const membersToAdd = Array.from(uniqueMembers).map((userId) => ({
        group_id: newGroup.id,
        user_id: userId,
        role: userId == creatorId ? "admin" : "member",
        joined_at: new Date(),
      }));

      await GroupMember.bulkCreate(membersToAdd);

      res.json({
        success: true,
        group: newGroup,
        message: "Grup creat cu succes!",
      });
    } catch (error) {
      console.error("Eroare creare grup:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 2. Listare grupuri utilizator
  async getUserGroups(req, res) {
    try {
      const { userId } = req.params;

      // Găsim toate grupurile unde user-ul este membru
      const memberships = await GroupMember.findAll({
        where: { user_id: userId },
      });

      if (!memberships.length) {
        return res.json({ success: true, groups: [] });
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Extragem detaliile grupurilor
      const groups = await Group.findAll({
        where: { id: groupIds },
      });

      res.json({ success: true, groups });
    } catch (error) {
      console.error("Eroare grupuri user:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 3. Istoric mesaje grup
  async getGroupMessages(req, res) {
    try {
      const { groupId } = req.params;
      const messages = await GroupMessage.findAll({
        where: { group_id: groupId },
        include: [
          { model: User, as: "Sender", attributes: ["id_user", "username"] },
        ],
        order: [["created_at", "ASC"]],
      });
      res.json({ success: true, messages });
    } catch (error) {
      console.error("Eroare mesaje grup:", error);
      res.status(500).json({ success: false });
    }
  },

  // 4. Ștergere grup (Doar proprietarul)
  async deleteGroup(req, res) {
    try {
      const { groupId } = req.params;
      const { userId } = req.body; // Trimitem ID-ul userului curent pentru verificare

      const group = await Group.findByPk(groupId);

      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Grupul nu a fost găsit." });
      }

      // Verificăm dacă userul este proprietarul
      if (group.owner_id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: "Nu ai permisiunea de a șterge acest grup.",
        });
      }

      // Ștergem datele asociate (membri și mesaje) manual pentru a evita erori de Foreign Key
      await GroupMember.destroy({ where: { group_id: groupId } });
      await GroupMessage.destroy({ where: { group_id: groupId } });
      await group.destroy();

      res.json({ success: true, message: "Grup șters cu succes." });
    } catch (error) {
      console.error("Eroare ștergere grup:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 5. Obține membrii unui grup
  async getGroupMembers(req, res) {
    try {
      const { groupId } = req.params;

      const members = await GroupMember.findAll({
        where: { group_id: groupId },
        include: [
          {
            model: User,
            attributes: ["id_user", "username", "profile_picture_url"],
          },
        ],
      });

      res.json({ success: true, members });
    } catch (error) {
      console.error("Eroare obținere membri grup:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 6. Părăsire grup (Membri obișnuiți)
  async leaveGroup(req, res) {
    try {
      const { groupId, userId } = req.body;

      const member = await GroupMember.findOne({
        where: { group_id: groupId, user_id: userId },
      });

      if (!member) {
        return res.status(404).json({ success: false, message: "Nu ești membru al acestui grup." });
      }

      if (member.role === "admin") {
        return res.status(400).json({
          success: false,
          message: "Administratorul nu poate părăsi grupul. Șterge grupul dacă dorești.",
        });
      }

      await member.destroy();

      res.json({ success: true, message: "Ai părăsit grupul." });
    } catch (error) {
      console.error("Eroare părăsire grup:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 7. Actualizare poză grup
  async updateGroupImage(req, res) {
    try {
      const { groupId, userId } = req.body;

      if (!req.files || !req.files.groupImage) {
        return res.status(400).json({ success: false, message: "Nicio imagine încărcată." });
      }

      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(404).json({ success: false, message: "Grupul nu a fost găsit." });
      }

      // Verificăm dacă userul este proprietarul (sau admin, în funcție de logică)
      if (group.owner_id !== parseInt(userId)) {
        return res.status(403).json({ success: false, message: "Doar proprietarul poate schimba poza." });
      }

      const imageFile = req.files.groupImage;
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

      if (!allowedTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({ success: false, message: "Format invalid. Folosește JPG, PNG sau WEBP." });
      }

      // Generăm nume unic
      const fileExtension = path.extname(imageFile.name);
      const fileName = `group_${groupId}_${Date.now()}${fileExtension}`;
      const uploadPath = path.join(__dirname, "../uploads/groups", fileName);
      
      // Asigurăm existența folderului
      const uploadDir = path.join(__dirname, "../uploads/groups");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      await imageFile.mv(uploadPath);
      
      group.profile_picture_url = `/uploads/groups/${fileName}`;
      await group.save();

      res.json({ success: true, imageUrl: group.profile_picture_url, message: "Poză actualizată!" });
    } catch (error) {
      console.error("Eroare upload poză grup:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  },

  // 8. Kick Member (Doar Admin) + Auto-Delete dacă rămâne doar 1 membru
  async kickMember(req, res) {
    try {
      const { groupId, adminId, memberIdToKick } = req.body;

      const group = await Group.findByPk(groupId);
      if (!group) return res.status(404).json({ success: false, message: "Grupul nu există." });

      // Verificăm dacă cel care face cererea este admin/owner
      if (group.owner_id !== parseInt(adminId)) {
        return res.status(403).json({ success: false, message: "Nu ai permisiunea de a elimina membri." });
      }

      // Găsim membrul de eliminat
      const member = await GroupMember.findOne({
        where: { group_id: groupId, user_id: memberIdToKick }
      });

      if (!member) {
        return res.status(404).json({ success: false, message: "Utilizatorul nu este în grup." });
      }

      // Ștergem membrul
      await member.destroy();

      // --- LOGICĂ AUTO-DELETE ---
      // Numărăm câți membri au mai rămas
      const remainingCount = await GroupMember.count({ where: { group_id: groupId } });

      // Dacă a rămas 1 sau mai puțini (doar adminul), ștergem grupul
      if (remainingCount <= 1) {
        await GroupMember.destroy({ where: { group_id: groupId } });
        await GroupMessage.destroy({ where: { group_id: groupId } });
        await group.destroy();
        
        return res.json({ success: true, groupDeleted: true, message: "Membrul a fost eliminat. Grupul a fost șters automat deoarece a rămas un singur membru." });
      }

      res.json({ success: true, groupDeleted: false, message: "Membrul a fost eliminat din grup." });

    } catch (error) {
      console.error("Eroare kick member:", error);
      res.status(500).json({ success: false, message: "Eroare server." });
    }
  }
};

module.exports = groupController;
