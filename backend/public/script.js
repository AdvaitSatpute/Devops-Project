const socket = io();
const API_BASE = window.location.origin;

// State
let currentUser = null;
let allUsers = [];
let conversations = [];
let currentConversation = null;
let selectedMembers = [];

// DOM Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authTitle = document.getElementById('auth-title');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const authButton = document.getElementById('auth-button');
const toggleAuthButton = document.getElementById('toggle-auth-button');
const logoutButton = document.getElementById('logout-button');
const newChatButton = document.getElementById('new-chat-button');
const conversationsList = document.getElementById('conversations-list');
const messagesArea = document.getElementById('messages-area');
const chatView = document.getElementById('chat-view');
const emptyState = document.getElementById('empty-state');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const imageButton = document.getElementById('image-button');
const imageInput = document.getElementById('image-input');
const chatTitle = document.getElementById('chat-title');
const chatSubtitle = document.getElementById('chat-subtitle');
const summaryButton = document.getElementById('summary-button');
const summaryModal = document.getElementById('summary-modal');
const summaryText = document.getElementById('summary-text');
const closeSummaryBtn = document.getElementById('close-summary');
const newChatModal = document.getElementById('new-chat-modal');
const closeNewChatBtn = document.getElementById('close-new-chat');
const directMsgBtn = document.getElementById('direct-msg-btn');
const groupChatBtn = document.getElementById('group-chat-btn');
const userList = document.getElementById('user-list');
const groupForm = document.getElementById('group-form');
const groupName = document.getElementById('group-name');
const groupMembers = document.getElementById('group-members');
const createGroupBtn = document.getElementById('create-group-btn');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');

let isLoginMode = true;
let chatMode = 'direct'; // direct or group

// Auth Toggle
toggleAuthButton.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authTitle.textContent = isLoginMode ? 'Login' : 'Register';
  authButton.textContent = isLoginMode ? 'Login' : 'Register';
  toggleAuthButton.textContent = isLoginMode ? 'Create Account' : 'Back to Login';
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
    socket.emit('user_login', { username: currentUser.username, userId: currentUser.userId });
    
    await loadConversations();
    await loadAllUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// Load Conversations
async function loadConversations() {
  try {
    const response = await fetch(`${API_BASE}/conversations?userId=${currentUser.userId}`);
    conversations = await response.json();
    renderConversations();
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

// Load All Users
async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/conversations?userId=${currentUser.userId}`);
    const userConversations = await response.json();
    const userIds = new Set();
    
    userConversations.forEach(conv => {
      conv.members.forEach(member => {
        if (member._id !== currentUser.userId) {
          userIds.add(JSON.stringify(member));
        }
      });
    });

    allUsers = Array.from(userIds).map(u => JSON.parse(u));
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Render Conversations
function renderConversations() {
  conversationsList.innerHTML = '';
  conversations.forEach(conv => {
    const div = document.createElement('div');
    div.className = `conversation-item ${conv._id === currentConversation?._id ? 'active' : ''}`;
    
    const membersInfo = conv.members.map(m => m.username).join(', ');
    const displayName = conv.type === 'direct' 
      ? conv.members.find(m => m._id !== currentUser.userId)?.username || 'Direct Message'
      : conv.name;

    div.innerHTML = `
      <div class="conversation-avatar">${displayName.charAt(0).toUpperCase()}</div>
      <div class="conversation-info">
        <div class="conversation-name">${displayName}</div>
        <div class="conversation-preview">${conv.lastMessage || 'No messages'}</div>
      </div>
    `;

    div.addEventListener('click', () => selectConversation(conv));
    conversationsList.appendChild(div);
  });
}

// Select Conversation
async function selectConversation(conv) {
  currentConversation = conv;
  
  const convDiv = document.querySelector('.conversation-item.active');
  if (convDiv) convDiv.classList.remove('active');
  
  const activeDiv = Array.from(conversationsList.children)
    .find(el => el.textContent.includes(conv.name || ''));
  if (activeDiv) activeDiv.classList.add('active');

  emptyState.style.display = 'none';
  chatView.style.display = 'flex';

  // Update header
  const displayName = conv.type === 'direct'
    ? conv.members.find(m => m._id !== currentUser.userId)?.username || 'Direct Message'
    : conv.name;
  chatTitle.textContent = displayName;
  chatSubtitle.textContent = `${conv.members.length} members`;

  // Join room
  socket.emit('join_conversation', {
    conversationId: conv._id,
    username: currentUser.username
  });

  // Load messages
  await loadMessages(conv._id);
}

// Load Messages
async function loadMessages(conversationId) {
  try {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    const messages = await response.json();
    
    messagesArea.innerHTML = '';
    messages.forEach(msg => displayMessage(msg));
    messagesArea.scrollTop = messagesArea.scrollHeight;
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// Display Message
function displayMessage(msg) {
  const isSent = msg.userId === currentUser.userId;
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isSent ? 'sent' : 'received'} ${msg.isImportant ? 'important' : ''}`;

  let content = `<div class="message-bubble">`;
  if (!isSent) {
    content += `<strong>${msg.username}</strong><br>`;
  }
  content += escapeHtml(msg.text);
  if (msg.isImportant) {
    content += ` <span class="important-badge">!</span>`;
  }
  content += `</div>`;

  if (msg.imageUrl) {
    content += `<img src="${msg.imageUrl}" alt="image" class="message-image">`;
  }

  content += `<div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>`;
  msgDiv.innerHTML = content;
  messagesArea.appendChild(msgDiv);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Send Message
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !window.pendingImageUrl) return;
  if (!currentConversation) {
    alert('Select a conversation first');
    return;
  }

  socket.emit('send_message', {
    conversationId: currentConversation._id,
    userId: currentUser.userId,
    username: currentUser.username,
    text: text || '(image)',
    imageUrl: window.pendingImageUrl || null
  });

  messageInput.value = '';
  window.pendingImageUrl = null;
  imageButton.textContent = '📎';
}

// Image Upload
imageButton.addEventListener('click', () => imageInput.click());

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
      imageButton.textContent = '✓';
    }
  } catch (error) {
    alert('Error uploading image: ' + error.message);
  }

  imageInput.value = '';
});

// Summary
summaryButton.addEventListener('click', async () => {
  if (!currentConversation) return;
  try {
    const response = await fetch(`${API_BASE}/conversations/${currentConversation._id}/summary`);
    const data = await response.json();
    summaryText.textContent = data.summary;
    summaryModal.style.display = 'flex';
  } catch (error) {
    alert('Error fetching summary: ' + error.message);
  }
});

closeSummaryBtn.addEventListener('click', () => {
  summaryModal.style.display = 'none';
});

// New Chat Modal
newChatButton.addEventListener('click', () => {
  chatMode = 'direct';
  selectedMembers = [];
  renderChatMode();
  newChatModal.style.display = 'flex';
});

closeNewChatBtn.addEventListener('click', () => {
  newChatModal.style.display = 'none';
});

directMsgBtn.addEventListener('click', () => {
  chatMode = 'direct';
  selectedMembers = [];
  renderChatMode();
});

groupChatBtn.addEventListener('click', () => {
  chatMode = 'group';
  selectedMembers = [];
  renderChatMode();
});

function renderChatMode() {
  directMsgBtn.classList.toggle('active', chatMode === 'direct');
  groupChatBtn.classList.toggle('active', chatMode === 'group');
  
  userList.innerHTML = '';
  groupForm.style.display = chatMode === 'group' ? 'block' : 'none';

  const userIds = new Set();
  conversations.forEach(conv => {
    conv.members.forEach(member => {
      if (member._id !== currentUser.userId) {
        userIds.add(JSON.stringify(member));
      }
    });
  });

  const users = Array.from(userIds).map(u => JSON.parse(u));

  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-item';
    if (selectedMembers.some(m => m._id === user._id)) {
      div.classList.add('selected');
    }

    div.textContent = user.username;
    div.addEventListener('click', () => {
      const idx = selectedMembers.findIndex(m => m._id === user._id);
      if (idx === -1) {
        selectedMembers.push(user);
        div.classList.add('selected');
      } else {
        selectedMembers.splice(idx, 1);
        div.classList.remove('selected');
      }
      updateGroupMembers();
    });

    userList.appendChild(div);
  });
}

function updateGroupMembers() {
  groupMembers.innerHTML = '';
  selectedMembers.forEach(member => {
    const tag = document.createElement('div');
    tag.className = 'member-tag';
    tag.innerHTML = `${member.username} <span class="remove">×</span>`;
    tag.querySelector('.remove').addEventListener('click', () => {
      selectedMembers = selectedMembers.filter(m => m._id !== member._id);
      updateGroupMembers();
      renderChatMode();
    });
    groupMembers.appendChild(tag);
  });
}

createGroupBtn.addEventListener('click', async () => {
  if (selectedMembers.length === 0) {
    alert('Select at least one member');
    return;
  }

  const name = groupName.value.trim() || 'New Group';
  
  try {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: 'group',
        members: selectedMembers.map(m => m._id),
        userId: currentUser.userId
      })
    });

    const conv = await response.json();
    newChatModal.style.display = 'none';
    
    await loadConversations();
    await selectConversation(conv);
  } catch (error) {
    alert('Error creating group: ' + error.message);
  }
});

// Logout
logoutButton.addEventListener('click', () => {
  currentUser = null;
  currentConversation = null;
  authContainer.style.display = 'flex';
  chatContainer.style.display = 'none';
  messageInput.value = '';
  messagesArea.innerHTML = '';
});

// Show/Hide Chat
function showChat() {
  authContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
}

// Socket Events
socket.on('receive_message', (msg) => {
  if (msg.conversationId === currentConversation?._id) {
    displayMessage(msg);
  }
});

socket.on('conversation_updated', (data) => {
  loadConversations();
});

socket.on('user_typing', (data) => {
  typingText.textContent = `${data.username} is typing...`;
  typingIndicator.style.display = 'block';
});

socket.on('user_stop_typing', () => {
  typingIndicator.style.display = 'none';
});

socket.on('connect', () => {
  console.log('Connected to server');
});

// Typing indicator
let typingTimeout;
messageInput.addEventListener('input', () => {
  if (!currentConversation) return;
  
  socket.emit('typing', {
    conversationId: currentConversation._id,
    username: currentUser.username
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', {
      conversationId: currentConversation._id,
      username: currentUser.username
    });
  }, 1000);
});

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modals on outside click
window.addEventListener('click', (e) => {
  if (e.target === summaryModal) {
    summaryModal.style.display = 'none';
  }
  if (e.target === newChatModal) {
    newChatModal.style.display = 'none';
  }
});
