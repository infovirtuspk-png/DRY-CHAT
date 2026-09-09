import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { showToast } from './toasts.js';
import { scrollToBottom, loadMessages } from './chatArea.js';
import { initEmojiPicker } from './emojiPicker.js';

let typingTimeout = null;

export function initComposer() {
  const textarea = $('#composer-textarea');
  const btnSend = $('#btn-send-message');
  const btnEmoji = $('#btn-toggle-emoji');
  const btnAttachment = $('#btn-attachment-menu');
  const btnTimer = $('#btn-toggle-timer');
  const timerPopover = $('#timer-picker-popover');
  const timerIndicator = $('#composer-timer-indicator');
  const timerLabel = $('#composer-timer-label');
  const btnDisableTimer = $('#btn-disable-composer-timer');
  const emojiPopover = $('#emoji-picker-popover');
  const replyContainer = $('#reply-preview-container');
  const replyToName = $('#reply-to-name');
  const replyToText = $('#reply-to-text');
  const btnCancelReply = $('#btn-cancel-reply');

  // Handle Reply State Change
  state.on('reply:changed', (msg) => {
    if (msg && replyContainer) {
      replyToName.textContent = `Replying to ${msg.sender_name || 'user'}`;
      replyToText.textContent = msg.content || 'Media message';
      replyContainer.style.display = 'flex';
      textarea.focus();
    } else if (replyContainer) {
      replyContainer.style.display = 'none';
    }
  });

  if (btnCancelReply) {
    btnCancelReply.addEventListener('click', () => {
      state.setReplyingTo(null);
    });
  }

  // Timer Indicator & Popover logic
  function updateTimerUI(seconds) {
    if (seconds > 0) {
      if (timerIndicator) timerIndicator.style.display = 'flex';
      if (timerLabel) timerLabel.textContent = formatTimerSecs(seconds);
      if (btnTimer) {
        btnTimer.style.color = '#F59E0B';
        btnTimer.title = `Disappearing Timer: ${formatTimerSecs(seconds)}`;
      }
    } else {
      if (timerIndicator) timerIndicator.style.display = 'none';
      if (btnTimer) {
        btnTimer.style.color = 'var(--text-secondary)';
        btnTimer.title = 'Disappearing Messages Timer';
      }
    }
  }

  state.on('timer:changed', (seconds) => {
    updateTimerUI(seconds);
  });

  state.on('activeChat:changed', (chat) => {
    const s = chat ? (chat.timer_seconds || 0) : 0;
    state.setTimerSeconds(s);
  });

  if (btnTimer && timerPopover) {
    btnTimer.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = timerPopover.style.display === 'block';
      timerPopover.style.display = isVisible ? 'none' : 'block';
      if (emojiPopover) emojiPopover.style.display = 'none';
    });

    timerPopover.querySelectorAll('.btn-set-timer-opt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const secs = parseInt(btn.dataset.seconds, 10) || 0;
        state.setTimerSeconds(secs);
        if (state.activeChat) {
          state.activeChat.timer_seconds = secs;
          await window.dryChat.chats.setTimer({ chatId: state.activeChat.chat_id, timerSeconds: secs });
        }
        timerPopover.style.display = 'none';
        showToast(secs > 0 ? `Self-destruct timer set to ${formatTimerSecs(secs)}` : 'Disappearing timer turned off', 'info');
      });
    });

    document.addEventListener('click', (e) => {
      if (!timerPopover.contains(e.target) && e.target !== btnTimer) {
        timerPopover.style.display = 'none';
      }
    });
  }

  if (btnDisableTimer) {
    btnDisableTimer.addEventListener('click', async () => {
      state.setTimerSeconds(0);
      if (state.activeChat) {
        state.activeChat.timer_seconds = 0;
        await window.dryChat.chats.setTimer({ chatId: state.activeChat.chat_id, timerSeconds: 0 });
      }
      showToast('Disappearing messages turned off', 'info');
    });
  }

  // Emoji Popover Toggle
  if (btnEmoji && emojiPopover) {
    btnEmoji.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = emojiPopover.style.display === 'flex';
      emojiPopover.style.display = isVisible ? 'none' : 'flex';
      if (timerPopover) timerPopover.style.display = 'none';
    });

    initEmojiPicker((emoji) => {
      if (textarea) {
        textarea.value += emoji;
        textarea.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!emojiPopover.contains(e.target) && e.target !== btnEmoji) {
        emojiPopover.style.display = 'none';
      }
    });
  }

  // Attachment Button (Pick & Upload ephemeral image/video)
  if (btnAttachment) {
    btnAttachment.addEventListener('click', async () => {
      if (!state.activeChat) {
        showToast('Please select a conversation first.', 'error');
        return;
      }

      try {
        const pickRes = await window.dryChat.media.pickFile({ mediaType: 'image' });
        if (pickRes.canceled || !pickRes.filePath) return;

        showToast('Uploading media to ephemeral transport...', 'info');

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const uploadRes = await window.dryChat.media.uploadEphemeral({
          sourceFilePath: pickRes.filePath,
          mediaType: pickRes.extension.includes('mp4') || pickRes.extension.includes('webm') ? 'video' : 'image',
          messageId
        });

        if (!uploadRes.success) {
          showToast(uploadRes.error || 'Media upload failed', 'error');
          return;
        }

        // Send message with attachment & timer
        await window.dryChat.messages.send({
          messageId,
          chatId: state.activeChat.chat_id,
          senderId: state.currentUser.uid,
          senderDryChatId: state.currentUser.dryChatId,
          senderName: state.currentUser.name,
          messageType: uploadRes.attachment.mediaType,
          content: pickRes.fileName,
          attachmentId: uploadRes.attachment.attachmentId,
          timerSeconds: state.activeTimerSeconds || 0
        });

        showToast('Media sent! Temporary remote copy will expire in 10s.', 'success');
        await loadMessages(state.activeChat.chat_id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Send Message Action
  async function handleSendMessage() {
    if (!state.activeChat) return;
    const content = textarea.value.trim();
    if (!content) return;

    textarea.value = '';
    textarea.style.height = 'auto';

    const replyMsg = state.replyingTo;
    state.setReplyingTo(null);

    const messageData = {
      chatId: state.activeChat.chat_id,
      senderId: state.currentUser.uid,
      senderDryChatId: state.currentUser.dryChatId,
      senderName: state.currentUser.name,
      messageType: 'text',
      content,
      replyToMessageId: replyMsg ? replyMsg.message_id : null,
      replyPreview: replyMsg ? replyMsg.content : null,
      timerSeconds: state.activeTimerSeconds || (state.activeChat.timer_seconds || 0)
    };

    try {
      const res = await window.dryChat.messages.send(messageData);
      if (res.success) {
        state.addMessage(res.message);
        scrollToBottom();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (btnSend) {
    btnSend.addEventListener('click', handleSendMessage);
  }

  // Keydown enter to send
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (state.settings.enterToSend) {
          e.preventDefault();
          handleSendMessage();
        }
      }
    });

    // Auto resize
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

      // Send typing indicator
      if (state.activeChat && state.currentUser) {
        window.dryChat.messages.setTyping({
          chatId: state.activeChat.chat_id,
          userId: state.currentUser.uid,
          isTyping: true
        });

        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          window.dryChat.messages.setTyping({
            chatId: state.activeChat.chat_id,
            userId: state.currentUser.uid,
            isTyping: false
          });
        }, 2000);
      }
    });
  }
}

function formatTimerSecs(s) {
  if (s >= 86400) return `${Math.round(s / 86400)}d`;
  if (s >= 3600) return `${Math.round(s / 3600)}h`;
  if (s >= 60) return `${Math.round(s / 60)}m`;
  return `${s}s`;
}
