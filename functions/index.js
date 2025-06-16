const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();
const db = getDatabase();

// Scheduled function: runs every 1 hour
exports.deleteOldMessages = onSchedule("every 60 minutes", async (event) => {
  const roomsRef = db.ref("rooms");
  const snapshot = await roomsRef.once("value");

  const now = Date.now();
  const cutoff = now - 72 * 60 * 60 * 1000; // 72 hours in ms

  snapshot.forEach((roomSnap) => {
    const roomId = roomSnap.key;
    const messages = roomSnap.child("messages");

    messages.forEach((msgSnap) => {
      const msg = msgSnap.val();
      const msgKey = msgSnap.key;

      if (msg.timestamp && msg.timestamp < cutoff) {
        db.ref(`rooms/${roomId}/messages/${msgKey}`).remove();
      }
    });
  });

  console.log("✅ Deleted messages older than 72 hours");
});
