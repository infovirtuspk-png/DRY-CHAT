const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dryChat', {
  // Auth API
  auth: {
    checkSession: () => ipcRenderer.invoke('auth:checkSession'),
    register: (params) => ipcRenderer.invoke('auth:register', params),
    login: (params) => ipcRenderer.invoke('auth:login', params),
    logout: () => ipcRenderer.invoke('auth:logout'),
    forgotPassword: (params) => ipcRenderer.invoke('auth:forgotPassword', params),
    updateProfile: (params) => ipcRenderer.invoke('auth:updateProfile', params)
  },

  // Contacts API
  contacts: {
    search13DigitId: (params) => ipcRenderer.invoke('contact:search13DigitId', params),
    getAll: (params) => ipcRenderer.invoke('contact:getAll', params),
    add: (params) => ipcRenderer.invoke('contact:add', params),
    toggleFavorite: (params) => ipcRenderer.invoke('contact:toggleFavorite', params),
    toggleBlock: (params) => ipcRenderer.invoke('contact:toggleBlock', params),
    getBlocked: (params) => ipcRenderer.invoke('contact:getBlocked', params),
    remove: (params) => ipcRenderer.invoke('contact:remove', params)
  },

  // Chats API
  chats: {
    getAll: (options) => ipcRenderer.invoke('chat:getAll', options),
    getArchived: () => ipcRenderer.invoke('chat:getArchived'),
    createOrGet: (params) => ipcRenderer.invoke('chat:createOrGet', params),
    setPinned: (params) => ipcRenderer.invoke('chat:setPinned', params),
    setArchived: (params) => ipcRenderer.invoke('chat:setArchived', params),
    setMuted: (params) => ipcRenderer.invoke('chat:setMuted', params),
    resetUnread: (params) => ipcRenderer.invoke('chat:resetUnread', params),
    saveDraft: (params) => ipcRenderer.invoke('chat:saveDraft', params),
    getDraft: (params) => ipcRenderer.invoke('chat:getDraft', params),
    delete: (params) => ipcRenderer.invoke('chat:delete', params),
    setLock: (params) => ipcRenderer.invoke('chat:setLock', params),
    verifyLock: (params) => ipcRenderer.invoke('chat:verifyLock', params),
    setTimer: (params) => ipcRenderer.invoke('chat:setTimer', params)
  },

  // Messages API
  messages: {
    send: (params) => ipcRenderer.invoke('message:send', params),
    getByChat: (params) => ipcRenderer.invoke('message:getByChat', params),
    react: (params) => ipcRenderer.invoke('message:react', params),
    edit: (params) => ipcRenderer.invoke('message:edit', params),
    delete: (params) => ipcRenderer.invoke('message:delete', params),
    toggleStar: (params) => ipcRenderer.invoke('message:toggleStar', params),
    getStarred: () => ipcRenderer.invoke('message:getStarred'),
    search: (params) => ipcRenderer.invoke('message:search', params),
    setTyping: (params) => ipcRenderer.invoke('message:setTyping', params)
  },

  // Media API
  media: {
    pickFile: (params) => ipcRenderer.invoke('media:pickFile', params),
    uploadEphemeral: (params) => ipcRenderer.invoke('media:uploadEphemeral', params),
    downloadAndSave: (params) => ipcRenderer.invoke('media:downloadAndSave', params),
    getGallery: (params) => ipcRenderer.invoke('media:getGallery', params),
    showInFolder: (params) => ipcRenderer.invoke('media:showInFolder', params)
  },

  // Groups API
  groups: {
    create: (params) => ipcRenderer.invoke('group:create', params),
    getDetails: (params) => ipcRenderer.invoke('group:getDetails', params),
    addMember: (params) => ipcRenderer.invoke('group:addMember', params),
    removeMember: (params) => ipcRenderer.invoke('group:removeMember', params),
    updatePermissions: (params) => ipcRenderer.invoke('group:updatePermissions', params)
  },

  // Settings API
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (params) => ipcRenderer.invoke('settings:set', params),
    getPrivacy: (params) => ipcRenderer.invoke('settings:getPrivacy', params),
    updatePrivacy: (params) => ipcRenderer.invoke('settings:updatePrivacy', params),
    getStorageUsage: () => ipcRenderer.invoke('settings:getStorageUsage'),
    clearCache: () => ipcRenderer.invoke('settings:clearCache'),
    openDryChatFolder: () => ipcRenderer.invoke('settings:openDryChatFolder'),
    exportChat: (params) => ipcRenderer.invoke('settings:exportChat', params)
  },

  // Window Controls API
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    getAutoLaunch: () => ipcRenderer.invoke('window:getAutoLaunch'),
    setAutoLaunch: (params) => ipcRenderer.invoke('window:setAutoLaunch', params),
    setMuteNotifications: (params) => ipcRenderer.invoke('window:setMuteNotifications', params),
    showWindow: () => ipcRenderer.invoke('window:showWindow'),
    hideToTray: () => ipcRenderer.invoke('window:hideToTray'),
    quitApp: () => ipcRenderer.invoke('window:quitApp'),
    setTrayUnread: (params) => ipcRenderer.invoke('window:setTrayUnread', params)
  },

  // Event Listeners
  on: (channel, callback) => {
    const validChannels = [
      'notification:clicked',
      'sync:itemCompleted',
      'incoming:message',
      'presence:updated',
      'typing:updated',
      'tray:muteToggled',
      'tray:openSettings',
      'messages:expired'
    ];
    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
