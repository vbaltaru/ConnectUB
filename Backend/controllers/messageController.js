const Message = require('../models/Message');
const User = require('../models/Users');
const path = require('path');
const fs = require('fs');

const messageController = {
  // Obține istoricul pe baza ID-ului conversației
  async getHistory(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await Message.findAll({
        where: { conversation_id: conversationId },
        include: [{ model: User, as: 'Sender', attributes: ['id_user', 'username'] }],
        order: [['created_at', 'ASC']]
      });
      res.json({ success: true, messages });
    } catch (error) {
      console.error("Eroare istoric:", error); res.status(500).json({ success: false });
    }
  },

  // Upload fișier (via API POST)
  async uploadMessageFile(req, res) {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: 'Niciun fișier.' });
        }
        const { sender_id, conversation_id } = req.body;
        const uploadedFile = req.files.messageFile;

        const isImage = uploadedFile.mimetype.startsWith('image/');
        const messageType = isImage ? 'image' : 'file';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFileName = `msg-${uniqueSuffix}${path.extname(uploadedFile.name)}`;
        
        // Salvare fizică
        await uploadedFile.mv(path.join(__dirname, '../uploads/chat_files/', newFileName));

        // Salvare DB
        const newMessage = await Message.create({
            conversation_id, sender_id, message_type: messageType,
            message_text: null, file_name: uploadedFile.name,
            file_url: `/chat_files/${newFileName}`, file_size: uploadedFile.size
        });

        // Returnăm mesajul complet pentru socket
        const fullMessage = await Message.findByPk(newMessage.id, {
            include: [{ model: User, as: 'Sender', attributes: ['id_user', 'username'] }]
        });
        res.status(201).json({ success: true, messageData: fullMessage });

    } catch (error) { console.error("Upload error:", error); res.status(500).json({ success: false }); }
  },

  // Upload simplu pentru atașamente (returnează doar calea, mesajul se trimite prin socket)
  async uploadAttachment(req, res) {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: 'Niciun fișier selectat.' });
        }
        
        const uploadedFile = req.files.attachment;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFileName = `att-${uniqueSuffix}${path.extname(uploadedFile.name)}`;
        
        // Asigurăm existența folderului
        const uploadDir = path.join(__dirname, '../uploads/chat_files');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        await uploadedFile.mv(path.join(uploadDir, newFileName));

        res.json({ 
            success: true, 
            fileUrl: `/uploads/chat_files/${newFileName}`,
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            fileType: uploadedFile.mimetype
        });

    } catch (error) { console.error("Attachment upload error:", error); res.status(500).json({ success: false }); }
  }
};
module.exports = messageController;