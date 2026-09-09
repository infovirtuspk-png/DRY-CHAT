/**
 * Dry Chat - Master Renderer Process Entry
 */
import { $ } from './utils/dom.js';
import { state } from './state.js';
import { initTitlebar } from './components/titlebar.js';
import { hideSplashScreen } from './components/splash.js';
import { initAuth } from './components/auth.js';
import { initSidebar, loadSidebarData } from './components/sidebar.js';
import { initChatArea, loadMessages } from './components/chatArea.js';
import { initComposer } from './components/composer.js';
import { initInfoPanel } from './components/infoPanel.js';
import { initMediaViewer } from './components/mediaViewer.js';
import { openNewChatModal, openNewGroupModal, openSettingsModal, closeModal } from './components/modals.js';
import { showToast } from './components/toasts.js';

async function bootstrap() {
  console.log('🚀 Initializing Dry Chat Windows Client...');

  // 1. Initialize Title bar and Media Viewer
  initTitlebar();
  initMediaViewer();

  // 2. Load stored settings & apply theme
  try {
    const settingsRes = await window.dryChat.settings.getAll();
    if (settingsRes.success && settingsRes.settings) {
      if (settingsRes.settings.theme) {
        state.setTheme(settingsRes.settings.theme);
      }
      if (settingsRes.settings.enterToSend !== undefined) {
        state.settings.enterToSend = settingsRes.settings.enterToSend;
      }
    }
  } catch (err) {
    console.warn('Could not load settings, using defaults:', err);
  }

  // 3. Check for existing authenticated session
  try {
    const sessionRes = await window.dryChat.auth.checkSession();

    setTimeout(() => {
      hideSplashScreen();

      if (sessionRes.authenticated && sessionRes.user) {
        state.setCurrentUser(sessionRes.user);
        startMainDashboard(sessionRes.user);
      } else {
        // Show Auth Container
        const authContainer = $('#auth-container');
        if (authContainer) authContainer.style.display = 'flex';
        initAuth((user) => {
          startMainDashboard(user);
        });
      }
    }, 600);
  } catch (err) {
    console.error('Session check failed:', err);
    hideSplashScreen();
    const authContainer = $('#auth-container');
    if (authContainer) authContainer.style.display = 'flex';
    initAuth((user) => {
      startMainDashboard(user);
    });
  }

  // 4. Register IPC Realtime Events
  window.dryChat.on('incoming:message', async (data) => {
    if (state.activeChat && state.activeChat.chat_id === data.chatId) {
      await loadMessages(data.chatId);
    }
    await loadSidebarData();
  });

  window.dryChat.on('notification:clicked', async ({ chatId }) => {
    const chat = state.chats.find(c => c.chat_id === chatId);
    if (chat) {
      state.setActiveChat(chat);
    }
  });

  window.dryChat.on('tray:openSettings', () => {
    openSettingsModal();
  });

  window.dryChat.on('tray:muteToggled', (muted) => {
    showToast(`Notifications ${muted ? 'muted' : 'unmuted'}`, 'info');
  });

  // 5. Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl + K: New Chat / Search 13-Digit ID
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openNewChatModal();
    }
    // Ctrl + Shift + N: New Group
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openNewGroupModal();
    }
    // Ctrl + ,: Settings
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      openSettingsModal();
    }
    // Esc: Close Modals
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

function startMainDashboard(user) {
  const mainDashboard = $('#main-dashboard');
  const authContainer = $('#auth-container');

  if (authContainer) authContainer.style.display = 'none';
  if (mainDashboard) mainDashboard.style.display = 'flex';

  // Initialize UI components
  initSidebar();
  initChatArea();
  initComposer();
  initInfoPanel();

  // Load chats & contacts
  loadSidebarData();

  // Empty state button
  const btnEmptyNewChat = $('#btn-empty-new-chat');
  if (btnEmptyNewChat) {
    btnEmptyNewChat.addEventListener('click', openNewChatModal);
  }
}

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', bootstrap);
