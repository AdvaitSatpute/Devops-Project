# Real-Time Chat Application

A complete, minimal full-stack real-time chat application built with Node.js, Express, MongoDB, and Socket.IO.

## Features

- **User Authentication**: Simple register and login with username/password
- **Real-Time Messaging**: Instant messaging using Socket.IO
- **Image Sharing**: Upload and share images in the chat
- **Low-Bandwidth Mode**: Toggle to disable image loading for slow connections
- **Message Filtering**: Automatic keyword detection marks important messages
- **Chat Summarization**: Get a summary of recent messages with one click

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Plain HTML, CSS, JavaScript (no frameworks)
- **Database**: MongoDB
- **Real-Time Communication**: Socket.IO
- **Containerization**: Docker + docker-compose
- **File Upload**: Multer

## Project Structure

```
.
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Message.js
│   ├── public/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- Docker and docker-compose installed
- OR Node.js 18+ and MongoDB running locally

### Running with Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Devops-Project

# Start the application
docker-compose up

# The app will be available at http://localhost:5000
```

### Running Locally (Without Docker)

#### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (optional):
```
MONGO_URI=mongodb://localhost:27017/chatapp
PORT=5000
```

Start MongoDB:
```bash
# Make sure MongoDB is running on localhost:27017
```

Start the backend server:
```bash
npm start
```

#### Frontend Setup

Open `frontend/index.html` in a web browser, or serve it using a simple HTTP server:

```bash
cd frontend
npx http-server
# or
python -m http.server 8000
```

Access the application:
- Backend: http://localhost:5000
- Frontend: http://localhost:8000 (if using http-server)

## API Endpoints

### Authentication

- **POST /register** - Register a new user
  - Body: `{ "username": "string", "password": "string" }`
  - Response: `{ "message": "User registered successfully", "userId": "string" }`

- **POST /login** - Login user
  - Body: `{ "username": "string", "password": "string" }`
  - Response: `{ "message": "Login successful", "userId": "string", "username": "string" }`

### Messages

- **GET /messages** - Get all messages (last 100)
  - Response: Array of message objects

- **GET /summary** - Get a summary of recent messages
  - Response: `{ "summary": "string" }`

### File Upload

- **POST /upload** - Upload an image
  - Body: FormData with `image` file
  - Response: `{ "imageUrl": "string" }`

## Socket.IO Events

### Client → Server

- **user_join** - Emit when user joins chat
  - Payload: `{ "username": "string" }`

- **send_message** - Send a message
  - Payload: `{ "username": "string", "text": "string", "imageUrl": "string|null" }`

### Server → Client

- **receive_message** - Receive a new message
  - Payload: Message object with id, username, text, imageUrl, isImportant, timestamp

- **user_joined** - Notify when a user joins
  - Payload: `{ "username": "string", "message": "string" }`

- **user_left** - Notify when a user leaves
  - Payload: `{ "username": "string", "message": "string" }`

## Features in Detail

### User Authentication
- Simple username/password registration and login
- No password hashing (for simplicity - use bcrypt in production)
- Session managed via user ID on client side

### Real-Time Chat
- Messages sent and received instantly via Socket.IO
- Message history loaded on login (last 100 messages)
- Timestamps for each message
- System notifications for user join/leave

### Image Sharing
- Users can upload images alongside messages
- Images are stored in `backend/uploads/`
- Images are served via `/uploads/` endpoint
- Supported formats: JPEG, PNG, GIF, WebP

### Low-Bandwidth Mode
- Toggle in UI to enable/disable
- When enabled: images are not loaded or displayed
- Reduces data consumption for slow connections

### Message Filtering
- Predefined keywords: "urgent", "important", "critical", "alert", "asap"
- Messages containing keywords are marked with "IMPORTANT" badge
- Important messages have a red left border and highlighted background

### Chat Summarization
- Fetches last 20 messages from database
- Generates simple summary: total message count, unique users, important messages count
- Display summary in a popup overlay

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String,
  createdAt: Date
}
```

### Message Collection
```javascript
{
  _id: ObjectId,
  username: String,
  text: String,
  imageUrl: String (nullable),
  isImportant: Boolean,
  timestamp: Date
}
```

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/chatapp
PORT=5000
NODE_ENV=development
```

### Docker
MongoDB credentials are configured in `docker-compose.yml`:
- Username: root
- Password: password
- Auth Database: admin

## Common Issues & Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running
- Check MONGO_URI is correct
- For Docker: ensure services are on the same network

### "Port 5000 already in use"
- Change port in environment variables
- Or stop the application using port 5000

### "Images not uploading"
- Check `backend/uploads/` directory has write permissions
- Verify file size is within limits (default: 50MB)

### Frontend not connecting to backend
- Ensure backend is running on port 5000
- Check CORS is enabled (it is by default)
- Open browser console to check for errors

## Development

### Running in Development Mode

Backend with auto-restart:
```bash
cd backend
npm install --save-dev nodemon
npm run dev
```

### Making Changes

1. Modify code in `backend/` or `frontend/`
2. Backend will auto-restart (with nodemon) or restart manually
3. Frontend changes: refresh browser

### Building Docker Images

```bash
# Rebuild after code changes
docker-compose down
docker-compose up --build
```

## Production Considerations

For production use, consider:
1. Use bcrypt for password hashing
2. Add proper authentication with JWT tokens
3. Implement HTTPS/SSL
4. Use environment variables for sensitive data
5. Add input validation and sanitization
6. Implement rate limiting
7. Add logging and monitoring
8. Use reverse proxy (nginx)

## License

ISC

## Author

Advait Satpute
Aniruddh Saraf
Sahil Sarupria
