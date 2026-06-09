import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDatabase, ref, set, get, update, remove, onValue } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { getAnalytics, logEvent } from 'firebase/analytics';

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStore = null;
let firebaseStorage = null;
let firebaseAnalytics = null;

const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const hasFirebaseConfig = () => {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId
  );
};

export const initializeFirebase = async () => {
  if (!hasFirebaseConfig()) {
    console.warn('Firebase: Configuration missing');
    return false;
  }

  try {
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
    } else {
      firebaseApp = initializeApp(getFirebaseConfig());
    }

    firebaseAuth = getAuth(firebaseApp);
    await setPersistence(firebaseAuth, browserLocalPersistence);

    firebaseDb = getDatabase(firebaseApp);
    firebaseStore = getFirestore(firebaseApp);
    firebaseStorage = getStorage(firebaseApp);
    
    if (typeof window !== 'undefined' && 'measurementId' in getFirebaseConfig()) {
      firebaseAnalytics = getAnalytics(firebaseApp);
    }

    console.log('Firebase: Initialized successfully');
    return true;
  } catch (error) {
    console.error('Firebase initialization failed:', error.message);
    return false;
  }
};

export const getFirebaseApp = () => firebaseApp;
export const getFirebaseAuth = () => firebaseAuth;
export const getFirebaseDatabase = () => firebaseDb;
export const getFirebaseFirestore = () => firebaseStore;
export const getFirebaseStorage = () => firebaseStorage;
export const getFirebaseAnalytics = () => firebaseAnalytics;

// ─── Firestore Functions ──────────────────────────────────────────────────────

export const setDocument = async (collectionName, documentId, data) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    await setDoc(doc(firebaseStore, collectionName, documentId), data, { merge: true });
    return { success: true, data };
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const getDocumentById = async (collectionName, documentId) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    const docSnap = await getDoc(doc(firebaseStore, collectionName, documentId));
    return { success: true, data: docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null };
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const updateDocumentByid = async (collectionName, documentId, data) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    await updateDoc(doc(firebaseStore, collectionName, documentId), data);
    return { success: true };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const deleteDocumentById = async (collectionName, documentId) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    await deleteDoc(doc(firebaseStore, collectionName, documentId));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const addDocumentToCollection = async (collectionName, data) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    const docRef = await addDoc(collection(firebaseStore, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

export const queryFirestoreCollection = async (collectionName, conditions = []) => {
  try {
    if (!firebaseStore) throw new Error('Firestore not initialized');
    let q = collection(firebaseStore, collectionName);

    if (conditions.length > 0) {
      const whereConditions = conditions.map(({ field, operator, value }) =>
        where(field, operator, value)
      );
      q = query(q, ...whereConditions);
    } else {
      q = query(q);
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data };
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

// ─── Realtime Database Functions ──────────────────────────────────────────────

export const setRealtimeData = async (path, data) => {
  try {
    if (!firebaseDb) throw new Error('Realtime Database not initialized');
    await set(ref(firebaseDb, path), data);
    return { success: true };
  } catch (error) {
    console.error(`Error setting realtime data at ${path}:`, error);
    return { success: false, error: error.message };
  }
};

export const getRealtimeData = async (path) => {
  try {
    if (!firebaseDb) throw new Error('Realtime Database not initialized');
    const snapshot = await get(ref(firebaseDb, path));
    return { success: true, data: snapshot.val() };
  } catch (error) {
    console.error(`Error getting realtime data from ${path}:`, error);
    return { success: false, error: error.message };
  }
};

export const updateRealtimeData = async (path, updates) => {
  try {
    if (!firebaseDb) throw new Error('Realtime Database not initialized');
    await update(ref(firebaseDb, path), updates);
    return { success: true };
  } catch (error) {
    console.error(`Error updating realtime data at ${path}:`, error);
    return { success: false, error: error.message };
  }
};

export const deleteRealtimeData = async (path) => {
  try {
    if (!firebaseDb) throw new Error('Realtime Database not initialized');
    await remove(ref(firebaseDb, path));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting realtime data at ${path}:`, error);
    return { success: false, error: error.message };
  }
};

export const subscribeToRealtimeData = (path, callback) => {
  try {
    if (!firebaseDb) throw new Error('Realtime Database not initialized');
    const unsubscribe = onValue(ref(firebaseDb, path), (snapshot) => {
      callback({ success: true, data: snapshot.val() });
    }, (error) => {
      console.error(`Error subscribing to ${path}:`, error);
      callback({ success: false, error: error.message });
    });
    return unsubscribe;
  } catch (error) {
    console.error(`Error in subscribeToRealtimeData:`, error);
    return () => {};
  }
};

// ─── Storage Functions ────────────────────────────────────────────────────────

export const uploadFile = async (storagePath, file) => {
  try {
    if (!firebaseStorage) throw new Error('Storage not initialized');
    const fileRef = storageRef(firebaseStorage, storagePath);
    await uploadBytes(fileRef, file);
    return { success: true, path: storagePath };
  } catch (error) {
    console.error(`Error uploading file to ${storagePath}:`, error);
    return { success: false, error: error.message };
  }
};

export const downloadFile = async (storagePath) => {
  try {
    if (!firebaseStorage) throw new Error('Storage not initialized');
    const fileRef = storageRef(firebaseStorage, storagePath);
    const fileBytes = await getBytes(fileRef);
    return { success: true, data: fileBytes };
  } catch (error) {
    console.error(`Error downloading file from ${storagePath}:`, error);
    return { success: false, error: error.message };
  }
};

export const deleteFile = async (storagePath) => {
  try {
    if (!firebaseStorage) throw new Error('Storage not initialized');
    await deleteObject(storageRef(firebaseStorage, storagePath));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting file at ${storagePath}:`, error);
    return { success: false, error: error.message };
  }
};

// ─── Analytics Functions ─────────────────────────────────────────────────────

export const trackEvent = (eventName, eventParams = {}) => {
  try {
    if (!firebaseAnalytics) return;
    logEvent(firebaseAnalytics, eventName, eventParams);
    return { success: true };
  } catch (error) {
    console.error(`Error tracking event ${eventName}:`, error);
    return { success: false, error: error.message };
  }
};

// ─── Authentication Listeners ────────────────────────────────────────────────

export const onAuthChange = (callback) => {
  if (!firebaseAuth) {
    console.warn('Auth not initialized');
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
};

export default {
  initializeFirebase,
  hasFirebaseConfig,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDatabase,
  getFirebaseFirestore,
  getFirebaseStorage,
  getFirebaseAnalytics,
  setDocument,
  getDocumentById,
  updateDocumentByid,
  deleteDocumentById,
  addDocumentToCollection,
  queryFirestoreCollection,
  setRealtimeData,
  getRealtimeData,
  updateRealtimeData,
  deleteRealtimeData,
  subscribeToRealtimeData,
  uploadFile,
  downloadFile,
  deleteFile,
  trackEvent,
  onAuthChange,
};
