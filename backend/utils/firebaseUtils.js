const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

let firebaseApp = null;

const normalizePrivateKey = (value) =>
  value ? String(value).replace(/\\n/g, '\n') : '';

const firebaseCredentials = () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
});

const isPushConfigured = () => {
  const creds = firebaseCredentials();
  return Boolean(creds.projectId && creds.clientEmail && creds.privateKey);
};

const initializeFirebaseAdmin = () => {
  if (!isPushConfigured()) {
    console.warn('Firebase Admin: Configuration missing. Push notifications disabled.');
    return null;
  }

  if (firebaseApp) return firebaseApp;

  try {
    const creds = firebaseCredentials();
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId: creds.projectId,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase Admin: Initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    return null;
  }
};

const getFirebaseAdmin = () => {
  return initializeFirebaseAdmin() || null;
};

const getDatabase = () => {
  const app = getFirebaseAdmin();
  return app ? admin.database(app) : null;
};

const getFirestore = () => {
  const app = getFirebaseAdmin();
  return app ? admin.firestore(app) : null;
};

const getMessaging = () => {
  const app = getFirebaseAdmin();
  return app ? admin.messaging(app) : null;
};

// Firestore operations
const setDocument = async (collectionName, documentId, data) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    await firestore.collection(collectionName).doc(documentId).set(data, { merge: true });
    return { success: true, data };
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error.message);
    return { success: false, error: error.message };
  }
};

const getDocument = async (collectionName, documentId) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    const doc = await firestore.collection(collectionName).doc(documentId).get();
    return { success: true, data: doc.exists ? doc.data() : null };
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error.message);
    return { success: false, error: error.message };
  }
};

const updateDocument = async (collectionName, documentId, data) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    await firestore.collection(collectionName).doc(documentId).update(data);
    return { success: true, data };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error.message);
    return { success: false, error: error.message };
  }
};

const deleteDocument = async (collectionName, documentId) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    await firestore.collection(collectionName).doc(documentId).delete();
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error.message);
    return { success: false, error: error.message };
  }
};

const queryCollection = async (collectionName, conditions = []) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    let query = firestore.collection(collectionName);
    
    for (const { field, operator, value } of conditions) {
      query = query.where(field, operator, value);
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data };
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Realtime Database operations
const setRealtimeData = async (path, data) => {
  try {
    const database = getDatabase();
    if (!database) throw new Error('Realtime Database not initialized');
    await database.ref(path).set(data);
    return { success: true, data };
  } catch (error) {
    console.error(`Error setting realtime data at ${path}:`, error.message);
    return { success: false, error: error.message };
  }
};

const getRealtimeData = async (path) => {
  try {
    const database = getDatabase();
    if (!database) throw new Error('Realtime Database not initialized');
    const snapshot = await database.ref(path).once('value');
    return { success: true, data: snapshot.val() };
  } catch (error) {
    console.error(`Error getting realtime data from ${path}:`, error.message);
    return { success: false, error: error.message };
  }
};

const updateRealtimeData = async (path, updates) => {
  try {
    const database = getDatabase();
    if (!database) throw new Error('Realtime Database not initialized');
    await database.ref(path).update(updates);
    return { success: true };
  } catch (error) {
    console.error(`Error updating realtime data at ${path}:`, error.message);
    return { success: false, error: error.message };
  }
};

const deleteRealtimeData = async (path) => {
  try {
    const database = getDatabase();
    if (!database) throw new Error('Realtime Database not initialized');
    await database.ref(path).remove();
    return { success: true };
  } catch (error) {
    console.error(`Error deleting realtime data at ${path}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Analytics
const logEvent = async (userId, eventName, eventData) => {
  try {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not initialized');
    
    await firestore.collection('analytics').add({
      userId,
      eventName,
      eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error logging analytics event:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  getDatabase,
  getFirestore,
  getMessaging,
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
};
