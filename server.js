const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in this example
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Helper to get sorted participants
function getSortedParticipants(user1, user2) {
    return [user1, user2].sort();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a Chat Room
    socket.on('join_chat', async ({ userId, targetUserId }) => {
        try {
            if (!userId || !targetUserId) {
                return socket.emit('error', { message: 'Missing user IDs' });
            }

            const [p1, p2] = getSortedParticipants(userId, targetUserId);

            // Check if room exists
            const [rows] = await db.execute(
                'SELECT * FROM rooms WHERE participant1 = ? AND participant2 = ?',
                [p1, p2]
            );

            let room;
            if (rows.length > 0) {
                room = rows[0];
            } else {
                // Create new room
                const newRoomId = uuidv4();
                await db.execute(
                    'INSERT INTO rooms (id, participant1, participant2) VALUES (?, ?, ?)',
                    [newRoomId, p1, p2]
                );
                // Fetch the created room
                const [newRows] = await db.execute('SELECT * FROM rooms WHERE id = ?', [newRoomId]);
                room = newRows[0];
            }

            // Join the socket room
            socket.join(room.id);
            socket.emit('room_joined', { roomId: room.id, room });

            // Fetch initial messages (last 50)
            const [messages] = await db.execute(
                'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 50',
                [room.id]
            );

            socket.emit('message_history', {
                roomId: room.id,
                messages: messages.reverse() // Reverse to show oldest first
            });

        } catch (error) {
            console.error('Error joining chat:', error);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    });

    // Send Message
    socket.on('send_message', async ({ roomId, senderId, body }) => {
        try {
            // Validate input
            if (!roomId || !senderId || !body) {
                return socket.emit('error', { message: 'Missing message details' });
            }

            // Validate sender belongs to room
            const [roomRows] = await db.execute(
                'SELECT * FROM rooms WHERE id = ? AND (participant1 = ? OR participant2 = ?)',
                [roomId, senderId, senderId]
            );

            if (roomRows.length === 0) {
                return socket.emit('error', { message: 'Invalid room or sender not in room' });
            }

            const messageId = uuidv4();
            const createdAt = new Date();

            // Save message
            await db.execute(
                'INSERT INTO messages (id, room_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
                [messageId, roomId, senderId, body, createdAt]
            );

            // Update room last_message_at
            await db.execute(
                'UPDATE rooms SET last_message_at = ? WHERE id = ?',
                [createdAt, roomId]
            );

            const message = {
                id: messageId,
                room_id: roomId,
                sender_id: senderId,
                body: body,
                created_at: createdAt
            };

            // Emit to room (including sender)
            io.to(roomId).emit('new_message', message);

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Fetch Older Messages (Pagination)
    socket.on('fetch_messages', async ({ roomId, limit = 20, offset = 0 }) => {
        try {
            const [messages] = await db.execute(
                'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [roomId, parseInt(limit), parseInt(offset)]
            );

            socket.emit('more_messages', {
                roomId: roomId,
                messages: messages.reverse(),
                offset: parseInt(offset) + messages.length
            });

        } catch (error) {
            console.error('Error fetching messages:', error);
            socket.emit('error', { message: 'Failed to fetch messages' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
