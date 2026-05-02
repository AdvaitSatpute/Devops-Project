const socket = io();

let currentUser = null;
let isLowBandwidth = false;

// API Base URL
const API_BASE = window.location.origin;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authTitle = document.getElementById('auth-title');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const authButton = document.getElementById('auth-button');
const toggleAuthButton = document.getElementById('toggle-auth-button');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const imageButton = document.getElementById('image-button');
const imageInput = document.getElementById('image-input');
const logoutButton = document.getElementById('logout-button');
const lowBandwidthToggle = document.getElementById('low-bandwidth-toggle');
const summaryButton = document.getElementById('summary-button');
const summaryBox = document.getElementById('summary-box');
const summaryText = document.getElementById('summary-text');
const closeSummaryButton = document.getElementById('close-summary-button');

let isLoginMode = true;

// Auth Toggle
toggleAuthButton.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authTitle.textContent = isLoginMode ? 'Login' : 'Register';
  authButton.textContent = isLoginMode ? 'Login' : 'Register';
  toggleAuthButton.textContent = isLoginMode ? 'Create Account' : 'Back to Login';
  passwordInput.value = '';
  usernameInput.value = '';
});

// Auth Button Click
authButton.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }

  try {
    const endpoint = isLoginMode ? '/login' : '/register';
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Error');
      return;
    }

    currentUser = { username, userId: data.userId };
    showChat();
    loadMessages();
    socket.emit('user_join', { username });
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// Show Chat
function showChat() {
  authContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
}

// Show Auth
function showAuth() {
  authContainer.style.display = 'flex';
  chatContainer.style.display = 'none';
  messageInput.value = '';
  messagesContainer.innerHTML = '';
}

// Load Messages
async function loadMessages() {
  try {
    const response = await fetch(`${API_BASE}/messages`);
    const messages = await response.json();
    
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
      displayMessage(msg);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// Display Message
function displayMessage(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.className = msg.isImportant ? 'message important' : 'message';

  let content = `
    <div class="message-header">
      ${msg.username}
      ${msg.isImportant ? '<span class="important-badge">IMPORTANT</span>' : ''}
    </div>
    <div class="message-text">${escapeHtml(msg.text)}</div>
  `;

  if (msg.imageUrl && !isLowBandwidth) {
    content += `<img src="${msg.imageUrl}" alt="shared image" class="message-image">`;
  }

  if (msg.timestamp) {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    content += `<div class="message-time">${time}</div>`;
  }

  msgDiv.innerHTML = content;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Display System Message
function displaySystemMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'system-message';
  msgDiv.textContent = text;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
sendButton.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text && !window.pendingImageUrl) {
    return;
  }

  socket.emit('send_message', {
    username: currentUser.username,
    text: text || '(image)',
    imageUrl: window.pendingImageUrl || null
  });

  messageInput.value = '';
  window.pendingImageUrl = null;
  imageButton.textContent = '📎 Image';
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendButton.click();
  }
});

// Image Upload
imageButton.addEventListener('click', () => {
  imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.imageUrl) {
      window.pendingImageUrl = data.imageUrl;
      imageButton.textContent = '✓ Image Selected';
    }
  } catch (error) {
    alert('Error uploading image: ' + error.message);
  }

  imageInput.value = '';
});

// Low Bandwidth Toggle
lowBandwidthToggle.addEventListener('change', (e) => {
  isLowBandwidth = e.target.checked;
  
  // Reload messages based on bandwidth mode
  loadMessages();
});

// Summary Button
summaryButton.addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE}/summary`);
    const data = await response.json();
    
    summaryText.textContent = data.summary;
    summaryBox.style.display = 'block';
  } catch (error) {
    alert('Error fetching summary: ' + error.message);
  }
});

closeSummaryButton.addEventListener('click', () => {
  summaryBox.style.display = 'none';
});

// Logout
logoutButton.addEventListener('click', () => {
  currentUser = null;
  showAuth();
  socket.emit('user_leave', {});
});

// Socket Events
socket.on('receive_message', (msg) => {
  displayMessage(msg);
});

socket.on('user_joined', (data) => {
  displaySystemMessage(data.message);
});

socket.on('user_left', (data) => {
  displaySystemMessage(data.message);
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
