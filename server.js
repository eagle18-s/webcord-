const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// Serverdə mövcud olan kanallar və mesaj yaddaşı
const channels = ["ümumi", "sohbət", "oyunlar", "musiqi"];
const messages = {
  ümumi: [],
  sohbət: [],
  oyunlar: [],
  musiqi: []
};

let activeUsers = {};

io.on("connection", (socket) => {
  console.log("Yeni istifadəçi qoşuldu:", socket.id);

  // İstifadəçi daxil olduqda
  socket.on("join", (username) => {
    activeUsers[socket.id] = username || "Anonim";
    io.emit("update-user-list", Object.values(activeUsers));
    
    // Varsayılan olaraq 'ümumi' kanalına daxil et
    socket.join("ümumi");
    socket.emit("load-messages", messages["ümumi"]);
  });

  // Kanal dəyişmə
  socket.on("switch-channel", ({ oldChannel, newChannel }) => {
    socket.leave(oldChannel);
    socket.join(newChannel);
    socket.emit("load-messages", messages[newChannel] || []);
  });

  // Mesaj göndərilməsi
  socket.on("send-message", ({ channel, text }) => {
    const username = activeUsers[socket.id] || "Anonim";
    const msgData = {
      id: Date.now(),
      user: username,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (!messages[channel]) {
      messages[channel] = [];
    }
    messages[channel].push(msgData);

    // Son 100 mesajı saxla (yaddaşı doldurmamaq üçün)
    if (messages[channel].length > 100) {
      messages[channel].shift();
    }

    io.to(channel).emit("new-message", msgData);
  });

  // İstifadəçi ayrılanda
  socket.on("disconnect", () => {
    delete activeUsers[socket.id];
    io.emit("update-user-list", Object.values(activeUsers));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebCord serveri running on port ${PORT}`);
});
