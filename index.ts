import http from "http";
import dotenv from "dotenv";
import { app } from "./app";
import { setupSocket } from "./socket";
import { Server } from "socket.io";

dotenv.config();

const port = process.env.PORT || 6000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocket(io);

httpServer.listen(port, () => {
  console.log(`> Server running at port ${port}`);
});
