# Quick Start Guide

## 🚀 Start with Docker (Easiest)

```bash
# Navigate to project directory
cd /media/advait2015/5f111175-551e-417c-b1ca-da1e909ee9fe/Devops-Project

# Start all services
docker-compose up

# Access the app
# Open browser to: http://localhost:5000
```

That's it! The application will be running with:
- Backend on http://localhost:5000
- MongoDB on localhost:27017
- Frontend served from the backend

## 📝 Test the Application

1. **Register**: Create an account with username and password
2. **Login**: Log in with your credentials
3. **Send Messages**: Type and send messages instantly
4. **Share Images**: Click the "📎 Image" button to upload images
5. **Toggle Low-Bandwidth**: Enable to hide images
6. **View Summary**: Click "Summary" to see message summary
7. **Logout**: Click "Logout" to exit

## 🛑 Stop Docker Application

```bash
docker-compose down
```

## 💻 Run Locally Without Docker

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally

### Backend Setup

```bash
cd backend
npm install
npm start
```

Backend runs on http://localhost:5000

### Frontend Setup (in another terminal)

```bash
cd frontend
npx http-server
# or
python -m http.server 8000
```

Access at http://localhost:8000

## 🔧 Useful Commands

```bash
# View logs
docker-compose logs backend

# View MongoDB logs
docker-compose logs mongodb

# Access MongoDB shell
docker-compose exec mongodb mongosh -u root -p password

# Rebuild images
docker-compose up --build

# Remove all data
docker-compose down -v
```

## 📂 Project Structure

```
Devops-Project/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── public/          # Frontend files served by Express
│   ├── uploads/         # Uploaded images
│   ├── server.js        # Main server file
│   ├── package.json     # Dependencies
│   └── Dockerfile       # Docker configuration
├── frontend/            # Optional separate frontend
├── docker-compose.yml   # Docker services config
├── .gitignore
├── README.md
└── QUICKSTART.md        # This file
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Stop other apps or change port in docker-compose.yml |
| Cannot connect to MongoDB | Wait for MongoDB to be ready (check logs) |
| Images not showing | Ensure uploads directory has permissions |
| Frontend blank | Clear browser cache and refresh |

## 📊 Architecture

```
Browser (http://localhost:5000)
    ↓
Express Server (Node.js)
    ├─ Socket.IO (WebSocket)
    ├─ REST APIs
    └─ Static Files
    
    ↓ ↓ ↓
MongoDB (Image files stored on disk)
```

## 🎯 Key Features Working

- ✅ User Registration & Login
- ✅ Real-time Chat with Socket.IO
- ✅ Image Sharing & Upload
- ✅ Message Persistence in MongoDB
- ✅ Low-Bandwidth Mode (disable images)
- ✅ Automatic Keyword Detection (urgent, important, etc.)
- ✅ Chat Summarization
- ✅ Fully Dockerized

## 📚 API Endpoints (for testing)

```bash
# Register
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}'

# Get all messages
curl http://localhost:5000/messages

# Get summary
curl http://localhost:5000/summary
```

## 🚀 Next Steps

1. Try registering multiple users
2. Send messages and images
3. Test low-bandwidth mode
4. Check the summary feature
5. Review logs with `docker-compose logs`
6. Ready to deploy!
