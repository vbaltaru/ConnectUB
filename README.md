# ConnectUB

ConnectUB is a social and productivity platform designed for students. It facilitates real-time communication through private chats and groups, friendship management, and academic task organization.

## Key Features

### 1. Authentication and User Profile

- **Registration & Login**: Secure system with password encryption (bcrypt) and security questions.
- **Profile**: Edit personal details (Name, Study Year, Specialization) and upload profile pictures.
- **Search**: Find other users by username.

### 2. Real-Time Chat (Socket.io)

- **Private Messaging**: One-on-one discussions with friends.
- **Group Chats**:
  - Create groups with selected friends.
  - Roles: Admin (creator) and Members.
  - Admin functions: Kick members, Delete group, Update group photo.
  - Member functions: Leave group.
  - _Note:_ The group is automatically deleted if only one member remains.
- **Multimedia**: Send text messages, images, and files.
- **Notifications**: Real-time unread message counters.

### 3. Friend Management

- Add friends.
- View friend list with status indicators.

### 4. Task Manager

- Add, view, update status, and delete personal tasks.
- Filter tasks by status (To Do, In Progress, Done).

## Technologies Used

**Backend:**

- Node.js & Express.js
- Sequelize ORM
- Socket.io (WebSocket)
- Bcrypt

**Frontend:**

- HTML5, CSS3
- JavaScript (Vanilla)
- Socket.io Client

**Database:**

- MySQL / MariaDB

## Project Structure

```text
ConnectUB/
├── Backend/
│   ├── controllers/   # Business logic (User, Friend, Group, Task)
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── uploads/       # File storage
│   └── server.js      # Entry point
├── Frontend/
│   ├── Interface/     # UI pages
│   └── ...
└── README.md
```

## Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ConnectUB.git
    cd ConnectUB
    ```

2.  **Backend Setup:**
    Navigate to the backend folder and install dependencies:

    ```bash
    cd Backend
    npm install
    ```

3.  **Start Application:**
    ```bash
    npm start
    ```

