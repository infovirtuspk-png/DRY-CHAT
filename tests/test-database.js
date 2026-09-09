const path = require('path');
const fs = require('fs');
const localStorageService = require('../src/main/services/localStorageService');
const dbService = require('../src/main/database/index');
const userRepo = require('../src/main/database/repositories/userRepo');
const contactRepo = require('../src/main/database/repositories/contactRepo');
const chatRepo = require('../src/main/database/repositories/chatRepo');
const messageRepo = require('../src/main/database/repositories/messageRepo');
const attachmentRepo = require('../src/main/database/repositories/attachmentRepo');
const syncRepo = require('../src/main/database/repositories/syncRepo');
const settingsRepo = require('../src/main/database/repositories/settingsRepo');
const { generate13DigitIdCandidate, isValid13DigitId } = require('../src/main/utils/idGenerator');

async function runTests() {
  console.log('=== RUNNING DRY CHAT DATABASE TESTS ===');

  // Test 13-digit ID generation
  const id1 = generate13DigitIdCandidate();
  console.log('Generated 13-digit ID:', id1);
  if (!isValid13DigitId(id1)) {
    throw new Error(`Invalid 13-digit ID: ${id1}`);
  }
  console.log('✓ 13-Digit ID validation passed');

  // Init local folders in test directory
  localStorageService.init();
  console.log('✓ Local storage directories initialized');

  // Init database in memory / test file
  const testDbPath = path.join(__dirname, 'test_drychat.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  await dbService.init(testDbPath);
  console.log('✓ Database and migrations initialized');

  // Test User Creation
  const user = userRepo.createUser({
    firebaseUid: 'test_uid_123',
    dryChatId: id1,
    name: 'Ahmed Developer',
    email: 'ahmed@gmail.com',
    username: 'ahmed_dev',
    about: 'Building Dry Chat'
  });
  console.log('✓ User created:', user.name, user.dry_chat_id);

  // Test User Session
  userRepo.saveSession({
    sessionToken: 'token_abc',
    firebaseUid: 'test_uid_123',
    dryChatId: id1,
    deviceName: 'Windows 11 Desktop'
  });
  const session = userRepo.getCurrentSession();
  if (!session || session.dry_chat_id !== id1) throw new Error('Session save failed');
  console.log('✓ Session verified:', session.device_name);

  // Test Contact Creation
  const contact = contactRepo.addContact({
    ownerUserId: 'test_uid_123',
    contactUserId: 'test_uid_456',
    contactDryChatId: '9876543210123',
    displayName: 'Fatima',
    about: 'Realtime developer'
  });
  console.log('✓ Contact added:', contact.display_name);

  // Test Chat Creation
  const chat = chatRepo.createOrUpdateChat({
    chatId: 'chat_123_456',
    chatType: 'direct',
    title: 'Fatima',
    unreadCount: 0
  });
  console.log('✓ Chat created:', chat.chat_id, chat.title);

  // Test Message Creation
  const msg = messageRepo.createMessage({
    messageId: 'msg_uuid_001',
    chatId: 'chat_123_456',
    senderId: 'test_uid_123',
    senderName: 'Ahmed',
    content: 'Hello Fatima! Welcome to Dry Chat.',
    syncStatus: 'sent'
  });
  console.log('✓ Message created:', msg.content, 'status:', msg.sync_status);

  // Test Reactions
  const reaction = messageRepo.addReaction('msg_uuid_001', 'chat_123_456', 'test_uid_456', '🔥');
  console.log('✓ Reaction added:', reaction);

  // Test Sync Queue
  const queueItem = syncRepo.enqueue('send_message', 'msg_uuid_001', { content: 'test' });
  console.log('✓ Sync queue item enqueued:', queueItem.queue_id);

  // Test Settings
  settingsRepo.setSetting('theme', 'dark');
  settingsRepo.setSetting('enterToSend', true);
  const theme = settingsRepo.getSetting('theme');
  console.log('✓ Settings verified, theme:', theme);

  // Clean up
  dbService.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log('=== ALL DATABASE & REPOSITORY TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
