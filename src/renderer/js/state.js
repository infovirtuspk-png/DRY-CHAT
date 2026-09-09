/**
 * Dry Chat Global Client State Store
 */
class StateStore {
  constructor() {
    this.currentUser = null;
    this.activeChat = null;
    this.activeTab = 'chats'; // 'chats', 'contacts', 'archived', 'starred', 'settings'
    this.chats = [];
    this.contacts = [];
    this.messages = [];
    this.replyingTo = null;
    this.theme = 'dark';
    this.isOnline = true;
    this.unlockedChats = new Set();
    this.activeTimerSeconds = 0;
    this.settings = {
      enterToSend: true,
      soundEnabled: true,
      previewEnabled: true,
      theme: 'dark'
    };
    this.listeners = new Map();
  }

  unlockChat(chatId) {
    this.unlockedChats.add(chatId);
    this.emit('chat:unlocked', chatId);
  }

  isChatUnlocked(chatId) {
    return this.unlockedChats.has(chatId);
  }

  lockChat(chatId) {
    this.unlockedChats.delete(chatId);
    this.emit('chat:locked', chatId);
  }

  setTimerSeconds(seconds) {
    this.activeTimerSeconds = seconds;
    this.emit('timer:changed', seconds);
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.emit('user:changed', user);
  }

  setActiveChat(chat) {
    this.activeChat = chat;
    this.replyingTo = null;
    this.emit('activeChat:changed', chat);
  }

  setChats(chats) {
    this.chats = chats;
    this.emit('chats:updated', chats);
  }

  setContacts(contacts) {
    this.contacts = contacts;
    this.emit('contacts:updated', contacts);
  }

  setMessages(messages) {
    this.messages = messages;
    this.emit('messages:updated', messages);
  }

  addMessage(msg) {
    const exists = this.messages.some(m => m.message_id === msg.message_id);
    if (!exists) {
      this.messages.push(msg);
      this.emit('messages:updated', this.messages);
    }
  }

  updateMessageStatus(messageId, status) {
    const msg = this.messages.find(m => m.message_id === messageId);
    if (msg) {
      msg.sync_status = status;
      this.emit('messages:updated', this.messages);
    }
  }

  setReplyingTo(msg) {
    this.replyingTo = msg;
    this.emit('reply:changed', msg);
  }

  setTheme(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    this.emit('theme:changed', themeName);
  }

  setOnline(status) {
    this.isOnline = status;
    this.emit('connection:changed', status);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const arr = this.listeners.get(event) || [];
      this.listeners.set(event, arr.filter(cb => cb !== callback));
    };
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (err) {
        console.error(`State event error (${event}):`, err);
      }
    }
  }
}

export const state = new StateStore();
