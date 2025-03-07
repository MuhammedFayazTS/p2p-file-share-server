import { Server } from "socket.io";
import { formatUsers, getPlatform } from "./utils/helper";
import { User, UsersMap } from "./@types/types";

export const setupSocket = (io: Server) => {
  const users: UsersMap = new Map();
  const userToRoom: Map<string, string> = new Map();
  const roomToUsers = new Map();

  const addUserToRoom = (userId: string, roomId: string) => {
    // Remove user from any existing room first
    if (userToRoom.has(userId)) {
      removeUserFromRoom(userId);
    }
    // Assign user to new room
    userToRoom.set(userId, roomId);

    // Add user to the room's user set
    if (!roomToUsers.has(roomId)) {
      roomToUsers.set(roomId, new Set());
    }
    roomToUsers.get(roomId).add(userId);
  };

  // Remove a user from a room
  const removeUserFromRoom = (userId: string) => {
    if (!userToRoom.has(userId)) return;

    const roomId = userToRoom.get(userId);
    userToRoom.delete(userId);

    if (roomToUsers.has(roomId)) {
      const users = roomToUsers.get(roomId);
      users.delete(userId);

      // If room is empty, delete it
      if (users.size === 0) {
        roomToUsers.delete(roomId);
      }
    }
  };

  // Get the room a user is in
  const getUserRoom = (userId: string) => {
    return userToRoom.get(userId) || null;
  };

  // Get all users in a room
  const getUsersInRoom = (roomId: string): User[] => {
    const userIds = roomToUsers.get(roomId) ?? new Set<string>();

    return Array.from(userIds as Set<string>)
      .map((socketId) => users.get(socketId))
      .filter((user): user is User => Boolean(user));
  };

  // Remove a room entirely
  const removeRoom = (roomId: string) => {
    if (roomToUsers.has(roomId)) {
      for (const userId of roomToUsers.get(roomId)) {
        userToRoom.delete(userId);
      }
      roomToUsers.delete(roomId);
    }
  };

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("request join room", (roomId, targetUserId) => {
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (!targetSocket) {
        io.to(socket.id).emit("error", "Selected user is not connected!");
        return;
      }
      const requestUser = users.get(socket.id);
      io.to(targetSocket.id).emit("request to join room", roomId, requestUser);
    });

    socket.on("accept request", (senderId, roomId) => {
      const targetSocket = io.sockets.sockets.get(senderId);
      if (!targetSocket) {
        io.to(socket.id).emit("error", "Sender user is disconnected!");
        return;
      }
      io.to(targetSocket.id).emit("user accepted request", roomId);
    });

    socket.on("join room", (roomId, isPrivate) => {
      if (isPrivate) {
        if (getUsersInRoom(roomId)?.length >= 2) return;
      }
      addUserToRoom(socket.id, roomId);
      socket.join(roomId);
      console.log(`User ${socket.id} joined ${roomId}`);
      io.to(roomId).emit("user joined", getUsersInRoom(roomId));
    });

    socket.on(
      "userDetails",
      ({ userAgent, fullName, image, position, color }) => {
        const platform = getPlatform(userAgent);

        users.set(socket.id, {
          id: socket.id,
          userAgent: platform,
          fullName,
          image,
          position,
          color,
        });

        io.emit("all users", formatUsers(users));
      }
    );

    socket.on("signal", ({ roomId, signal }) => {
      console.log(`Received signal for room: ${roomId}`);
      console.log(`Signal type: ${signal.type}`); // Should be "offer" or "answer"
      console.log(`Users in room: ${getUsersInRoom(roomId)}`);
  
      io.to(roomId).emit("signal", signal);
  });
  

    socket.on("disconnect", () => {
      users.delete(socket.id);
      removeUserFromRoom(socket.id);
      console.log("Client disconnected:", socket.id);
    });
  });
};
