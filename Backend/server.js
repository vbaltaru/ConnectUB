const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { Op } = require("sequelize");

// --- IMPORT MODELE ---
const Message = require("./models/Message");
const User = require("./models/Users");
const GroupMessage = require("./models/GroupMessage");

// --- IMPORT RUTE API ---
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const taskRoutes = require("./routes/tasks");
const scheduleRoutes = require("./routes/schedule");
const friendRoutes = require("./routes/friends");
const friendRequestRoutes = require("./routes/friendRequests");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groupRoutes");

const app = express();
const server = http.createServer(app);

// Configurare Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true }));

// --- MIDDLEWARE LOGARE (DEBUG) ---
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Servire fișiere statice din folderul Frontend
app.use(express.static(path.join(__dirname, "../Frontend")));
app.use("/Frontend", express.static(path.join(__dirname, "../Frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- LOGICA CHAT (SOCKET.IO) ---
io.on("connection", (socket) => {
  console.log("Utilizator conectat:", socket.id);

  // Alăturare cameră conversație
  socket.on("join_room", (conversationId) => {
    socket.join("room_" + conversationId);
    console.log(
      `Socket ${socket.id} s-a alăturat camerei: room_${conversationId}`,
    );
  });

  // Gestionare mesaj nou
  socket.on("send_message", async (data) => {
    try {
      const senderId = parseInt(data.sender_id);

      if (data.is_group) {
        // --- LOGICĂ MESAJE GRUP ---
        const groupId = parseInt(data.group_id);

        const newMessage = await GroupMessage.create({
          group_id: groupId,
          sender_id: senderId,
          message_type: data.message_type || "text",
          message_text: data.message_text,
          file_name: data.file_name || null,
          file_url: data.file_url || null,
          file_size: data.file_size || null,
          created_at: new Date(),
        });

        // Asigurăm asocierea pentru a putea popula datele expeditorului
        if (!GroupMessage.associations.Sender) {
          GroupMessage.belongsTo(User, {
            foreignKey: "sender_id",
            as: "Sender",
          });
        }

        const fullMsg = await GroupMessage.findByPk(newMessage.id, {
          include: [
            { model: User, as: "Sender", attributes: ["id_user", "username"] },
          ],
        });

        io.to("room_" + groupId).emit("receive_message", fullMsg);
      } else {
        // --- LOGICĂ MESAJE PRIVATE ---
        const convId = parseInt(data.conversation_id);

        const newMessage = await Message.create({
          conversation_id: convId,
          sender_id: senderId,
          message_type: data.message_type || "text",
          message_text: data.message_text,
          file_name: data.file_name || null,
          file_url: data.file_url || null,
          file_size: data.file_size || null,
          is_read: 0,
        });

        // Trimitem mesajul salvat tuturor din cameră
        // Notă: Message are deja asocierea definită în model
        io.to("room_" + convId).emit("receive_message", newMessage);
      }
    } catch (error) {
      console.error("❌ Eroare la salvarea mesajului în DB:", error.message);
      // Opțional: poți trimite o eroare înapoi la client
      socket.emit("error_message", {
        message: "Mesajul nu a putut fi salvat.",
      });
    }
  });

  // Marcare mesaje ca citite
  socket.on("mark_messages_read", async (data) => {
    try {
      const { conversation_id, reader_id } = data;
      // Actualizăm mesajele din conversație care NU sunt trimise de cititor și sunt necitite
      await Message.update(
        { is_read: 1 },
        {
          where: {
            conversation_id: parseInt(conversation_id),
            sender_id: { [Op.ne]: parseInt(reader_id) },
            is_read: 0,
          },
        },
      );
    } catch (error) {
      console.error("Eroare la marcarea mesajelor ca citite:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Utilizator deconectat");
  });
});

// --- RUTE API ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/requests", friendRequestRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

// --- SERVIRE PAGINI HTML ---
const sendHtml = (res, filePath) => {
  res.sendFile(path.join(__dirname, "../Frontend", filePath), (err) => {
    if (err) {
      console.error("Eroare la servirea fișierului:", filePath);
      res.status(404).send("Pagina nu a fost găsită.");
    }
  });
};

app.get("/", (req, res) => sendHtml(res, "Login/login.html"));
app.get("/login", (req, res) => sendHtml(res, "Login/login.html"));
app.get("/dashboard", (req, res) => sendHtml(res, "Interface/index.html"));
app.get("/friends", (req, res) =>
  sendHtml(res, "Interface/Friends/friends.html"),
);
app.get("/messages", (req, res) =>
  sendHtml(res, "Interface/Messages/chat.html"),
);
app.get("/tasks", (req, res) => sendHtml(res, "Interface/Tasks/tasks.html"));
app.get("/schedule", (req, res) =>
  sendHtml(res, "Interface/Schedule/schedule.html"),
);

app.get("/settings", (req, res) => sendHtml(res, "Settings/settings.html"));

// Corecție pentru eroarea 404: HTML-ul cere settings.js, dar fișierul pe disk este script.js
app.get("/Settings/settings.js", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/Settings/script.js"));
});

// Eliminare eroare 404 pentru favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/register", (req, res) =>
  sendHtml(res, "Create_Account/create_account.html"),
);
app.get("/register_2", (req, res) =>
  sendHtml(res, "Create_Account/create_account_2.html"),
);

// --- PORNIRE SERVER ---
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
     Server StudentHub pornit pe http://localhost:${PORT}
    Pagina de Login: http://localhost:${PORT}/login
    `);
});
