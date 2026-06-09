const express = require('express');
const {
  setDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryCollection,
  setRealtimeData,
  getRealtimeData,
  updateRealtimeData,
  deleteRealtimeData,
  logEvent,
  isPushConfigured,
} = require('../utils/firebaseUtils');
const { authenticate } = require('../middleware/auth');

const { logAudit } = require('../utils/audit');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    firebaseConfigured: isPushConfigured(),
    timestamp: new Date(),
  });
});

// Test-send endpoint: send a test notification to a saved userId or a direct token
router.post('/test-send', authenticate, async (req, res) => {
  const { userId, token, title, body, link } = req.body || {};
  if (!userId && !token) {
    return res.status(400).json({ message: 'Provide userId or token in request body.' });
  }

  const payload = {
    title: title || 'Test notification',
    body: body || 'This is a test notification sent from server.',
    link: link || '/',
    data: { test: '1', link: link || '/' },
  };

  try {
    if (token) {
      const { getMessaging } = require('../utils/firebaseUtils');
      const messaging = getMessaging();
      if (!messaging) return res.status(500).json({ message: 'Firebase Admin not configured.' });

      const message = {
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        webpush: {
          notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' },
          fcmOptions: { link: payload.link },
        },
      };

      const result = await messaging.send(message);
      return res.json({ message: 'Sent', result });
    }

    // send to userId by reusing pushNotifications helper
    const { sendPushToUser } = require('../utils/pushNotifications');
    const result = await sendPushToUser(userId, {
      title: payload.title,
      body: payload.body,
      link: payload.link,
      data: payload.data,
    });

    return res.json({ message: 'Queued', result });
  } catch (err) {
    console.error('Test send error:', err);
    return res.status(500).json({ message: err.message || 'Failed to send test notification.' });
  }
});

// Firestore endpoints
router.post('/firestore/:collection', authenticate, async (req, res) => {
  try {
    const { collection } = req.params;
    const { documentId, data } = req.body;

    if (!documentId || !data) {
      return res.status(400).json({ message: 'documentId and data are required' });
    }

    const result = await setDocument(collection, documentId, data);
    if (result.success) {
      return res.status(201).json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in POST /firestore:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/firestore/:collection/:documentId', authenticate, async (req, res) => {
  try {
    const { collection, documentId } = req.params;
    const result = await getDocument(collection, documentId);

    if (result.success) {
      return res.json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in GET /firestore:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/firestore/:collection/:documentId', authenticate, async (req, res) => {
  try {
    const { collection, documentId } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ message: 'data is required' });
    }

    const result = await updateDocument(collection, documentId, data);
    if (result.success) {
      return res.json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in PATCH /firestore:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/firestore/:collection/:documentId', authenticate, async (req, res) => {
  try {
    const { collection, documentId } = req.params;
    const result = await deleteDocument(collection, documentId);

    if (result.success) {
      return res.json({ message: 'Document deleted successfully' });
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in DELETE /firestore:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/firestore/:collection/query', authenticate, async (req, res) => {
  try {
    const { collection } = req.params;
    const { conditions } = req.body;

    const result = await queryCollection(collection, conditions || []);
    if (result.success) {
      return res.json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in POST /firestore/query:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Realtime Database endpoints
router.post('/realtime/*', authenticate, async (req, res) => {
  try {
    const path = req.params[0];
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ message: 'data is required' });
    }

    const result = await setRealtimeData(path, data);
    if (result.success) {
      return res.status(201).json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in POST /realtime:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/realtime/*', authenticate, async (req, res) => {
  try {
    const path = req.params[0];
    const result = await getRealtimeData(path);

    if (result.success) {
      return res.json(result.data);
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in GET /realtime:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/realtime/*', authenticate, async (req, res) => {
  try {
    const path = req.params[0];
    const { updates } = req.body;

    if (!updates) {
      return res.status(400).json({ message: 'updates are required' });
    }

    const result = await updateRealtimeData(path, updates);
    if (result.success) {
      return res.json({ message: 'Data updated successfully' });
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in PATCH /realtime:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/realtime/*', authenticate, async (req, res) => {
  try {
    const path = req.params[0];
    const result = await deleteRealtimeData(path);

    if (result.success) {
      return res.json({ message: 'Data deleted successfully' });
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in DELETE /realtime:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Analytics endpoint
router.post('/analytics/log', authenticate, async (req, res) => {
  try {
    const { eventName, eventData } = req.body;
    const userId = req.userId || req.user?.id;

    if (!eventName) {
      return res.status(400).json({ message: 'eventName is required' });
    }

    const result = await logEvent(userId, eventName, eventData || {});
    if (result.success) {
      return res.status(201).json({ message: 'Event logged successfully' });
    }
    res.status(500).json({ message: result.error });
  } catch (error) {
    console.error('Error in POST /analytics/log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Diagnostic endpoint for client push registration attempts
router.post('/diagnostic', authenticate, async (req, res) => {
  const { event, token, message } = req.body || {};
  const userId = req.user?.id || null;

  try {
    const shortToken = token ? String(token).slice(0, 16) : null;
    const details = `event=${event || 'unknown'} token=${shortToken || 'none'} message=${String(message || '').slice(0,200)}`;
    // non-blocking audit log
    try {
      logAudit('PUSH_DIAGNOSTIC', userId, null, details);
    } catch (e) {
      console.error('Failed to write diagnostic audit:', e);
    }

    return res.status(201).json({ message: 'Diagnostic logged' });
  } catch (err) {
    console.error('Diagnostic endpoint error:', err);
    return res.status(500).json({ message: 'Failed to log diagnostic' });
  }
});

module.exports = router;
