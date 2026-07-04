import { adminAuth, adminDb } from './_utils/firebase-admin.js';

export default async function handler(req, res) {
  // Allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Security Check: Enforce token verification if CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret;
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid cron secret.' });
    }
  }

  try {
    const db = adminDb;
    const auth = adminAuth;

    // Calculate cutoff: 7 days ago
    const nowMs = Date.now();
    const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(sevenDaysAgoMs);

    console.log(`[NearBudy Cleanup] Starting cleanup. Cutoff date: ${cutoffDate.toISOString()}`);

    // Query 1: Users inactive for more than 7 days
    const inactiveUsersQuery = await db.collection('users')
      .where('lastActive', '<', cutoffDate)
      .get();

    // Query 2: Users created more than 7 days ago who don't have lastActive field
    const oldUsersQuery = await db.collection('users')
      .where('createdAt', '<', cutoffDate)
      .get();

    const inactiveUserIds = new Set();
    
    inactiveUsersQuery.forEach(doc => inactiveUserIds.add(doc.id));
    oldUsersQuery.forEach(doc => {
      const data = doc.data();
      if (!data.lastActive) {
        inactiveUserIds.add(doc.id);
      }
    });

    const userIdsArray = Array.from(inactiveUserIds);
    console.log(`[NearBudy Cleanup] Found ${userIdsArray.length} inactive users to delete.`);

    if (userIdsArray.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No inactive users found to clean up.', 
        deletedUsersCount: 0 
      });
    }

    // Deletion references collector
    const refsToDelete = [];
    const authDeletionPromises = [];

    // Helper: Queue doc reference for batch delete
    const queueDelete = (docRef) => {
      refsToDelete.push(docRef);
    };

    // Process each inactive user
    for (const userId of userIdsArray) {
      console.log(`[NearBudy Cleanup] Queuing deletion for user: ${userId}`);

      // 1. Queue User Profile document
      queueDelete(db.collection('users').doc(userId));

      // 2. Queue Firebase Auth account deletion
      authDeletionPromises.push(
        auth.deleteUser(userId)
          .then(() => ({ userId, success: true }))
          .catch((err) => {
            // If user doesn't exist in Auth, count as success/no-op
            if (err.code === 'auth/user-not-found') {
              return { userId, success: true, warning: 'Auth user not found' };
            }
            console.error(`[NearBudy Cleanup] Auth delete failed for ${userId}:`, err.message);
            return { userId, success: false, error: err.message };
          })
      );

      // 3. Queue connection requests sent by or received by this user
      const requestsSent = await db.collection('requests').where('fromId', '==', userId).get();
      requestsSent.forEach(doc => queueDelete(doc.ref));

      const requestsReceived = await db.collection('requests').where('toId', '==', userId).get();
      requestsReceived.forEach(doc => queueDelete(doc.ref));

      // 4. Queue chats participant
      const userChats = await db.collection('chats').where('users', 'array-contains', userId).get();
      for (const chatDoc of userChats.docs) {
        queueDelete(chatDoc.ref);

        // Also queue all subcollection messages in this chat
        const messages = await chatDoc.ref.collection('messages').get();
        messages.forEach(msgDoc => queueDelete(msgDoc.ref));
      }

      // 5. Queue notifications for or from this user
      const notifsFor = await db.collection('notifications').where('userId', '==', userId).get();
      notifsFor.forEach(doc => queueDelete(doc.ref));

      const notifsFrom = await db.collection('notifications').where('fromUserId', '==', userId).get();
      notifsFrom.forEach(doc => queueDelete(doc.ref));

      // 6. Queue reports filed by or against this user
      const reportsBy = await db.collection('reports').where('reporterId', '==', userId).get();
      reportsBy.forEach(doc => queueDelete(doc.ref));

      const reportsAgainst = await db.collection('reports').where('reportedId', '==', userId).get();
      reportsAgainst.forEach(doc => queueDelete(doc.ref));
    }

    // Execute Auth Account deletions concurrently
    console.log(`[NearBudy Cleanup] Deleting auth accounts...`);
    const authResults = await Promise.all(authDeletionPromises);
    const failedAuthDeletes = authResults.filter(r => !r.success);

    // Execute Firestore deletions in batches of 500
    console.log(`[NearBudy Cleanup] Committing Firestore deletions... Total docs queued: ${refsToDelete.length}`);
    const batchSize = 500;
    let batchCount = 0;
    
    for (let i = 0; i < refsToDelete.length; i += batchSize) {
      const batch = db.batch();
      const chunk = refsToDelete.slice(i, i + batchSize);
      
      chunk.forEach(ref => {
        batch.delete(ref);
      });

      await batch.commit();
      batchCount++;
      console.log(`[NearBudy Cleanup] Committed batch ${batchCount}/${Math.ceil(refsToDelete.length / batchSize)}`);
    }

    console.log(`[NearBudy Cleanup] Cleanup finished successfully.`);

    return res.status(200).json({
      success: true,
      message: `Successfully cleaned up ${userIdsArray.length} inactive users.`,
      deletedUsersCount: userIdsArray.length,
      deletedDocsCount: refsToDelete.length,
      failedAuthDeletions: failedAuthDeletes.length > 0 ? failedAuthDeletes : undefined
    });

  } catch (error) {
    console.error("[NearBudy Cleanup] Cleanup handler crashed:", error);
    return res.status(500).json({ 
      error: error.message || 'Server error occurred during cleanup execution.' 
    });
  }
}
