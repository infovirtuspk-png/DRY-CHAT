import { $, getInitials } from '../utils/dom.js';
import { state } from '../state.js';
import { showToast } from './toasts.js';
import { openMediaViewer } from './mediaViewer.js';
import { format13DigitId } from '../utils/formatters.js';
import { loadSidebarData } from './sidebar.js';

export function initInfoPanel() {
  const infoPanel = $('#info-panel');
  const btnCloseInfo = $('#btn-close-info');
  const btnCopyId = $('#btn-copy-info-id');
  const btnExport = $('#btn-export-chat');
  const btnClear = $('#btn-clear-chat');
  const btnToggleLock = $('#btn-toggle-lock-chat');
  const btnChatTimer = $('#btn-info-chat-timer');
  const btnToggleBlock = $('#btn-toggle-block-user');

  if (btnCloseInfo) {
    btnCloseInfo.addEventListener('click', () => {
      if (infoPanel) infoPanel.classList.add('collapsed');
    });
  }

  if (btnCopyId) {
    btnCopyId.addEventListener('click', () => {
      const idText = $('#info-user-id').textContent;
      if (idText) {
        navigator.clipboard.writeText(idText.replace(/\s+/g, ''));
        showToast(`Copied ID: ${idText}`, 'success');
      }
    });
  }

  // 1. Export Chat
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      if (!state.activeChat) return;
      const res = await window.dryChat.settings.exportChat({
        chatId: state.activeChat.chat_id,
        format: 'txt'
      });
      if (res.success) {
        showToast('Chat exported successfully!', 'success');
      }
    });
  }

  // 2. Clear Chat
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (!state.activeChat) return;
      if (confirm('Are you sure you want to clear all messages and media in this conversation?')) {
        await window.dryChat.chats.delete({ chatId: state.activeChat.chat_id });
        state.setMessages([]);
        await loadSidebarData();
        await loadMediaGallery(state.activeChat.chat_id);
        showToast('Conversation and media cleared', 'info');
      }
    });
  }

  // 3. Lock / Unlock Chat with PIN
  if (btnToggleLock) {
    btnToggleLock.addEventListener('click', async () => {
      if (!state.activeChat) return;
      const chat = state.activeChat;

      if (chat.is_locked) {
        // Unlock / Remove Lock
        const pin = prompt('Enter 4-digit PIN to remove Chat Lock:');
        if (!pin) return;
        const verifyRes = await window.dryChat.chats.verifyLock({ chatId: chat.chat_id, pin: pin.trim() });
        if (verifyRes.valid) {
          await window.dryChat.chats.setLock({ chatId: chat.chat_id, isLocked: 0, pin: null });
          chat.is_locked = 0;
          chat.lock_pin = null;
          state.unlockChat(chat.chat_id);
          updateInfoPanelUI(chat);
          loadSidebarData();
          showToast('Chat Lock removed successfully.', 'info');
        } else {
          showToast('Incorrect PIN code.', 'error');
        }
      } else {
        // Set new Lock PIN
        const pin = prompt('Set a 4-digit PIN code to lock this chat:');
        if (!pin) return;
        if (!/^\d{4}$/.test(pin.trim())) {
          showToast('PIN must be exactly 4 numeric digits.', 'warning');
          return;
        }
        await window.dryChat.chats.setLock({ chatId: chat.chat_id, isLocked: 1, pin: pin.trim() });
        chat.is_locked = 1;
        chat.lock_pin = pin.trim();
        state.unlockChat(chat.chat_id);
        updateInfoPanelUI(chat);
        loadSidebarData();
        showToast('Chat is now locked with PIN.', 'success');
      }
    });
  }

  // 4. Disappearing Messages Timer
  if (btnChatTimer) {
    btnChatTimer.addEventListener('click', async () => {
      if (!state.activeChat) return;
      const timerOptions = [
        { label: 'Off', seconds: 0 },
        { label: '5s', seconds: 5 },
        { label: '10s', seconds: 10 },
        { label: '30s', seconds: 30 },
        { label: '1m', seconds: 60 },
        { label: '5m', seconds: 300 },
        { label: '1h', seconds: 3600 },
        { label: '24h', seconds: 86400 }
      ];

      const current = state.activeChat.timer_seconds || 0;
      const currentIndex = timerOptions.findIndex(o => o.seconds === current);
      const nextOpt = timerOptions[(currentIndex + 1) % timerOptions.length];

      await window.dryChat.chats.setTimer({ chatId: state.activeChat.chat_id, timerSeconds: nextOpt.seconds });
      state.activeChat.timer_seconds = nextOpt.seconds;
      state.setTimerSeconds(nextOpt.seconds);
      updateInfoPanelUI(state.activeChat);
      showToast(`Disappearing messages set to: ${nextOpt.label}`, 'info');
    });
  }

  // 5. Block / Unblock Contact
  if (btnToggleBlock) {
    btnToggleBlock.addEventListener('click', async () => {
      if (!state.activeChat || !state.currentUser) return;
      const otherUid = getOtherUserId(state.activeChat, state.currentUser.uid);
      if (!otherUid) return;

      const isCurrentlyBlocked = await checkIsBlocked(otherUid);

      if (isCurrentlyBlocked) {
        await window.dryChat.contacts.toggleBlock({
          ownerUserId: state.currentUser.uid,
          contactUserId: otherUid,
          blocked: 0
        });
        showToast(`Unblocked ${state.activeChat.title}`, 'info');
      } else {
        if (!confirm(`Are you sure you want to block ${state.activeChat.title}? You will not receive any messages from them.`)) return;
        
        await window.dryChat.contacts.toggleBlock({
          ownerUserId: state.currentUser.uid,
          contactUserId: otherUid,
          blocked: 1,
          contactDryChatId: extract13DigitId(state.activeChat.chat_id),
          displayName: state.activeChat.title
        });
        showToast(`Blocked ${state.activeChat.title}`, 'warning');
      }

      updateInfoPanelUI(state.activeChat);
      state.emit('contact:blockedChanged', { contactUserId: otherUid, blocked: !isCurrentlyBlocked });
    });
  }

  // State update on activeChat change
  state.on('activeChat:changed', async (chat) => {
    if (!chat) return;
    await updateInfoPanelUI(chat);
  });
}

export async function updateInfoPanelUI(chat) {
  if (!chat) return;

  $('#info-name').textContent = chat.title || 'Chat';
  $('#info-avatar').textContent = getInitials(chat.title);
  
  const rawId = extract13DigitId(chat.chat_id);
  $('#info-user-id').textContent = rawId ? format13DigitId(rawId) : 'Group / Room';

  // Lock status
  const labelLock = $('#label-lock-chat');
  const btnToggleLock = $('#btn-toggle-lock-chat');
  if (labelLock && btnToggleLock) {
    if (chat.is_locked) {
      labelLock.textContent = '🔒 Chat Locked (Click to Remove)';
      btnToggleLock.style.borderColor = 'var(--accent-primary)';
    } else {
      labelLock.textContent = 'Lock Chat with PIN';
      btnToggleLock.style.borderColor = 'var(--border-color)';
    }
  }

  // Timer status
  const labelTimer = $('#label-info-chat-timer');
  if (labelTimer) {
    const s = chat.timer_seconds || 0;
    labelTimer.textContent = s > 0 ? `Disappearing Messages: ${formatTimerSecs(s)}` : 'Disappearing Messages: Off';
  }

  // Block status
  if (state.currentUser) {
    const otherUid = getOtherUserId(chat, state.currentUser.uid);
    const isBlocked = await checkIsBlocked(otherUid);
    const labelBlock = $('#label-block-user');
    const btnBlock = $('#btn-toggle-block-user');
    const blockedBanner = $('#chat-blocked-banner');

    if (labelBlock && btnBlock) {
      if (isBlocked) {
        labelBlock.textContent = 'Unblock User';
        btnBlock.style.color = '#34D399';
        btnBlock.style.borderColor = '#34D399';
      } else {
        labelBlock.textContent = 'Block User';
        btnBlock.style.color = '#EF4444';
        btnBlock.style.borderColor = 'var(--border-color)';
      }
    }

    if (blockedBanner) {
      blockedBanner.style.display = isBlocked ? 'flex' : 'none';
    }
  }

  // Load media gallery
  await loadMediaGallery(chat.chat_id);
}

function getOtherUserId(chat, currentUid) {
  if (!chat || !chat.chat_id) return null;
  if (chat.chat_type === 'direct' || chat.chat_id.includes('_')) {
    const parts = chat.chat_id.split('_');
    return parts.find(p => p !== currentUid) || null;
  }
  return null;
}

function extract13DigitId(str) {
  if (!str) return '';
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.length >= 13) return digits.slice(0, 13);
  return digits.padEnd(13, '0');
}

async function checkIsBlocked(otherUid) {
  if (!otherUid || !state.currentUser) return false;
  try {
    const res = await window.dryChat.contacts.getBlocked({ ownerUserId: state.currentUser.uid });
    if (res.success && Array.isArray(res.blocked)) {
      return res.blocked.some(b => b.contact_user_id === otherUid);
    }
  } catch (e) {
    // ignore
  }
  return false;
}

function formatTimerSecs(s) {
  if (s >= 86400) return `${Math.round(s / 86400)}d`;
  if (s >= 3600) return `${Math.round(s / 3600)}h`;
  if (s >= 60) return `${Math.round(s / 60)}m`;
  return `${s}s`;
}

async function loadMediaGallery(chatId) {
  const mediaGrid = $('#info-media-grid');
  if (!mediaGrid) return;

  mediaGrid.innerHTML = '';
  try {
    const res = await window.dryChat.media.getGallery({ chatId });
    if (res.success && res.media && res.media.length > 0) {
      res.media.forEach(item => {
        const el = document.createElement('div');
        el.style.width = '100%';
        el.style.aspectRatio = '1/1';
        el.style.borderRadius = '8px';
        el.style.overflow = 'hidden';
        el.style.cursor = 'pointer';
        el.style.background = 'var(--bg-surface)';
        el.style.border = '1px solid var(--border-color)';
        el.style.position = 'relative';

        const mediaSrc = item.local_path || item.cloudinary_url;

        if (item.media_type === 'video') {
          el.innerHTML = `
            <video src="${mediaSrc}" style="width:100%;height:100%;object-fit:cover;"></video>
            <div style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); padding: 2px 4px; border-radius: 4px; font-size: 9px; color: white;">
              <i class="bi bi-play-fill"></i>
            </div>
          `;
        } else {
          el.innerHTML = `
            <img src="${mediaSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='assets/icons/icon.svg';this.style.padding='12px';">
          `;
        }

        el.addEventListener('click', () => {
          openMediaViewer({
            localPath: item.local_path,
            cloudinaryUrl: item.cloudinary_url,
            mediaType: item.media_type
          });
        });

        mediaGrid.appendChild(el);
      });
    } else {
      mediaGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; font-size: 11px; color: var(--text-muted); padding: 12px 0;">No media shared yet</div>';
    }
  } catch (err) {
    console.error('Error loading gallery:', err);
  }
}
