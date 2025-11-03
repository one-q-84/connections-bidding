// server.js
// Simple Node.js + Express + Socket.io server for auction platform

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data storage (simple for learning)
let users = {}; // socketId -> username
let bids = {}; // socketId -> {user, amount}
let auctionActive = false;
let auctionTimer = null;

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Auction Server Running', users: Object.keys(users).length });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User joins with their name
  socket.on('join', (username) => {
    users[socket.id] = username;
    console.log(`${username} joined`);
    
    // Send updated user list to everyone
    broadcastUserList();
    
    // Welcome message
    io.emit('chatMessage', {
      user: 'System',
      text: `${username} joined the lobby!`
    });
  });

  // Chat message
  socket.on('sendMessage', (message) => {
    const username = users[socket.id];
    if (username) {
      io.emit('chatMessage', {
        user: username,
        text: message
      });
    }
  });

  // Place a bid
  socket.on('placeBid', (amount) => {
    const username = users[socket.id];
    if (username && auctionActive) {
      bids[socket.id] = {
        user: username,
        amount: amount
      };
      
      // Send updated bid list to everyone
      broadcastBids();
    }
  });

  // Start auction (admin function)
  socket.on('startAuction', () => {
    if (!auctionActive) {
      startAuction();
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      console.log(`${username} disconnected`);
      delete users[socket.id];
      delete bids[socket.id];
      
      broadcastUserList();
      io.emit('chatMessage', {
        user: 'System',
        text: `${username} left the lobby`
      });
    }
  });
});

// Helper function to broadcast user list
function broadcastUserList() {
  const userList = Object.values(users);
  io.emit('userList', userList);
}

// Helper function to broadcast current bids
function broadcastBids() {
  const bidList = Object.values(bids);
  io.emit('bidUpdate', bidList);
}

// Start auction function
function startAuction() {
  auctionActive = true;
  bids = {}; // Reset bids
  
  console.log('Auction started!');
  io.emit('auctionStarted', { duration: 30 });
  
  // 30-second countdown
  let timeLeft = 30;
  auctionTimer = setInterval(() => {
    timeLeft--;
    io.emit('auctionTimer', timeLeft);
    
    if (timeLeft <= 0) {
      endAuction();
    }
  }, 1000);
}

// End auction function
function endAuction() {
  clearInterval(auctionTimer);
  auctionActive = false;
  
  // Find winner (highest bid)
  const bidList = Object.values(bids);
  const winner = bidList.reduce((max, bid) => 
    bid.amount > (max?.amount || 0) ? bid : max, null);
  
  console.log('Auction ended! Winner:', winner);
  
  io.emit('auctionEnded', { winner });
  
  // Reset for next auction
  bids = {};
}

// Admin endpoint to start auction (for testing)
app.post('/api/start-auction', (req, res) => {
  if (!auctionActive) {
    startAuction();
    res.json({ success: true, message: 'Auction started' });
  } else {
    res.json({ success: false, message: 'Auction already active' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}`);
});

// Export for testing
module.exports = { app, server, io };