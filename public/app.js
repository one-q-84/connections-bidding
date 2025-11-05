// Connect to backend - 
const SOCKET_URL = 'https://auction-backend-a3tv.onrender.com';
const socket = io(SOCKET_URL);

// State
let myUsername = '';
let myBid = 0;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const auctionScreen = document.getElementById('auctionScreen');
const winnerScreen = document.getElementById('winnerScreen');

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  myUsername = document.getElementById('usernameInput').value.trim();
  if (myUsername) {
    socket.emit('join', myUsername);
    showScreen('lobby');
    document.getElementById('welcomeName').textContent = myUsername;
  }
});

// Chat Message Handler
document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (message) {
    socket.emit('sendMessage', message);
    input.value = '';
  }
}

// Bidding Function
function placeBid(amount) {
  myBid += amount;
  document.getElementById('myBidAmount').textContent = myBid;
  socket.emit('placeBid', myBid);
}

// Socket Event Listeners
socket.on('userList', (users) => {
  const usersList = document.getElementById('usersList');
  const userCount = document.getElementById('userCount');
  
  userCount.textContent = users.length;
  usersList.innerHTML = users.map(user => 
    `<div class="user-item">${user}</div>`
  ).join('');
});

socket.on('chatMessage', (msg) => {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  messageDiv.innerHTML = `<span class="username">${msg.user}:</span>${msg.text}`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('auctionStarted', () => {
  showScreen('auction');
  myBid = 0;
  document.getElementById('myBidAmount').textContent = '0';
});

socket.on('auctionTimer', (timeLeft) => {
  document.getElementById('auctionTimer').textContent = timeLeft;
});

socket.on('bidUpdate', (bids) => {
  const leaderboard = document.getElementById('leaderboardList');
  const sortedBids = bids.sort((a, b) => b.amount - a.amount).slice(0, 5);
  
  leaderboard.innerHTML = sortedBids.map((bid, index) => 
    `<div class="leaderboard-item">
      <div>
        <span class="leaderboard-rank">${index + 1}</span>
        <strong>${bid.user}</strong>
      </div>
      <div style="font-size: 20px; font-weight: bold;">$${bid.amount}</div>
    </div>`
  ).join('');
});

socket.on('auctionEnded', (data) => {
  if (data.winner) {
    document.getElementById('winnerName').textContent = data.winner.user;
    document.getElementById('winnerAmount').textContent = data.winner.amount;
    showScreen('winner');
    
    setTimeout(() => {
      showScreen('lobby');
    }, 5000);
  } else {
    showScreen('lobby');
  }
});

// Screen Management
function showScreen(screen) {
  loginScreen.classList.add('hidden');
  lobbyScreen.classList.add('hidden');
  auctionScreen.classList.add('hidden');
  winnerScreen.classList.add('hidden');

  switch(screen) {
    case 'login':
      loginScreen.classList.remove('hidden');
      break;
    case 'lobby':
      lobbyScreen.classList.remove('hidden');
      break;
    case 'auction':
      auctionScreen.classList.remove('hidden');
      break;
    case 'winner':
      winnerScreen.classList.remove('hidden');
      break;
  }
}

// Connection status
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  alert('Connection lost. Please refresh the page.');
});