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
let chatMode = 'direct';

// ============ AUTH ============

toggleAuthButton.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authTitle.textContent = isLoginMode ? 'Login' : 'Register';
  authButton.textContent = isLoginMode ? 'Login' : 'Register';
  toggleAuthButton.textContent = isLoginMode ? 'Create Account' : 'Back to Login';
});

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

    currentUser = { username, userId: String(data.userId) };
    showChat();

    // Register with socket server so the backend knows we are online
    socket.emit('user_login', { username: currentUser.username, userId: currentUser.userId });

    // Load all data on login
    await Promise.all([loadAllUsers(), loadConversations()]);
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// ============ DATA LOADING ============

// FIX: fetch ALL users from /users endpoint — not derived from conversations
async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    const users = await response.json();
    // Exclude ourselves
    allUsers = users.filter(u => String(u._id) !== currentUser.userId);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

async function loadConversations() {
  try {
    const response = await fetch(`${API_BASE}/conversations?userId=${currentUser.userId}`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    conversations = await response.json();
    renderConversations();
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

// ============ RENDER ============

function renderConversations() {
  conversationsList.innerHTML = '';
  if (conversations.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No conversations yet. Start one with ➕';
    empty.style.cssText = 'padding:16px;color:#888;font-size:14px;text-align:center;';
    conversationsList.appendChild(empty);
    return;
  }

  conversations.forEach(conv => {
    const isActive = currentConversation && conv._id === currentConversation._id;
    const div = document.createElement('div');
    div.className = `conversation-item${isActive ? ' active' : ''}`;
    div.dataset.convId = conv._id;

    const displayName = getConvDisplayName(conv);

    div.innerHTML = `
      <div class="conversation-avatar">${displayName.charAt(0).toUpperCase()}</div>
      <div class="conversation-info">
        <div class="conversation-name">${escapeHtml(displayName)}</div>
        <div class="conversation-preview">${escapeHtml(conv.lastMessage || 'No messages yet')}</div>
      </div>
    `;

    div.addEventListener('click', () => selectConversation(conv));
    conversationsList.appendChild(div);
  });
}

function getConvDisplayName(conv) {
  if (conv.type === 'direct') {
    const other = conv.members.find(m => String(m._id) !== currentUser.userId);
    return other ? other.username : 'Direct Message';
  }
  return conv.name || 'Group Chat';
}

// ============ CONVERSATION SELECTION ============

async function selectConversation(conv) {
  currentConversation = conv;

  // Update active state in sidebar
  document.querySelectorAll('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.convId === conv._id);
  });

  emptyState.style.display = 'none';
  chatView.style.display = 'flex';

  chatTitle.textContent = getConvDisplayName(conv);
  chatSubtitle.textContent = `${conv.members.length} member${conv.members.length !== 1 ? 's' : ''}`;

  socket.emit('join_conversation', {
    conversationId: conv._id,
    username: currentUser.username
  });

  await loadMessages(conv._id);
}

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

function displayMessage(msg) {
  const isSent = String(msg.userId) === currentUser.userId;
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isSent ? 'sent' : 'received'}${msg.isImportant ? ' important' : ''}`;

  let content = `<div class="message-bubble">`;
  if (!isSent) {
    content += `<strong>${escapeHtml(msg.username)}</strong><br>`;
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

// ============ SEND MESSAGE ============

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

// ============ IMAGE UPLOAD ============

imageButton.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
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

// ============ SUMMARY ============

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

// ============ NEW CHAT MODAL ============

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

// FIX: Uses allUsers (from /users endpoint) — shows ALL registered users,
// not just those from existing conversations
function renderChatMode() {
  directMsgBtn.classList.toggle('active', chatMode === 'direct');
  groupChatBtn.classList.toggle('active', chatMode === 'group');

  userList.innerHTML = '';
  groupForm.style.display = chatMode === 'group' ? 'block' : 'none';

  if (allUsers.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No other registered users found.';
    p.style.cssText = 'padding:12px;color:#888;font-size:14px;';
    userList.appendChild(p);
    return;
  }

  allUsers.forEach(user => {
    const div = document.createElement('div');
    div.className = 'user-item';
    if (selectedMembers.some(m => m._id === user._id)) {
      div.classList.add('selected');
    }

    div.textContent = user.username;

    div.addEventListener('click', async () => {
      if (chatMode === 'direct') {
        // FIX: Immediately create/open conversation on click in direct mode
        try {
          const response = await fetch(`${API_BASE}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'direct',
              members: [user._id],
              userId: currentUser.userId
            })
          });

          if (!response.ok) {
            const err = await response.json();
            alert(err.error || 'Failed to start conversation');
            return;
          }

          const conv = await response.json();
          newChatModal.style.display = 'none';
          await loadConversations();
          await selectConversation(conv);
        } catch (error) {
          alert('Error starting conversation: ' + error.message);
        }
      } else {
        // Group mode: toggle member selection
        const idx = selectedMembers.findIndex(m => m._id === user._id);
        if (idx === -1) {
          selectedMembers.push(user);
          div.classList.add('selected');
        } else {
          selectedMembers.splice(idx, 1);
          div.classList.remove('selected');
        }
        updateGroupMemberTags();
      }
    });

    userList.appendChild(div);
  });
}

function updateGroupMemberTags() {
  groupMembers.innerHTML = '';
  selectedMembers.forEach(member => {
    const tag = document.createElement('div');
    tag.className = 'member-tag';
    tag.innerHTML = `${escapeHtml(member.username)} <span class="remove">×</span>`;
    tag.querySelector('.remove').addEventListener('click', () => {
      selectedMembers = selectedMembers.filter(m => m._id !== member._id);
      updateGroupMemberTags();
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

    if (!response.ok) {
      const err = await response.json();
      alert(err.error || 'Failed to create group');
      return;
    }

    const conv = await response.json();
    newChatModal.style.display = 'none';
    groupName.value = '';
    selectedMembers = [];

    await loadConversations();
    await selectConversation(conv);
  } catch (error) {
    alert('Error creating group: ' + error.message);
  }
});

// ============ LOGOUT ============

logoutButton.addEventListener('click', () => {
  currentUser = null;
  currentConversation = null;
  allUsers = [];
  conversations = [];
  selectedMembers = [];
  authContainer.style.display = 'flex';
  chatContainer.style.display = 'none';
  emptyState.style.display = 'flex';
  chatView.style.display = 'none';
  messageInput.value = '';
  messagesArea.innerHTML = '';
  conversationsList.innerHTML = '';
});

function showChat() {
  authContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
}

// ============ SOCKET EVENTS ============

socket.on('receive_message', (msg) => {
  // Only display in the currently open conversation
  if (currentConversation && msg.conversationId === currentConversation._id) {
    displayMessage(msg);
  }
});

// Sidebar refresh when a message arrives in any conversation
socket.on('conversation_updated', async () => {
  await loadConversations();
});

// When someone starts a conversation with us — refresh sidebar
socket.on('new_conversation', async (conv) => {
  await loadConversations();
});

socket.on('user_typing', (data) => {
  typingText.textContent = `${data.username} is typing...`;
  typingIndicator.style.display = 'block';
});

socket.on('user_stop_typing', () => {
  typingIndicator.style.display = 'none';
});

// On reconnect (e.g. tab regains focus / network comes back),
// reload conversations so offline messages appear in sidebar
socket.on('connect', async () => {
  console.log('Connected to server');
  if (currentUser) {
    socket.emit('user_login', { username: currentUser.username, userId: currentUser.userId });
    await loadConversations();
    // If a conversation was open, reload its messages to catch anything received while offline
    if (currentConversation) {
      await loadMessages(currentConversation._id);
    }
  }
});

// ============ TYPING INDICATOR ============

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

// ============ HELPERS ============

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

window.addEventListener('click', (e) => {
  if (e.target === summaryModal) summaryModal.style.display = 'none';
  if (e.target === newChatModal) newChatModal.style.display = 'none';
});
