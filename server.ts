import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
    // Increase limit for large images (base64)
    maxHttpBufferSize: 1e8, // 100mb
  });

  const PORT = 3000;

  // Store room state
  const rooms = new Map<string, any>();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);

      // Send initial state if it exists
      if (rooms.has(roomId)) {
        socket.emit("initial-state", rooms.get(roomId));
      }
    });

    socket.on("init-puzzle", ({ roomId, state }) => {
      rooms.set(roomId, state);
      socket.to(roomId).emit("initial-state", state);
    });

    socket.on("update-piece", ({ roomId, pieceId, x, y, isPlaced }) => {
      const room = rooms.get(roomId);
      if (room) {
        const piece = room.pieces.find((p: any) => p.id === pieceId);
        if (piece) {
          piece.x = x;
          piece.y = y;
          piece.isPlaced = isPlaced;
          socket.to(roomId).emit("piece-updated", { pieceId, x, y, isPlaced });
        }
      }
    });

    socket.on("shuffle", ({ roomId, pieces }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.pieces = pieces;
        socket.to(roomId).emit("shuffled", pieces);
      }
    });

    socket.on("change-bg", ({ roomId, color }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.backgroundColor = color;
        socket.to(roomId).emit("bg-changed", color);
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
