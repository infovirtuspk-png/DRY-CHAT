import { $, $$, escapeHtml, getInitials } from '../utils/dom.js';
import { formatChatListTime, format13DigitId } from '../utils/formatters.js';
import { state } from '../state.js';
import { showToast } from './toasts.js';
import { openNewChatModal, openNewGroupModal, openSettingsModal, openProfileModal, openStarredMessagesModal } from './modals.js';

export function updateUserProfileUI(user) {
  if (!user) return;
  const nameEl = $('#sidebar-user-name');
  const idEl = $('#sidebar-id-text');
  const avatarEl = $('#sidebar-user-avatar');

  if (nameEl) nameEl.textContent = user.name || 'Dry Chat User';
  if (idEl) idEl.textContent = `ID: ${format13DigitId(user.dryChatId)}`;
  if (avatarEl) avatarEl.textContent = getInitials(user.name);
}

export function initSidebar() {
  const container = $('#chat-list-container');
  const searchInput = $('#sidebar-search-input');
  const userSummary = $('#sidebar-user-summary');
  const userIdBadge = $('#sidebar-user-id');
  const btnNewChat = $('#btn-new-chat');
  const btnNewGroup = $('#btn-new-group');
  const navTabs = $$('.nav-tab-btn');

  // Immediately populate profile if user is already present
  if (state.currentUser) {
    updateUserProfileUI(state.currentUser);
  }

  // 1-Click Copy on the 13-Digit ID Chip
  if (userIdBadge) {
    userIdBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.currentUser && state.currentUser.dryChatId) {
        navigator.clipboard.writeText(state.currentUser.dryChatId);
        showToast(`13-Digit ID Copied: ${state.currentUser.dryChatId}`, 'success');
      }
    });
  }

  // Click User Profile Header Card to open Profile Editor Modal
  if (userSummary) {
    userSummary.addEventListener('click', () => {
      openProfileModal();
    });
  }

  // New Chat / Search 13-digit ID button
  if (btnNewChat) {
    btnNewChat.addEventListener('click', () => {
      openNewChatModal();
    });
  }

  // New Group button
  if (btnNewGroup) {
    btnNewGroup.addEventListener('click', () => {
      openNewGroupModal();
    });
  }

  // Navigation tabs
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      navTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      state.activeTab = tab;

      if (tab === 'settings') {
        openSettingsModal();
      } else if (tab === 'starred') {
        openStarredMessagesModal();
      } else {
        loadSidebarData();
      }
    });
  });

  // Search input filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderChatList(e.target.value.trim());
    });
  }

  // Listen to state changes
  state.on('user:changed', (user) => {
    updateUserProfileUI(user);
  });

  state.on('chats:updated', () => {
    renderChatList();
  });
}

export async function loadSidebarData() {
  try {
    if (state.activeTab === 'archived') {
      const res = await window.dryChat.chats.getArchived();
      if (res.success) state.setChats(res.chats);
    } else if (state.activeTab === 'contacts') {
      const res = await window.dryChat.contacts.getAll({ ownerUserId: state.currentUser.uid });
      if (res.success) state.setContacts(res.contacts);
      renderContactsList();
      return;
    } else {
      const res = await window.dryChat.chats.getAll({ archived: 0 });
      if (res.success) state.setChats(res.chats);
    }
  } catch (err) {
    console.error('Error loading sidebar data:', err);
  }
}

export function renderChatList(filter = '') {
  const container = $('#chat-list-container');
  if (!container) return;

  // Sync tray unread badge
  const totalUnread = (state.chats || []).reduce((acc, c) => acc + (c.unread_count || 0), 0);
  if (window.dryChat && window.dryChat.windowControls && window.dryChat.windowControls.setTrayUnread) {
    window.dryChat.windowControls.setTrayUnread({ count: totalUnread });
  }

  const filtered = filter
    ? state.chats.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()) || (c.last_message_content && c.last_message_content.toLowerCase().includes(filter.toLowerCase())))
    : state.chats;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="bi bi-chat-square-text" style="font-size: 32px; opacity: 0.5;"></i>
        <p style="margin-top: 10px; font-size: 13px;">No conversations found.</p>
        <button class="btn-dc-primary mt-2" id="btn-sidebar-add" style="margin: 12px auto 0; width: auto; padding: 6px 14px; font-size: 12px;">
          <i class="bi bi-plus-lg"></i> Start New Chat
        </button>
      </div>
    `;
    const btnAdd = $('#btn-sidebar-add');
    if (btnAdd) btnAdd.addEventListener('click', openNewChatModal);
    return;
  }

  container.innerHTML = '';
  filtered.forEach(chat => {
    const item = document.createElement('div');
    const isActive = state.activeChat && state.activeChat.chat_id === chat.chat_id;
    item.className = `chat-item ${isActive ? 'active' : ''}`;
    
    const isLocked = Boolean(chat.is_locked);
    const lastMsg = isLocked ? '🔒 Locked Conversation' : (chat.last_message_content || 'No messages yet');

    item.innerHTML = `
      <div class="avatar-wrapper">
        <div class="avatar-placeholder avatar-sm">${getInitials(chat.title)}</div>
      </div>
      <div class="chat-item-content">
        <div class="chat-item-header">
          <div class="chat-item-title">${escapeHtml(chat.title)} ${isLocked ? '<i class="bi bi-shield-lock-fill" style="color: var(--accent-primary); font-size: 11px; margin-left: 4px;"></i>' : ''}</div>
          <div class="chat-item-time">${formatChatListTime(chat.last_message_time)}</div>
        </div>
        <div class="chat-item-footer">
          <div class="chat-item-lastmsg" style="${isLocked ? 'color: var(--text-muted); font-style: italic;' : ''}">${escapeHtml(lastMsg)}</div>
          <div style="display: flex; align-items: center; gap: 4px;">
            ${chat.timer_seconds > 0 ? `<i class="bi bi-hourglass-split" style="color: #F59E0B; font-size: 10px;" title="Disappearing Messages On"></i>` : ''}
            ${chat.unread_count > 0 ? `<div class="chat-item-badge">${chat.unread_count}</div>` : ''}
            ${chat.pinned ? `<i class="bi bi-pin-fill" style="color: var(--accent-primary); font-size: 11px;"></i>` : ''}
            ${chat.muted ? `<i class="bi bi-bell-slash-fill" style="color: var(--text-muted); font-size: 11px;"></i>` : ''}
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', async () => {
      state.setActiveChat(chat);
      if (chat.unread_count > 0) {
        await window.dryChat.chats.resetUnread({ chatId: chat.chat_id });
        chat.unread_count = 0;
        renderChatList();
      }
    });

    // Right click menu on chat item (Pin, Mute, Archive, Lock, Delete)
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showChatContextMenu(e.clientX, e.clientY, chat);
    });

    container.appendChild(item);
  });
}

function showChatContextMenu(x, y, chat) {
  const existingMenu = $('#dc-context-menu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'dc-context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 250)}px`;
  menu.style.background = 'var(--bg-sidebar)';
  menu.style.border = '1px solid var(--border-color)';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = 'var(--shadow-lg)';
  menu.style.padding = '6px';
  menu.style.zIndex = '99999';
  menu.style.fontSize = '12px';
  menu.style.minWidth = '170px';

  menu.innerHTML = `
    <div class="ctx-item" id="ctx-pin" style="padding: 6px 10px; cursor: pointer; border-radius: 4px;"><i class="bi bi-pin"></i> ${chat.pinned ? 'Unpin Chat' : 'Pin Chat'}</div>
    <div class="ctx-item" id="ctx-lock" style="padding: 6px 10px; cursor: pointer; border-radius: 4px;"><i class="bi bi-shield-lock"></i> ${chat.is_locked ? 'Remove PIN Lock' : 'Lock Chat (PIN)'}</div>
    <div class="ctx-item" id="ctx-mute" style="padding: 6px 10px; cursor: pointer; border-radius: 4px;"><i class="bi bi-bell-slash"></i> ${chat.muted ? 'Unmute' : 'Mute'}</div>
    <div class="ctx-item" id="ctx-archive" style="padding: 6px 10px; cursor: pointer; border-radius: 4px;"><i class="bi bi-archive"></i> ${chat.archived ? 'Unarchive' : 'Archive'}</div>
    <div class="ctx-item" id="ctx-delete-chat" style="padding: 6px 10px; cursor: pointer; border-radius: 4px; color: var(--accent-badge);"><i class="bi bi-trash"></i> Delete Conversation</div>
  `;

  document.body.appendChild(menu);

  $('#ctx-pin').addEventListener('click', async () => {
    await window.dryChat.chats.setPinned({ chatId: chat.chat_id, pinned: !chat.pinned });
    menu.remove();
    await loadSidebarData();
  });

  $('#ctx-lock').addEventListener('click', async () => {
    menu.remove();
    if (chat.is_locked) {
      const pin = prompt('Enter 4-digit PIN to unlock chat:');
      if (!pin) return;
      const res = await window.dryChat.chats.verifyLock({ chatId: chat.chat_id, pin: pin.trim() });
      if (res.valid) {
        await window.dryChat.chats.setLock({ chatId: chat.chat_id, isLocked: 0, pin: null });
        chat.is_locked = 0;
        state.unlockChat(chat.chat_id);
        await loadSidebarData();
        showToast('Chat PIN lock removed', 'info');
      } else {
        showToast('Incorrect PIN code', 'error');
      }
    } else {
      const pin = prompt('Set 4-digit PIN to lock chat:');
      if (!pin) return;
      if (!/^\d{4}$/.test(pin.trim())) {
        showToast('PIN must be 4 digits', 'warning');
        return;
      }
      await window.dryChat.chats.setLock({ chatId: chat.chat_id, isLocked: 1, pin: pin.trim() });
      chat.is_locked = 1;
      state.unlockChat(chat.chat_id);
      await loadSidebarData();
      showToast('Chat locked with PIN', 'success');
    }
  });

  $('#ctx-mute').addEventListener('click', async () => {
    await window.dryChat.chats.setMuted({ chatId: chat.chat_id, muted: !chat.muted });
    menu.remove();
    await loadSidebarData();
  });

  $('#ctx-archive').addEventListener('click', async () => {
    await window.dryChat.chats.setArchived({ chatId: chat.chat_id, archived: !chat.archived });
    menu.remove();
    await loadSidebarData();
  });

  $('#ctx-delete-chat').addEventListener('click', async () => {
    if (confirm(`Delete conversation "${chat.title}"?`)) {
      await window.dryChat.chats.delete({ chatId: chat.chat_id });
      if (state.activeChat && state.activeChat.chat_id === chat.chat_id) {
        state.setActiveChat(null);
      }
      menu.remove();
      await loadSidebarData();
      showToast('Conversation deleted', 'info');
    }
  });

  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 50);
}

function renderContactsList() {
  const container = $('#chat-list-container');
  if (!container) return;

  if (state.contacts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="bi bi-people" style="font-size: 32px; opacity: 0.5;"></i>
        <p style="margin-top: 10px; font-size: 13px;">No contacts added yet.</p>
        <button class="btn-dc-primary" id="btn-sidebar-add-contact" style="margin: 12px auto 0; width: auto; padding: 6px 14px; font-size: 12px;">
          <i class="bi bi-person-plus"></i> Add via 13-Digit ID
        </button>
      </div>
    `;
    const btn = $('#btn-sidebar-add-contact');
    if (btn) btn.addEventListener('click', openNewChatModal);
    return;
  }

  container.innerHTML = '';
  state.contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `
      <div class="avatar-wrapper">
        <div class="avatar-placeholder avatar-sm">${getInitials(contact.display_name)}</div>
      </div>
      <div class="chat-item-content">
        <div class="chat-item-header">
          <div class="chat-item-title">${escapeHtml(contact.display_name)}</div>
          <div style="font-size: 11px; color: var(--accent-secondary); font-family: monospace;">${contact.contact_dry_chat_id}</div>
        </div>
        <div class="chat-item-footer">
          <div class="chat-item-lastmsg">${escapeHtml(contact.about || 'Available on Dry Chat')}</div>
        </div>
      </div>
    `;

    item.addEventListener('click', async () => {
      const chatId = [state.currentUser.uid, contact.contact_user_id].sort().join('_');
      const chatRes = await window.dryChat.chats.createOrGet({
        chatId,
        chatType: 'direct',
        title: contact.display_name
      });
      if (chatRes.success) {
        state.activeTab = 'chats';
        $$('.nav-tab-btn').forEach(b => {
          if (b.dataset.tab === 'chats') b.classList.add('active');
          else b.classList.remove('active');
        });
        await loadSidebarData();
        state.setActiveChat(chatRes.chat);
      }
    });

    container.appendChild(item);
  });
}
