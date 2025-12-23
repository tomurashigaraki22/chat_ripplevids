CREATE TABLE IF NOT EXISTS rooms (
    id CHAR(36) PRIMARY KEY,
    participant1 CHAR(36) NOT NULL,
    participant2 CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP NULL,
    UNIQUE KEY unique_participants (participant1, participant2),
    INDEX idx_last_message_at (last_message_at)
);

CREATE TABLE IF NOT EXISTS ripplevids_messages (
    id CHAR(36) PRIMARY KEY,
    room_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_created (room_id, created_at DESC)
);
