import { $, $$, escapeHtml, getInitials } from '../utils/dom.js';
import { formatTime, formatDateSeparator } from '../utils/formatters.js';
import { state } from '../state.js';
import { openMediaViewer } from './mediaViewer.js';
import { showToast } from './toasts.js';
import { updateInfoPanelUI } from './infoPanel.js';

let countdownInterval = null;

export function initChatArea() {
  const emptyState = $('#chat-empty-state');
  const activeChatContainer = $('#active-chat-container');
  const btnToggleInfo = $('#btn-toggle-info');
  const btnSearchChat = $('#btn-search-chat');
  const chatSearchBar = $('#chat-search-bar');
  const chatSearchInput = $('#chat-search-input');
  const btnCloseSearch = $('#btn-close-chat-search');
  const chatHeaderInfo = $('#chat-header-info');

  // Lock overlay elements
  const lockOverlay = $('#chat-lock-overlay');
  const lockPinInput = $('#chat-lock-pin-input');
  const btnUnlockSubmit = $('#btn-unlock-chat-submit');
  const lockError = $('#chat-lock-error');
  const messagesContainer = $('#messages-container');
  const composerContainer = $('#chat-composer-container');
  const blockedBanner = $('#chat-blocked-banner');
  const btnUnblockBanner = $('#btn-unblock-banner');

  // Toggle Right Info Panel
  if (btnToggleInfo) {
    btnToggleInfo.addEventListener('click', () => {
      const infoPanel = $('#info-panel');
      if (infoPanel) {
        infoPanel.classList.toggle('collapsed');
      }
    });
  }

  // Clicking chat header opens info panel
  if (chatHeaderInfo) {
    chatHeaderInfo.addEventListener('click', () => {
      const infoPanel = $('#info-panel');
      if (infoPanel) {
        infoPanel.classList.remove('collapsed');
      }
    });
  }

  // Toggle in-chat search
  if (btnSearchChat) {
    btnSearchChat.addEventListener('click', () => {
      if (chatSearchBar) {
        chatSearchBar.style.display = chatSearchBar.style.display === 'none' ? 'flex' : 'none';
        if (chatSearchBar.style.display === 'flex' && chatSearchInput) {
          chatSearchInput.focus();
        }
      }
    });
  }

  if (btnCloseSearch) {
    btnCloseSearch.addEventListener('click', () => {
      if (chatSearchBar) chatSearchBar.style.display = 'none';
      renderMessages();
    });
  }

  if (chatSearchInput) {
    chatSearchInput.addEventListener('input', (e) => {
      renderMessages(e.target.value.trim());
    });
  }

  // Unlock Chat Submit Logic
  async function handleUnlockSubmit() {
    if (!state.activeChat || !lockPinInput) return;
    const pin = lockPinInput.value.trim();
    if (!pin) return;

    const res = await window.dryChat.chats.verifyLock({
      chatId: state.activeChat.chat_id,
      pin
    });

    if (res.valid) {
      if (lockError) lockError.style.display = 'none';
      state.unlockChat(state.activeChat.chat_id);
      showChatContent();
      await loadMessages(state.activeChat.chat_id);
      showToast('Chat unlocked.', 'success');
    } else {
      if (lockError) lockError.style.display = 'block';
      lockPinInput.value = '';
      lockPinInput.focus();
    }
  }

  if (btnUnlockSubmit) {
    btnUnlockSubmit.addEventListener('click', handleUnlockSubmit);
  }

  if (lockPinInput) {
    lockPinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUnlockSubmit();
      }
    });
  }

  // Unblock Banner Button
  if (btnUnblockBanner) {
    btnUnblockBanner.addEventListener('click', async () => {
      if (!state.activeChat || !state.currentUser) return;
      const parts = state.activeChat.chat_id.split('_');
      const otherUid = parts.find(p => p !== state.currentUser.uid);
      if (otherUid) {
        await window.dryChat.contacts.toggleBlock({
          ownerUserId: state.currentUser.uid,
          contactUserId: otherUid,
          blocked: 0
        });
        showToast(`Unblocked ${state.activeChat.title}`, 'info');
        updateInfoPanelUI(state.activeChat);
        state.emit('contact:blockedChanged', { contactUserId: otherUid, blocked: false });
      }
    });
  }

  function showChatContent() {
    if (lockOverlay) lockOverlay.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'flex';
    if (composerContainer) composerContainer.style.display = 'block';
  }

  function showLockOverlay() {
    if (lockOverlay) lockOverlay.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (composerContainer) composerContainer.style.display = 'none';
    if (lockError) lockError.style.display = 'none';
    if (lockPinInput) {
      lockPinInput.value = '';
      setTimeout(() => lockPinInput.focus(), 100);
    }
  }

  // State listeners
  state.on('activeChat:changed', async (chat) => {
    if (!chat) {
      if (emptyState) emptyState.style.display = 'flex';
      if (activeChatContainer) activeChatContainer.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContainer) activeChatContainer.style.display = 'flex';

    // Update Header
    $('#chat-header-name').textContent = chat.title || 'Conversation';
    $('#chat-header-avatar').textContent = getInitials(chat.title);

    // Check Lock
    if (chat.is_locked && !state.isChatUnlocked(chat.chat_id)) {
      showLockOverlay();
    } else {
      showChatContent();
      await loadMessages(chat.chat_id);
    }
  });

  state.on('messages:updated', () => {
    renderMessages();
  });

  // Listen to messages:expired event from backend
  if (window.dryChat && window.dryChat.on) {
    window.dryChat.on('messages:expired', (expiredList) => {
      if (Array.isArray(expiredList) && expiredList.length > 0) {
        const expiredIds = new Set(expiredList.map(e => e.message_id));
        state.setMessages(state.messages.filter(m => !expiredIds.has(m.message_id)));
      }
    });
  }
}

export async function loadMessages(chatId) {
  try {
    const res = await window.dryChat.messages.getByChat({ chatId, limit: 100 });
    if (res.success) {
      state.setMessages(res.messages);
      scrollToBottom();
    }
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

export function renderMessages(filter = '') {
  const container = $('#messages-container');
  if (!container) return;

  // Clear previous countdown interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  container.innerHTML = '';
  const currentUserId = state.currentUser ? state.currentUser.uid : '';

  const messagesToRender = filter
    ? state.messages.filter(m => m.content && m.content.toLowerCase().includes(filter.toLowerCase()))
    : state.messages;

  let lastDateStr = null;

  messagesToRender.forEach(msg => {
    // Check if date separator needed
    const dateStr = formatDateSeparator(msg.created_at);
    if (dateStr !== lastDateStr) {
      const sep = document.createElement('div');
      sep.className = 'date-separator';
      sep.innerHTML = `<span class="date-separator-badge">${dateStr}</span>`;
      container.appendChild(sep);
      lastDateStr = dateStr;
    }

    const isOutgoing = msg.sender_id === currentUserId;
    const row = document.createElement('div');
    row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
    row.dataset.messageId = msg.message_id;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

    // Disappearing message timer badge
    let timerBadgeHtml = '';
    if (msg.expires_at) {
      const remainingSec = Math.max(0, Math.round((msg.expires_at - Date.now()) / 1000));
      timerBadgeHtml = `
        <div class="message-timer-badge" data-expires="${msg.expires_at}" data-msg-id="${msg.message_id}" style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #F59E0B; margin-bottom: 4px; font-weight: 600;">
          <i class="bi bi-hourglass-split"></i>
          <span class="timer-countdown-text">${formatCountdown(remainingSec)}</span>
        </div>
      `;
    }

    // Reply quote preview
    let replyHtml = '';
    if (msg.reply_to_message_id && msg.reply_preview) {
      replyHtml = `
        <div class="reply-quote" data-target-id="${msg.reply_to_message_id}">
          <div style="font-weight: 600; font-size: 11px;">Reply</div>
          <div>${escapeHtml(msg.reply_preview)}</div>
        </div>
      `;
    }

    // Forwarded label
    let forwardedHtml = '';
    if (msg.is_forwarded) {
      forwardedHtml = `<div class="forwarded-tag"><i class="bi bi-forward-fill"></i> Forwarded</div>`;
    }

    // Media attachment preview
    let mediaHtml = '';
    if (msg.attachment) {
      const att = msg.attachment;
      if (att.media_type === 'video') {
        mediaHtml = `
          <div class="message-media-preview" data-att-id="${att.attachment_id}">
            <video src="${att.local_path || att.cloudinary_url}" controls preload="metadata"></video>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="message-media-preview" data-att-id="${att.attachment_id}">
            <img src="${att.local_path || att.cloudinary_url}" alt="Image" loading="lazy">
          </div>
        `;
      }
    }

    // Status icon
    let statusIcon = '';
    if (isOutgoing) {
      if (msg.sync_status === 'sending' || msg.sync_status === 'pending') {
        statusIcon = '<i class="bi bi-clock" title="Sending..."></i>';
      } else if (msg.sync_status === 'sent') {
        statusIcon = '<i class="bi bi-check" title="Sent"></i>';
      } else if (msg.sync_status === 'delivered') {
        statusIcon = '<i class="bi bi-check-all" title="Delivered"></i>';
      } else if (msg.sync_status === 'read') {
        statusIcon = '<i class="bi bi-check-all text-info" style="color: #60A5FA !important;" title="Read"></i>';
      } else if (msg.sync_status === 'failed') {
        statusIcon = '<i class="bi bi-exclamation-circle-fill text-danger" title="Failed to send"></i>';
      }
    }

    // Reactions bar
    let reactionsHtml = '';
    if (msg.reactions && msg.reactions.length > 0) {
      reactionsHtml = `
        <div class="reactions-bar">
          ${msg.reactions.map(r => `
            <span class="reaction-pill" data-emoji="${r.emoji}">
              ${r.emoji} ${r.count > 1 ? r.count : ''}
            </span>
          `).join('')}
        </div>
      `;
    }

    bubble.innerHTML = `
      ${timerBadgeHtml}
      ${forwardedHtml}
      ${replyHtml}
      ${mediaHtml}
      <div class="message-text">${escapeHtml(msg.content)}</div>
      <div class="message-meta">
        ${msg.edited ? '<span style="font-size: 9px; opacity: 0.7;">edited</span>' : ''}
        <span>${formatTime(msg.created_at)}</span>
        ${statusIcon}
      </div>
      ${reactionsHtml}
    `;

    // Click media to open fullscreen viewer
    const mediaEl = bubble.querySelector('.message-media-preview');
    if (mediaEl && msg.attachment) {
      mediaEl.addEventListener('click', () => {
        openMediaViewer({
          localPath: msg.attachment.local_path,
          cloudinaryUrl: msg.attachment.cloudinary_url,
          mediaType: msg.attachment.media_type
        });
      });
    }

    // Right-click context menu (Reply, Star, Copy, Delete)
    bubble.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showMessageContextMenu(e.clientX, e.clientY, msg);
    });

    row.appendChild(bubble);
    container.appendChild(row);
  });

  // Start Live Countdown Timer Interval for Disappearing Messages
  startCountdownWatcher();
}

function startCountdownWatcher() {
  const timerBadges = $$('.message-timer-badge');
  if (timerBadges.length === 0) return;

  countdownInterval = setInterval(() => {
    const now = Date.now();
    let hasExpired = false;

    timerBadges.forEach(badge => {
      const expiresAt = parseInt(badge.dataset.expires, 10);
      const remainingSec = Math.max(0, Math.round((expiresAt - now) / 1000));
      const countdownText = badge.querySelector('.timer-countdown-text');

      if (countdownText) {
        countdownText.textContent = formatCountdown(remainingSec);
      }

      if (remainingSec <= 0) {
        const msgId = badge.dataset.msgId;
        const row = $(`[data-message-id="${msgId}"]`);
        if (row && !row.classList.contains('disintegrating')) {
          row.classList.add('disintegrating');
          row.style.transition = 'all 0.6s ease';
          row.style.opacity = '0';
          row.style.transform = 'scale(0.85) translateY(-10px)';
          setTimeout(() => {
            row.remove();
          }, 600);
          hasExpired = true;
        }
      }
    });

    if (hasExpired) {
      // Clean up in background
      state.setMessages(state.messages.filter(m => !m.expires_at || m.expires_at > Date.now()));
    }
  }, 1000);
}

function formatCountdown(s) {
  if (s <= 0) return 'Expiring...';
  if (s >= 86400) return `${Math.round(s / 86400)}d`;
  if (s >= 3600) return `${Math.round(s / 3600)}h`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function showMessageContextMenu(x, y, msg) {
  const existing = $('#dc-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'dc-context-menu';
  menu.className = 'dc-context-menu';
  menu.style.position = 'fixed';
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;
  menu.style.zIndex = '9999';

  const isMyMsg = state.currentUser && msg.sender_id === state.currentUser.uid;

  menu.innerHTML = `
    <div class="dc-context-item" id="cmenu-reply"><i class="bi bi-reply-fill"></i> Reply</div>
    <div class="dc-context-item" id="cmenu-copy"><i class="bi bi-clipboard"></i> Copy Text</div>
    <div class="dc-context-item" id="cmenu-star"><i class="bi bi-star"></i> ${msg.is_starred ? 'Unstar' : 'Star'}</div>
    <div class="dc-context-divider"></div>
    <div class="dc-context-item" id="cmenu-del-me" style="color: var(--accent-badge);"><i class="bi bi-trash"></i> Delete for Me</div>
    ${isMyMsg ? '<div class="dc-context-item" id="cmenu-del-all" style="color: var(--accent-badge);"><i class="bi bi-trash-fill"></i> Delete for Everyone</div>' : ''}
  `;

  document.body.appendChild(menu);

  // Close on outside click
  const closeListener = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeListener);
    }
  };
  setTimeout(() => document.addEventListener('click', closeListener), 50);

  $('#cmenu-reply').addEventListener('click', () => {
    state.setReplyingTo(msg);
    menu.remove();
  });

  $('#cmenu-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(msg.content);
    showToast('Message copied to clipboard', 'info');
    menu.remove();
  });

  $('#cmenu-star').addEventListener('click', async () => {
    const newStatus = msg.is_starred ? 0 : 1;
    await window.dryChat.messages.toggleStar({ messageId: msg.message_id, isStarred: newStatus });
    msg.is_starred = newStatus;
    renderMessages();
    showToast(newStatus ? 'Message starred' : 'Message unstarred', 'info');
    menu.remove();
  });

  $('#cmenu-del-me').addEventListener('click', async () => {
    menu.remove();
    await window.dryChat.messages.delete({ messageId: msg.message_id, chatId: msg.chat_id, forEveryone: false });
    state.setMessages(state.messages.filter(m => m.message_id !== msg.message_id));
    if (state.activeChat) {
      await updateInfoPanelUI(state.activeChat);
    }
    showToast('Message deleted', 'info');
  });

  const delAll = $('#cmenu-del-all');
  if (delAll) {
    delAll.addEventListener('click', async () => {
      menu.remove();
      await window.dryChat.messages.delete({
        messageId: msg.message_id,
        chatId: msg.chat_id,
        forEveryone: true
      });
      msg.content = 'This message was deleted';
      msg.attachment = null;
      msg.attachment_id = null;
      msg.message_type = 'text';
      msg.deleted_for_everyone = 1;
      renderMessages();
      if (state.activeChat) {
        await updateInfoPanelUI(state.activeChat);
      }
      showToast('Message deleted for everyone', 'info');
    });
  }
}

export function scrollToBottom() {
  const container = $('#messages-container');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}
