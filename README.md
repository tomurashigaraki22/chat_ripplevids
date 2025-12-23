# Real-Time Chat System API Documentation

This documentation outlines how to consume the WebSocket API for the 1-on-1 chat system.

## Prerequisites

You need a WebSocket client to connect to the server. We recommend using `socket.io-client`.

```bash
npm install socket.io-client
```

## Connection

Connect to the server URL (default: `http://localhost:3000`).

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to chat server:", socket.id);
});
```

## WebSocket Events

### 1. Join a Chat

Initiates a chat session between two users. The server automatically determines the unique room for these two users.

**Emit:** `join_chat`

**Payload:**
```javascript
{
  userId: "uuid-string-of-current-user",
  targetUserId: "uuid-string-of-other-user"
}
```

**Responses:**

*   **Success (`room_joined`):** Returns the room details.
    ```javascript
    socket.on("room_joined", (data) => {
      console.log("Room ID:", data.roomId);
      console.log("Room Details:", data.room);
    });
    ```

*   **History (`message_history`):** Returns the last 50 messages immediately after joining.
    ```javascript
    socket.on("message_history", (data) => {
      console.log("Messages:", data.messages); // Array of message objects
    });
    ```

*   **Error (`error`):** If validation fails.
    ```javascript
    socket.on("error", (err) => {
      console.error("Error:", err.message);
    });
    ```

---

### 2. Send a Message

Sends a message to the current room.

**Emit:** `send_message`

**Payload:**
```javascript
{
  roomId: "uuid-of-the-room", // Obtained from 'room_joined' event
  senderId: "uuid-string-of-current-user",
  body: "Hello world!"
}
```

**Responses:**

*   **Success (`new_message`):** Broadcasted to **both** participants in the room. Use this to append the message to the UI.
    ```javascript
    socket.on("new_message", (message) => {
      console.log("New Message:", message);
      // {
      //   id: "uuid...",
      //   room_id: "...",
      //   sender_id: "...",
      //   body: "Hello world!",
      //   created_at: "2023-10-27T..."
      // }
    });
    ```

---

### 3. Fetch Older Messages (Pagination)

Load previous messages when the user scrolls up.

**Emit:** `fetch_messages`

**Payload:**
```javascript
{
  roomId: "uuid-of-the-room",
  limit: 20,   // Number of messages to fetch (default: 20)
  offset: 50   // Number of messages already loaded (e.g., current list length)
}
```

**Responses:**

*   **Success (`more_messages`):**
    ```javascript
    socket.on("more_messages", (data) => {
      const olderMessages = data.messages; // Prepend these to your UI list
      const nextOffset = data.offset;      // Use this for the next fetch
      
      if (olderMessages.length === 0) {
        console.log("No more messages.");
      }
    });
    ```

## Data Structures

### Room Object
```json
{
  "id": "uuid-room-id",
  "participant1": "uuid-user-a",
  "participant2": "uuid-user-b",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "last_message_at": "timestamp"
}
```

### Message Object
```json
{
  "id": "uuid-message-id",
  "room_id": "uuid-room-id",
  "sender_id": "uuid-sender-id",
  "body": "Message content",
  "created_at": "timestamp"
}
```

## Example Integration Flow

```javascript
// 1. Initialize
const currentUser = "user-uuid-1";
const otherUser = "user-uuid-2";
let currentRoomId = null;

// 2. Join Chat
socket.emit("join_chat", { userId: currentUser, targetUserId: otherUser });

// 3. Handle Room Join
socket.on("room_joined", ({ roomId }) => {
  currentRoomId = roomId;
  console.log("Joined room:", roomId);
});

// 4. Handle Initial Messages
socket.on("message_history", ({ messages }) => {
  renderMessages(messages); // Render initial list
});

// 5. Send Message
function sendMessage(text) {
  if (!currentRoomId) return;
  socket.emit("send_message", {
    roomId: currentRoomId,
    senderId: currentUser,
    body: text
  });
}

// 6. Receive Real-time Messages
socket.on("new_message", (message) => {
  appendMessage(message);
});
```
