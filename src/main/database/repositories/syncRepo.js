const db = require('../index');

class SyncRepository {
  enqueue(operationType, entityId, payload) {
    const queueId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    db.prepare(`
      INSERT INTO sync_queue (queue_id, operation_type, entity_id, payload, retry_count, next_retry_at, status, created_at)
      VALUES (?, ?, ?, ?, 0, ?, 'pending', ?)
    `).run([queueId, operationType, entityId, payloadStr, now, now]);

    return this.getQueueItem(queueId);
  }

  getPendingItems(nowTimestamp = Date.now()) {
    return db.prepare(`
      SELECT * FROM sync_queue
      WHERE status IN ('pending', 'failed') AND next_retry_at <= ? AND retry_count < 6
      ORDER BY created_at ASC LIMIT 20
    `).all([nowTimestamp]);
  }

  getQueueItem(queueId) {
    return db.prepare('SELECT * FROM sync_queue WHERE queue_id = ?').get([queueId]);
  }

  markProcessing(queueId) {
    db.prepare("UPDATE sync_queue SET status = 'processing' WHERE queue_id = ?").run([queueId]);
  }

  markCompleted(queueId) {
    db.prepare("UPDATE sync_queue SET status = 'completed' WHERE queue_id = ?").run([queueId]);
  }

  markFailed(queueId, errorMessage, nextRetryDelayMs) {
    const nextRetryAt = Date.now() + nextRetryDelayMs;
    db.prepare(`
      UPDATE sync_queue
      SET status = 'failed', retry_count = retry_count + 1, next_retry_at = ?, error_message = ?
      WHERE queue_id = ?
    `).run([nextRetryAt, errorMessage, queueId]);
  }

  getQueueStats() {
    const stats = db.prepare(`
      SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status
    `).all();
    return stats;
  }
}

module.exports = new SyncRepository();
