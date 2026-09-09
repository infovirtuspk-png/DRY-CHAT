import { $, getInitials } from '../utils/dom.js';
import { state } from '../state.js';
import { showToast } from './toasts.js';
import { loadSidebarData } from './sidebar.js';
import { formatFileSize, formatTime, formatDateSeparator, format13DigitId } from '../utils/formatters.js';

/**
 * 1. User Profile Modal (View & Edit Profile)
 */
export function openProfileModal() {
  const modalContainer = $('#modal-container');
  if (!modalContainer || !state.currentUser) return;

  const user = state.currentUser;
  const formattedId = format13DigitId(user.dryChatId);

  modalContainer.innerHTML = `
    <div class="dc-modal-backdrop" id="profile-modal-backdrop">
      <div class="dc-modal-card" style="max-width: 480px;">
        <div class="dc-modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="bi bi-person-badge-fill" style="color: var(--accent-primary); font-size: 16px;"></i>
            <h3 style="font-size: 15px; font-weight: 700; margin: 0;">My Dry Chat Identity</h3>
          </div>
          <button class="header-action-btn" id="btn-close-modal" style="width: 28px; height: 28px;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="dc-modal-body" style="padding: 20px;">
          
          <!-- Luxury Holographic Digital ID Card -->
          <div class="digital-id-card">
            <div class="digital-id-watermark">DRY</div>
            <div class="digital-id-header">
              <div class="digital-id-brand">
                <i class="bi bi-shield-lock-fill" style="color: #60A5FA;"></i>
                <span>DRY CHAT PASSPORT</span>
              </div>
              <div class="digital-id-chip-icon"></div>
            </div>

            <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
              Permanent 13-Digit Numeric ID
            </div>
            
            <div class="digital-id-number-display">
              <span id="profile-view-id">${formattedId}</span>
              <button class="header-action-btn" id="btn-copy-my-id" title="Copy 13-Digit ID" style="width: 32px; height: 32px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #FFFFFF;">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>

            <div class="digital-id-footer">
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #64748B;">Account Holder</div>
                <div style="font-weight: 700; font-size: 13px; color: #F8FAFC;">${user.name}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 9px; text-transform: uppercase; color: #64748B;">Privacy Protocol</div>
                <div style="font-weight: 600; font-size: 11px; color: #34D399;"><i class="bi bi-check-circle-fill"></i> Anti-Enumeration</div>
              </div>
            </div>
          </div>

          <!-- Profile Edit Fields -->
          <form id="edit-profile-form">
            <div class="form-group">
              <label class="form-label"><i class="bi bi-person"></i> Full Display Name</label>
              <input type="text" id="edit-name" class="form-control-dc" value="${user.name || ''}" placeholder="Your display name" required>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label"><i class="bi bi-at"></i> Username (Optional)</label>
                <input type="text" id="edit-username" class="form-control-dc" value="${user.username || ''}" placeholder="username">
              </div>
              <div class="form-group">
                <label class="form-label"><i class="bi bi-envelope"></i> Email (Registered)</label>
                <input type="email" class="form-control-dc" value="${user.email || ''}" disabled style="opacity: 0.6; cursor: not-allowed;">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><i class="bi bi-chat-quote"></i> Bio / Status</label>
              <input type="text" id="edit-about" class="form-control-dc" value="${user.about || 'Available on Dry Chat'}" placeholder="Say something about yourself...">
            </div>

            <button type="submit" class="btn-dc-primary mt-3" id="btn-save-profile">
              <i class="bi bi-save2"></i> Update Profile Details
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  modalContainer.style.display = 'block';
  $('#btn-close-modal').addEventListener('click', closeModal);
  $('#profile-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'profile-modal-backdrop') closeModal();
  });

  // Copy ID
  $('#btn-copy-my-id').addEventListener('click', () => {
    navigator.clipboard.writeText(user.dryChatId);
    showToast(`Copied ID: ${formattedId}`, 'success');
  });

  // Save profile changes
  $('#edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = $('#edit-name').value.trim();
    const newUsername = $('#edit-username').value.trim();
    const newAbout = $('#edit-about').value.trim();
    const btnSave = $('#btn-save-profile');

    if (!newName) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    try {
      const res = await window.dryChat.auth.updateProfile({
        uid: user.uid,
        updates: {
          name: newName,
          username: newUsername,
          about: newAbout
        }
      });

      if (res.success && res.user) {
        state.setCurrentUser(res.user);
        showToast('Profile updated successfully!', 'success');
        closeModal();
      } else {
        showToast(res.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = '<i class="bi bi-save2"></i> Update Profile Details';
    }
  });
}

/**
 * 2. New Chat / Search 13-Digit ID Modal
 */
export function openNewChatModal() {
  const modalContainer = $('#modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="dc-modal-backdrop" id="new-chat-backdrop">
      <div class="dc-modal-card">
        <div class="dc-modal-header">
          <h3 style="font-size: 15px; font-weight: 600;"><i class="bi bi-search"></i> Search 13-Digit User ID</h3>
          <button class="header-action-btn" id="btn-close-modal" style="width: 28px; height: 28px;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="dc-modal-body">
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            Enter the exact 13-digit Dry Chat ID of the person you want to message.
          </p>
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <input type="text" id="modal-search-id" class="form-control-dc" placeholder="e.g. 1038472916502" maxlength="13" style="font-family: monospace; font-size: 14px;">
            <button class="btn-dc-primary" id="btn-modal-search" style="width: auto; padding: 0 16px;">Search</button>
          </div>
          <div id="modal-search-result" style="display: none; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px;">
            <!-- Result rendered dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;

  modalContainer.style.display = 'block';

  $('#btn-close-modal').addEventListener('click', closeModal);
  $('#new-chat-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'new-chat-backdrop') closeModal();
  });

  const searchInput = $('#modal-search-id');
  const btnSearch = $('#btn-modal-search');
  const resultContainer = $('#modal-search-result');

  btnSearch.addEventListener('click', async () => {
    const id = searchInput.value.trim();
    if (!/^[1-9]\d{12}$/.test(id)) {
      showToast('User ID must be exactly 13 digits.', 'error');
      return;
    }

    btnSearch.disabled = true;
    btnSearch.textContent = 'Searching...';

    try {
      const res = await window.dryChat.contacts.search13DigitId({ dryChatId: id });
      if (res.success && res.user) {
        const found = res.user;
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div class="avatar-placeholder avatar-sm">${getInitials(found.name)}</div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">${found.name}</div>
              <div class="user-id-badge" style="margin-top: 3px;">
                <i class="bi bi-shield-check"></i> ID: ${format13DigitId(found.dryChatId)}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${found.about || 'Available on Dry Chat'}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn-dc-primary" id="btn-modal-add-contact" style="font-size: 12px; padding: 6px 12px;">
              <i class="bi bi-person-plus"></i> Add Contact
            </button>
            <button class="btn-dc-primary" id="btn-modal-start-chat" style="font-size: 12px; padding: 6px 12px; background: var(--bg-surface-hover); color: var(--text-primary); border: 1px solid var(--border-color);">
              <i class="bi bi-chat-dots"></i> Message
            </button>
          </div>
        `;

        $('#btn-modal-add-contact').addEventListener('click', async () => {
          await window.dryChat.contacts.add({
            ownerUserId: state.currentUser.uid,
            contactUserId: found.uid,
            contactDryChatId: found.dryChatId,
            displayName: found.name,
            about: found.about
          });
          showToast(`Added ${found.name} to contacts!`, 'success');
          await loadSidebarData();
        });

        $('#btn-modal-start-chat').addEventListener('click', async () => {
          const chatId = [state.currentUser.uid, found.uid].sort().join('_');
          const chatRes = await window.dryChat.chats.createOrGet({
            chatId,
            chatType: 'direct',
            title: found.name
          });
          closeModal();
          await loadSidebarData();
          if (chatRes.success) state.setActiveChat(chatRes.chat);
        });

      } else {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `<div style="text-align: center; color: var(--accent-badge); font-size: 13px;"><i class="bi bi-exclamation-circle"></i> No user found with ID: ${id}</div>`;
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSearch.disabled = false;
      btnSearch.textContent = 'Search';
    }
  });
}

/**
 * 3. New Group Modal
 */
export function openNewGroupModal() {
  const modalContainer = $('#modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="dc-modal-backdrop" id="new-group-backdrop">
      <div class="dc-modal-card">
        <div class="dc-modal-header">
          <h3 style="font-size: 15px; font-weight: 600;"><i class="bi bi-people"></i> Create New Group</h3>
          <button class="header-action-btn" id="btn-close-modal" style="width: 28px; height: 28px;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="dc-modal-body">
          <div class="form-group">
            <label class="form-label">Group Name</label>
            <input type="text" id="grp-name" class="form-control-dc" placeholder="e.g. Project Developers" required>
          </div>
          <div class="form-group">
            <label class="form-label">Description (Optional)</label>
            <input type="text" id="grp-desc" class="form-control-dc" placeholder="Group topic or rules">
          </div>
          <button class="btn-dc-primary mt-3" id="btn-create-grp-submit">
            <i class="bi bi-check2-circle"></i> Create Group
          </button>
        </div>
      </div>
    </div>
  `;

  modalContainer.style.display = 'block';
  $('#btn-close-modal').addEventListener('click', closeModal);

  $('#btn-create-grp-submit').addEventListener('click', async () => {
    const name = $('#grp-name').value.trim();
    const description = $('#grp-desc').value.trim();
    if (!name) {
      showToast('Please enter a group name.', 'error');
      return;
    }

    try {
      const res = await window.dryChat.groups.create({
        name,
        description,
        ownerId: state.currentUser.uid
      });
      if (res.success) {
        showToast(`Group "${name}" created!`, 'success');
        closeModal();
        await loadSidebarData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/**
 * 4. Starred Messages Modal
 */
export async function openStarredMessagesModal() {
  const modalContainer = $('#modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="dc-modal-backdrop" id="starred-modal-backdrop">
      <div class="dc-modal-card" style="max-width: 550px;">
        <div class="dc-modal-header">
          <h3 style="font-size: 15px; font-weight: 600;"><i class="bi bi-star-fill text-warning"></i> Starred Messages</h3>
          <button class="header-action-btn" id="btn-close-modal" style="width: 28px; height: 28px;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="dc-modal-body" id="starred-messages-list" style="max-height: 450px;">
          <div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading starred messages...</div>
        </div>
      </div>
    </div>
  `;

  modalContainer.style.display = 'block';
  $('#btn-close-modal').addEventListener('click', closeModal);

  const list = $('#starred-messages-list');
  try {
    const res = await window.dryChat.messages.getStarred();
    if (res.success && res.messages && res.messages.length > 0) {
      list.innerHTML = '';
      res.messages.forEach(msg => {
        const item = document.createElement('div');
        item.style.background = 'var(--bg-surface)';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '8px';
        item.style.padding = '12px';
        item.style.marginBottom = '8px';
        item.style.cursor = 'pointer';

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
            <span style="font-weight: 600; color: var(--accent-primary);">${msg.sender_name || 'Sender'}</span>
            <span>${formatTime(msg.created_at)}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-primary);">${msg.content}</div>
        `;

        item.addEventListener('click', async () => {
          const chatRes = await window.dryChat.chats.createOrGet({ chatId: msg.chat_id, title: msg.chat_title || 'Chat' });
          closeModal();
          if (chatRes.success) {
            state.setActiveChat(chatRes.chat);
          }
        });

        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);"><i class="bi bi-star" style="font-size: 28px;"></i><p style="margin-top: 8px;">No starred messages yet.</p></div>';
    }
  } catch (err) {
    list.innerHTML = `<div style="color: var(--accent-badge); text-align: center;">${err.message}</div>`;
  }
}

/**
 * 5. Settings Modal (Appearance, Privacy, Storage, Security, About)
 */
export async function openSettingsModal() {
  const modalContainer = $('#modal-container');
  if (!modalContainer) return;

  // Fetch storage stats
  let storageUsage = { totalBytes: 0, images: { count: 0, size: 0 }, videos: { count: 0, size: 0 }, cache: { count: 0, size: 0 } };
  try {
    const sRes = await window.dryChat.settings.getStorageUsage();
    if (sRes.success) storageUsage = sRes.usage;
  } catch (err) {
    // ignore
  }

  modalContainer.innerHTML = `
    <div class="dc-modal-backdrop" id="settings-backdrop">
      <div class="dc-modal-card" style="max-width: 600px;">
        <div class="dc-modal-header">
          <h3 style="font-size: 15px; font-weight: 600;"><i class="bi bi-gear-fill"></i> Dry Chat Settings</h3>
          <button class="header-action-btn" id="btn-close-modal" style="width: 28px; height: 28px;"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="dc-modal-body" style="padding: 0;">
          <div style="display: flex; height: 440px;">
            <!-- Tabs -->
            <div style="width: 175px; background: var(--bg-surface); border-right: 1px solid var(--border-color); padding: 10px; display: flex; flex-direction: column; gap: 4px;">
              <button class="nav-tab-btn active" data-starget="appearance" style="justify-content: flex-start;"><i class="bi bi-palette"></i> Appearance</button>
              <button class="nav-tab-btn" data-starget="system" style="justify-content: flex-start;"><i class="bi bi-cpu"></i> System & Tray</button>
              <button class="nav-tab-btn" data-starget="privacy" style="justify-content: flex-start;"><i class="bi bi-shield-lock"></i> Privacy</button>
              <button class="nav-tab-btn" data-starget="storage" style="justify-content: flex-start;"><i class="bi bi-hdd"></i> Storage</button>
              <button class="nav-tab-btn" data-starget="about" style="justify-content: flex-start;"><i class="bi bi-info-circle"></i> About</button>
              <div style="flex: 1;"></div>
              <button class="nav-tab-btn" id="btn-logout" style="justify-content: flex-start; color: var(--accent-badge);"><i class="bi bi-box-arrow-left"></i> Sign Out</button>
            </div>

            <!-- Content Area -->
            <div style="flex: 1; padding: 20px; overflow-y: auto;" id="settings-content">
              
              <!-- Appearance Tab -->
              <div id="stab-appearance">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Theme Selection</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px;">
                  ${['dark', 'light', 'midnight', 'ocean', 'purple', 'emerald', 'sunset'].map(t => `
                    <button class="btn-dc-primary btn-theme-select ${state.theme === t ? 'active-theme' : ''}" data-theme-name="${t}" style="text-transform: capitalize; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); font-size: 12px; padding: 8px;">
                      ${t} Theme
                    </button>
                  `).join('')}
                </div>
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Chat Behavior</h4>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                  <input type="checkbox" id="chk-enter-send" ${state.settings.enterToSend ? 'checked' : ''}>
                  <span>Press Enter to send (Shift + Enter for new line)</span>
                </label>
              </div>

              <!-- System & Tray Tab -->
              <div id="stab-system" style="display: none;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;"><i class="bi bi-windows"></i> Windows & Tray Integration</h4>
                <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
                  <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; background: var(--bg-surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <input type="checkbox" id="chk-auto-launch" style="margin-top: 3px;" checked>
                    <div>
                      <div style="font-weight: 600;">Start with Windows (Run in Background)</div>
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Dry Chat will automatically launch minimized to the system tray when Windows boots so you never miss a message.
                      </div>
                    </div>
                  </label>

                  <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; background: var(--bg-surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <input type="checkbox" id="chk-notifications-mute" style="margin-top: 3px;">
                    <div>
                      <div style="font-weight: 600;">Mute All Notifications</div>
                      <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                        Silence desktop toast alerts and taskbar flashing while working or during meetings.
                      </div>
                    </div>
                  </label>

                  <div style="background: var(--bg-surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-weight: 600; margin-bottom: 6px;"><i class="bi bi-bell-fill" style="color: var(--accent-primary);"></i> System Tray Quick Actions</div>
                    <ul style="font-size: 12px; color: var(--text-muted); margin: 0; padding-left: 18px; line-height: 1.5;">
                      <li><strong>Click Tray Icon:</strong> Toggle show/hide Dry Chat window.</li>
                      <li><strong>Unread Flash:</strong> Tray icon blinks and shows badge when new messages arrive.</li>
                      <li><strong>Right-Click Menu:</strong> Access settings, mute toggle, media folder, and full quit.</li>
                      <li><strong>Close Button (X):</strong> Hides app to system tray without stopping background sync.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Storage Tab -->
              <div id="stab-storage" style="display: none;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Local Storage Overview</h4>
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span>Images:</span>
                    <span style="font-weight: 600;">${formatFileSize(storageUsage.images.size)} (${storageUsage.images.count} files)</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span>Videos:</span>
                    <span style="font-weight: 600;">${formatFileSize(storageUsage.videos.size)} (${storageUsage.videos.count} files)</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>Temporary Cache:</span>
                    <span style="font-weight: 600;">${formatFileSize(storageUsage.cache.size)}</span>
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button class="btn-dc-primary" id="btn-open-dc-folder" style="font-size: 12px; padding: 8px;">
                    <i class="bi bi-folder2-open"></i> Open Documents/Dry Chat/
                  </button>
                  <button class="btn-dc-primary" id="btn-clear-cache" style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); font-size: 12px; padding: 8px;">
                    <i class="bi bi-trash"></i> Clear Temporary Cache
                  </button>
                </div>
              </div>

              <!-- Privacy Tab -->
              <div id="stab-privacy" style="display: none;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Privacy Controls</h4>
                <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="chk-read-receipts" checked>
                    <span>Send Read Receipts</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="chk-typing-indicator" checked>
                    <span>Send Realtime Typing Indicators</span>
                  </label>
                  <div style="margin-top: 10px;">
                    <div style="font-weight: 600; margin-bottom: 6px;"><i class="bi bi-slash-circle-fill" style="color: #EF4444;"></i> Blocked Contacts</div>
                    <div id="settings-blocked-list" style="max-height: 120px; overflow-y: auto; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px;">
                      <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">Loading blocked contacts...</div>
                    </div>
                  </div>

                  <div style="margin-top: 10px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">13-Digit ID Privacy Protection</div>
                    <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
                      Dry Chat enforces strict anti-enumeration privacy. Other users cannot browse or enumerate the user directory; they can only find your profile by entering your exact 13-digit ID.
                    </p>
                  </div>
                </div>
              </div>

              <!-- About Tab -->
              <div id="stab-about" style="display: none;">
                <div style="text-align: center; margin-bottom: 12px;">
                  <img src="assets/icons/icon.svg" style="width: 44px; height: 44px; margin-bottom: 4px;">
                  <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Dry Chat Desktop</h4>
                  <p style="font-size: 11px; color: var(--accent-primary); font-weight: 600; margin-top: 2px;">
                    <i class="bi bi-shield-check"></i> Encrypted & Zero-Cloud-Storage Protocol
                  </p>
                </div>

                <!-- Developer & Company Info Card (Theme Adaptive Visibility) -->
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; margin-bottom: 10px; font-size: 12px; box-shadow: var(--shadow-sm);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary); font-size: 11px; font-weight: 500;">Developer:</span>
                    <span style="font-weight: 700; color: var(--text-primary);"><i class="bi bi-person-check-fill" style="color: var(--accent-primary); margin-right: 4px;"></i> Engineer Qasim Ahmad</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary); font-size: 11px; font-weight: 500;">Company:</span>
                    <span style="font-weight: 700; color: #10B981;"><i class="bi bi-building-fill-check" style="margin-right: 4px;"></i> Virtuspk</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 11px; font-weight: 500;">Official Email:</span>
                    <a href="mailto:info.virtuspk@gmail.com" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">
                      <i class="bi bi-envelope-at-fill" style="margin-right: 4px;"></i> info.virtuspk@gmail.com
                    </a>
                  </div>
                </div>

                <!-- Technical & Encryption Architecture -->
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.6; margin-bottom: 10px; color: var(--text-secondary);">
                  <div><strong style="color: var(--text-primary);"><i class="bi bi-lock-fill" style="color: var(--accent-primary);"></i> Encryption:</strong> End-to-End Encrypted Transport & Ephemeral Media</div>
                  <div><strong style="color: var(--text-primary);"><i class="bi bi-database-fill" style="color: var(--accent-primary);"></i> Storage:</strong> Local SQLite Persistence with Zero-Cloud Message Retention</div>
                  <div><strong style="color: var(--text-primary);"><i class="bi bi-cpu-fill" style="color: var(--accent-primary);"></i> Version:</strong> 1.0.0 Pro Edition (Windows 64-bit)</div>
                </div>

                <!-- Complete MIT License Section -->
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.5; color: var(--text-secondary);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-weight: 700; color: var(--text-primary);"><i class="bi bi-file-earmark-text-fill" style="color: var(--accent-primary);"></i> MIT License</span>
                    <span style="background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">Open Source</span>
                  </div>
                  <p style="margin: 0 0 4px 0; color: var(--text-muted); font-size: 10px; font-family: monospace;">
                    Copyright © 2026 Virtuspk. Developed by Engineer Qasim Ahmad.
                  </p>
                  <p style="margin: 0; color: var(--text-muted); font-size: 10px; line-height: 1.4;">
                    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files to use, copy, modify, merge, publish, and distribute without restriction, subject to the terms of the MIT License.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  modalContainer.style.display = 'block';
  $('#btn-close-modal').addEventListener('click', closeModal);

  // Switch settings tabs
  const tabBtns = modalContainer.querySelectorAll('.nav-tab-btn[data-starget]');
  tabBtns.forEach(b => {
    b.addEventListener('click', () => {
      tabBtns.forEach(btn => btn.classList.remove('active'));
      b.classList.add('active');
      const target = b.dataset.starget;
      ['appearance', 'system', 'storage', 'privacy', 'about'].forEach(t => {
        const el = $(`#stab-${t}`);
        if (el) el.style.display = t === target ? 'block' : 'none';
      });
    });
  });

  // Fetch initial auto launch status
  try {
    const isAutoLaunch = await window.dryChat.windowControls.getAutoLaunch();
    const chkAuto = $('#chk-auto-launch');
    if (chkAuto) chkAuto.checked = !!isAutoLaunch;
  } catch (e) {
    // ignore
  }

  // Auto-launch checkbox
  const chkAutoLaunch = $('#chk-auto-launch');
  if (chkAutoLaunch) {
    chkAutoLaunch.addEventListener('change', async (e) => {
      await window.dryChat.windowControls.setAutoLaunch({ enabled: e.target.checked });
      showToast(e.target.checked ? 'Auto-start on Windows boot enabled' : 'Auto-start on Windows boot disabled', 'info');
    });
  }

  // Mute notifications checkbox
  const chkMute = $('#chk-notifications-mute');
  if (chkMute) {
    chkMute.addEventListener('change', async (e) => {
      await window.dryChat.windowControls.setMuteNotifications({ muted: e.target.checked });
      showToast(e.target.checked ? 'Notifications muted' : 'Notifications enabled', 'info');
    });
  }

  // Render blocked contacts list in Privacy tab
  async function loadBlockedContactsList() {
    const listEl = $('#settings-blocked-list');
    if (!listEl || !state.currentUser) return;
    try {
      const res = await window.dryChat.contacts.getBlocked({ ownerUserId: state.currentUser.uid });
      if (res.success && Array.isArray(res.blocked) && res.blocked.length > 0) {
        listEl.innerHTML = '';
        res.blocked.forEach(b => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.justifyContent = 'space-between';
          row.style.padding = '6px 8px';
          row.style.borderBottom = '1px solid var(--border-color)';
          row.style.fontSize = '12px';

          row.innerHTML = `
            <div>
              <span style="font-weight: 600;">${b.display_name || 'Contact'}</span>
              <span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">${b.contact_dry_chat_id || ''}</span>
            </div>
            <button class="btn-dc-primary btn-unblock-row" data-uid="${b.contact_user_id}" style="padding: 2px 8px; font-size: 11px; width: auto; background: var(--bg-card); color: #34D399; border: 1px solid #34D399;">
              Unblock
            </button>
          `;

          row.querySelector('.btn-unblock-row').addEventListener('click', async () => {
            await window.dryChat.contacts.toggleBlock({
              ownerUserId: state.currentUser.uid,
              contactUserId: b.contact_user_id,
              blocked: 0
            });
            showToast(`Unblocked ${b.display_name}`, 'info');
            loadBlockedContactsList();
            state.emit('contact:blockedChanged', { contactUserId: b.contact_user_id, blocked: false });
          });

          listEl.appendChild(row);
        });
      } else {
        listEl.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">No blocked contacts</div>';
      }
    } catch (e) {
      listEl.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">No blocked contacts</div>';
    }
  }

  loadBlockedContactsList();

  // Theme selection buttons
  modalContainer.querySelectorAll('.btn-theme-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeName;
      state.setTheme(theme);
      window.dryChat.settings.set({ key: 'theme', value: theme });
      showToast(`Theme changed to ${theme}`, 'info');
    });
  });

  // Enter to send checkbox
  const chkEnter = $('#chk-enter-send');
  if (chkEnter) {
    chkEnter.addEventListener('change', (e) => {
      state.settings.enterToSend = e.target.checked;
      window.dryChat.settings.set({ key: 'enterToSend', value: e.target.checked });
    });
  }

  // Open Dry Chat Folder
  const btnOpenFolder = $('#btn-open-dc-folder');
  if (btnOpenFolder) {
    btnOpenFolder.addEventListener('click', () => {
      window.dryChat.settings.openDryChatFolder();
    });
  }

  // Clear cache
  const btnClearCache = $('#btn-clear-cache');
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      const res = await window.dryChat.settings.clearCache();
      showToast(`Cleared ${res.deletedCount || 0} temporary cache files.`, 'success');
    });
  }

  // Logout
  const btnLogout = $('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      closeModal();
      await window.dryChat.auth.logout();
      state.setCurrentUser(null);
      state.setActiveChat(null);
      $('#main-dashboard').style.display = 'none';
      $('#auth-container').style.display = 'flex';
      showToast('Signed out successfully.', 'info');
    });
  }
}

export function closeModal() {
  const modalContainer = $('#modal-container');
  if (modalContainer) {
    modalContainer.style.display = 'none';
    modalContainer.innerHTML = '';
  }
}
