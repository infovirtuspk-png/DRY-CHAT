const registerAuthIpc = require('./authIpc');
const registerContactIpc = require('./contactIpc');
const registerChatIpc = require('./chatIpc');
const registerMessageIpc = require('./messageIpc');
const registerMediaIpc = require('./mediaIpc');
const registerGroupIpc = require('./groupIpc');
const registerSettingsIpc = require('./settingsIpc');
const registerWindowIpc = require('./windowIpc');
const logger = require('../utils/logger');

function registerAllIpc(mainWindow) {
  registerAuthIpc();
  registerContactIpc();
  registerChatIpc();
  registerMessageIpc();
  registerMediaIpc();
  registerGroupIpc();
  registerSettingsIpc();
  registerWindowIpc(mainWindow);
  logger.info('All IPC handlers registered successfully.');
}

module.exports = { registerAllIpc };
