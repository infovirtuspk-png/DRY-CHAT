const path = require('path');
const fs = require('fs');

async function main() {
  console.log('====================================================');
  console.log('       DRY CHAT FULL AUTOMATED TEST SUITE          ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: 13-Digit ID System
  console.log('[1] Testing 13-Digit User ID Generation & Format...');
  const { generate13DigitIdCandidate, isValid13DigitId } = require('../src/main/utils/idGenerator');
  const id1 = generate13DigitIdCandidate();
  const id2 = generate13DigitIdCandidate();
  assert(isValid13DigitId(id1), `Generated ID 1 is valid 13 digits (${id1})`);
  assert(isValid13DigitId(id2), `Generated ID 2 is valid 13 digits (${id2})`);
  assert(id1 !== id2, 'Generated IDs are unique and non-colliding');
  assert(!isValid13DigitId('12345'), 'Rejects short IDs');
  assert(!isValid13DigitId('12345678901234'), 'Rejects long IDs');
  assert(!isValid13DigitId('0123456789012'), 'Rejects IDs starting with 0');
  assert(!isValid13DigitId('1234567890abc'), 'Rejects non-numeric IDs');

  // TEST 2: Security & Path Traversal Protection
  console.log('\n[2] Testing Security, Path Traversal & Sanitization...');
  const { sanitizeFilePath, generateSafeFilename, validateMimeType, isSafeUrl, sanitizeText } = require('../src/main/utils/security');
  
  let pathBlocked = false;
  try {
    sanitizeFilePath('C:\\Users\\OFFICE\\Documents\\Dry Chat\\..\\..\\Windows\\System32\\calc.exe', 'C:\\Users\\OFFICE\\Documents\\Dry Chat');
  } catch (e) {
    pathBlocked = true;
  }
  assert(pathBlocked, 'Path traversal (..\\..\\) is blocked strictly');

  const safeFilename = generateSafeFilename('my_photo.PNG', 'img');
  assert(safeFilename.endsWith('.png') && safeFilename.startsWith('img_'), `Safe filename generated: ${safeFilename}`);

  assert(validateMimeType('image/png', 'image'), 'Accepts valid image MIME');
  assert(validateMimeType('video/mp4', 'video'), 'Accepts valid video MIME');
  assert(!validateMimeType('application/x-msdownload', 'image'), 'Rejects executable MIME');

  assert(isSafeUrl('https://example.com/photo.jpg'), 'Allows HTTPS URL');
  assert(!isSafeUrl('javascript:alert(1)'), 'Blocks javascript: protocol');

  const xssClean = sanitizeText('<script>alert("xss")</script>');
  assert(!xssClean.includes('<script>'), `XSS string sanitized properly: ${xssClean}`);

  // TEST 3: Database & Repositories
  console.log('\n[3] Testing SQLite Database, 7 Migrations & Repositories...');
  const dbService = require('../src/main/database/index');
  const userRepo = require('../src/main/database/repositories/userRepo');
  const chatRepo = require('../src/main/database/repositories/chatRepo');
  const messageRepo = require('../src/main/database/repositories/messageRepo');
  const attachmentRepo = require('../src/main/database/repositories/attachmentRepo');
  const syncRepo = require('../src/main/database/repositories/syncRepo');
  const contactRepo = require('../src/main/database/repositories/contactRepo');

  const testDbFile = path.join(__dirname, 'auto_test.db');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  await dbService.init(testDbFile);
  assert(dbService.initialized, 'Database initialized and all 7 migrations applied');

  const user = userRepo.createUser({
    firebaseUid: 'auto_uid_1',
    dryChatId: id1,
    name: 'Test Engineer',
    email: 'test@drychat.local',
    username: 'test_eng'
  });
  assert(user && user.dry_chat_id === id1, 'User created and retrieved from SQLite');

  const chat = chatRepo.createOrUpdateChat({
    chatId: 'chat_auto_001',
    chatType: 'direct',
    title: 'Automated Chat'
  });
  assert(chat && chat.title === 'Automated Chat', 'Chat conversation created');

  const msg = messageRepo.createMessage({
    messageId: 'msg_auto_101',
    chatId: 'chat_auto_001',
    senderId: 'auto_uid_1',
    content: 'Automated test message',
    syncStatus: 'sent'
  });
  assert(msg && msg.content === 'Automated test message', 'Message created and verified');

  const reaction = messageRepo.addReaction('msg_auto_101', 'chat_auto_001', 'auto_uid_1', '👍');
  assert(reaction.action === 'added', 'Emoji reaction added');

  const att = attachmentRepo.createAttachment({
    attachmentId: 'att_auto_201',
    messageId: 'msg_auto_101',
    mediaType: 'image',
    mimeType: 'image/png',
    originalName: 'photo.png',
    fileSize: 1024,
    cloudinaryPublicId: 'dry_chat_ephemeral/test_asset_1',
    cloudinaryUrl: 'https://res.cloudinary.com/bf2vcing/image/upload/test_asset_1.png',
    expiresAt: Date.now() + 10000,
    deletionStatus: 'pending'
  });
  assert(att && att.cloudinary_public_id === 'dry_chat_ephemeral/test_asset_1', 'Attachment record created with 10s expiration');

  const syncItem = syncRepo.enqueue('send_message', 'msg_auto_101', { content: 'test' });
  assert(syncItem && syncItem.status === 'pending', 'Sync queue item enqueued');

  // TEST 3.1: Block / Unblock System
  contactRepo.setBlocked('auto_uid_1', 'auto_uid_2', 1, '1234567890123', 'Qasim');
  assert(contactRepo.isBlocked('auto_uid_1', 'auto_uid_2') === true, 'Contact blocked successfully');
  contactRepo.setBlocked('auto_uid_1', 'auto_uid_2', 0);
  assert(contactRepo.isBlocked('auto_uid_1', 'auto_uid_2') === false, 'Contact unblocked successfully');

  // TEST 3.2: Chat PIN Lock
  chatRepo.setChatLock('chat_auto_001', 1, '1234');
  assert(chatRepo.verifyChatLock('chat_auto_001', '1234') === true, 'Chat PIN lock verified with correct PIN');
  assert(chatRepo.verifyChatLock('chat_auto_001', '9999') === false, 'Chat PIN lock rejects wrong PIN');
  chatRepo.setChatLock('chat_auto_001', 0, null);
  assert(chatRepo.verifyChatLock('chat_auto_001', 'anything') === true, 'Unlocked chat allows access');

  // TEST 3.3: Disappearing Timer & Purge
  const timedMsg = messageRepo.createMessage({
    messageId: 'msg_timed_001',
    chatId: 'chat_auto_001',
    senderId: 'auto_uid_1',
    content: 'Self-destructing text',
    timerSeconds: 1,
    expiresAt: Date.now() - 1000 // already expired for test
  });
  assert(timedMsg && timedMsg.timer_seconds === 1, 'Disappearing message created with timer');
  const purged = messageRepo.purgeExpiredMessages();
  assert(purged.some(p => p.message_id === 'msg_timed_001'), 'Expired message purged successfully');

  dbService.close();
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  // TEST 4: Zero-Call Constraint Audit
  console.log('\n[4] Performing Strict Zero-Call Feature Audit...');
  const appHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  const forbiddenKeywords = ['bi-telephone', 'bi-camera-video', 'startCall', 'videoCall', 'voiceCall', 'webrtc', 'callHistory'];
  let callFound = false;
  for (const kw of forbiddenKeywords) {
    if (appHtml.toLowerCase().includes(kw.toLowerCase())) {
      console.error(`Forbidden calling keyword found: ${kw}`);
      callFound = true;
    }
  }
  assert(!callFound, 'Zero calling features confirmed across frontend layout!');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
