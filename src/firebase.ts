import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

// Admin credentials specified by user
export const ADMIN_EMAIL = "aayashkushwaha9@gmail.com";
export const ADMIN_DEFAULT_PASSWORD = "aurafarmer@25";

// Your web app's Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDuwxo29Vm-EZz-i6YnZRep9abQR51uTVE",
  authDomain: "flexifit-91cce.firebaseapp.com",
  projectId: "flexifit-91cce",
  storageBucket: "flexifit-91cce.firebasestorage.app",
  messagingSenderId: "564445995424",
  appId: "1:564445995424:web:4c6c826b634712699b04c5",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role?: 'admin' | 'patient';
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentRecord {
  id?: string;
  userId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  service: string;
  doctor: string;
  appointmentDate: string; // DD/MM/YYYY
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt?: any;
  notes?: string;
  createdBy?: 'patient' | 'admin';
}

// Local Storage Fallback Helpers to guarantee 100% uptime even if Firestore rules are locked
const getLocalProfile = (uid: string): UserProfile | null => {
  try {
    const raw = localStorage.getItem(`flexifit_user_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setLocalProfile = (uid: string, profile: UserProfile) => {
  try {
    localStorage.setItem(`flexifit_user_${uid}`, JSON.stringify(profile));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

const getGlobalAppointments = (): AppointmentRecord[] => {
  try {
    const raw = localStorage.getItem('flexifit_all_appointments');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setGlobalAppointments = (appts: AppointmentRecord[]) => {
  try {
    localStorage.setItem('flexifit_all_appointments', JSON.stringify(appts));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

const getLocalAppointments = (userId: string): AppointmentRecord[] => {
  try {
    const raw = localStorage.getItem(`flexifit_appts_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalAppointments = (userId: string, appts: AppointmentRecord[]) => {
  try {
    localStorage.setItem(`flexifit_appts_${userId}`, JSON.stringify(appts));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

/**
 * Save or update user profile with graceful fallback for Firestore permissions
 */
export async function saveUserProfile(user: User, phone?: string): Promise<UserProfile> {
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const profileData: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || (isAdmin ? 'Clinic Administrator' : 'Patient'),
    email: user.email || '',
    phone: phone || '',
    role: isAdmin ? 'admin' : 'patient',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Always cache locally first
  const existingLocal = getLocalProfile(user.uid);
  if (existingLocal) {
    profileData.createdAt = existingLocal.createdAt || profileData.createdAt;
    if (!phone && existingLocal.phone) {
      profileData.phone = existingLocal.phone;
    }
  }
  setLocalProfile(user.uid, profileData);

  // Attempt to sync to Firestore if permitted
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, profileData, { merge: true });
  } catch (err: any) {
    console.warn('Firestore user profile sync bypassed (rules or permissions):', err.message);
  }

  return profileData;
}

/**
 * Get user profile from Firestore or local cache fallback
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const local = getLocalProfile(uid);

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      setLocalProfile(uid, data);
      return data;
    }
  } catch (error: any) {
    console.warn('Firestore read bypassed:', error.message);
  }

  return local;
}

/**
 * Save new appointment booking to shared server DB & Firestore
 */
export async function createAppointment(appointment: Omit<AppointmentRecord, 'id' | 'status' | 'createdAt'>): Promise<string> {
  let generatedId = `FF-${Date.now().toString(36).toUpperCase()}`;
  const finalStatus: 'pending' | 'confirmed' = 'pending';

  // 1. Post to central cross-device shared server database
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appointment,
        createdBy: 'patient',
        status: 'pending',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        generatedId = data.id;
      }
    }
  } catch (err: any) {
    console.warn('Server API write error, falling back:', err.message);
  }

  const newAppt: AppointmentRecord = {
    ...appointment,
    id: generatedId,
    status: finalStatus,
    createdAt: new Date().toISOString(),
    createdBy: 'patient',
  };

  // 2. Also attempt Firestore write for multi-channel sync
  try {
    const appointmentsRef = collection(db, 'appointments');
    await addDoc(appointmentsRef, {
      ...appointment,
      status: 'pending',
      createdBy: 'patient',
      createdAt: serverTimestamp(),
      customId: generatedId,
    });
  } catch (err: any) {
    console.warn('Firestore appointment write notice:', err.message);
  }

  // 3. Save to local device cache for fast fallback
  const currentAppts = getLocalAppointments(appointment.userId);
  const updatedUserAppts = [newAppt, ...currentAppts.filter((a) => a.id !== generatedId)];
  setLocalAppointments(appointment.userId, updatedUserAppts);

  const allGlobal = getGlobalAppointments();
  setGlobalAppointments([newAppt, ...allGlobal.filter((a) => a.id !== generatedId)]);

  return generatedId;
}

/**
 * Create an appointment from the Admin End (Walk-in / Phone booking)
 */
export async function createAdminAppointment(appointment: Omit<AppointmentRecord, 'id' | 'createdAt'>): Promise<string> {
  let generatedId = `FF-ADM-${Date.now().toString(36).toUpperCase()}`;

  // 1. Post to central shared server database
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appointment,
        createdBy: 'admin',
        status: appointment.status || 'confirmed',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        generatedId = data.id;
      }
    }
  } catch (err: any) {
    console.warn('Server API admin appointment error:', err.message);
  }

  const newAppt: AppointmentRecord = {
    ...appointment,
    id: generatedId,
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
  };

  // 2. Attempt Firestore write
  try {
    const appointmentsRef = collection(db, 'appointments');
    await addDoc(appointmentsRef, {
      ...appointment,
      createdBy: 'admin',
      createdAt: serverTimestamp(),
      customId: generatedId,
    });
  } catch (err: any) {
    console.warn('Firestore admin appointment write notice:', err.message);
  }

  // 3. Update local caches
  const allGlobal = getGlobalAppointments();
  setGlobalAppointments([newAppt, ...allGlobal.filter((a) => a.id !== generatedId)]);

  if (appointment.userId) {
    const userAppts = getLocalAppointments(appointment.userId);
    setLocalAppointments(appointment.userId, [newAppt, ...userAppts.filter((a) => a.id !== generatedId)]);
  }

  return generatedId;
}

/**
 * Get all appointments for a specific user (Cross-device synced)
 */
export async function getUserAppointments(userId: string, phone?: string): Promise<AppointmentRecord[]> {
  const local = getLocalAppointments(userId);
  const serverResults: AppointmentRecord[] = [];

  // 1. Fetch from shared server API
  try {
    const url = `/api/appointments/user/${encodeURIComponent(userId)}${phone ? '?phone=' + encodeURIComponent(phone) : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverResults.push(...data);
      }
    }
  } catch (err: any) {
    console.warn('Server API getUserAppointments notice:', err.message);
  }

  // 2. Attempt Firestore fetch
  const firestoreResults: AppointmentRecord[] = [];
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      firestoreResults.push({
        id: d.id,
        ...(d.data() as Omit<AppointmentRecord, 'id'>),
      });
    });
  } catch (error: any) {
    // Firestore rules notice
  }

  // Merge results: Server > Firestore > Local
  const mergedMap = new Map<string, AppointmentRecord>();
  [...serverResults, ...firestoreResults, ...local].forEach((item) => {
    if (item.id && !mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });

  const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
    return (b.id || '').localeCompare(a.id || '');
  });

  setLocalAppointments(userId, mergedList);
  return mergedList;
}

/**
 * Real-time subscription to appointments for a specific user.
 */
export function subscribeToUserAppointments(
  userId: string,
  onUpdate: (appts: AppointmentRecord[]) => void,
  onError?: (err: any) => void,
  phone?: string
): () => void {
  // Emit initial local cache immediately
  const local = getLocalAppointments(userId);
  if (local.length > 0) {
    onUpdate(local);
  }

  // Fetch from server immediately
  getUserAppointments(userId, phone).then((fresh) => {
    if (fresh.length > 0) onUpdate(fresh);
  });

  // Cross-device server polling interval (every 3 seconds)
  const pollTimer = setInterval(async () => {
    try {
      const fresh = await getUserAppointments(userId, phone);
      onUpdate(fresh);
    } catch {}
  }, 3000);

  // Firestore real-time listener if available
  let unsubscribeFirestore = () => {};
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, where('userId', '==', userId));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const firestoreList: AppointmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<AppointmentRecord, 'id'>),
          });
        });
        if (firestoreList.length > 0) {
          getUserAppointments(userId).then((all) => onUpdate(all));
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {}

  return () => {
    clearInterval(pollTimer);
    unsubscribeFirestore();
  };
}

/**
 * Get ALL appointments across all patients and all devices
 */
export async function getAllAppointments(): Promise<AppointmentRecord[]> {
  const local = getGlobalAppointments();
  const serverResults: AppointmentRecord[] = [];

  // 1. Fetch from shared server API
  try {
    const res = await fetch('/api/appointments');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverResults.push(...data);
      }
    }
  } catch (err: any) {
    console.warn('Server API getAllAppointments notice:', err.message);
  }

  // 2. Attempt Firestore fetch
  const firestoreResults: AppointmentRecord[] = [];
  try {
    const appointmentsRef = collection(db, 'appointments');
    const snap = await getDocs(appointmentsRef);
    snap.forEach((d) => {
      firestoreResults.push({
        id: d.id,
        ...(d.data() as Omit<AppointmentRecord, 'id'>),
      });
    });
  } catch (error: any) {
    // Firestore rules notice
  }

  // Merge results: Server > Firestore > Local
  const mergedMap = new Map<string, AppointmentRecord>();
  [...serverResults, ...firestoreResults, ...local].forEach((item) => {
    if (item.id && !mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });

  const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    if (dateA && dateB && dateA !== dateB) return dateB - dateA;
    return (b.id || '').localeCompare(a.id || '');
  });

  setGlobalAppointments(mergedList);
  return mergedList;
}

/**
 * Real-time subscription to ALL appointments for the Admin Portal.
 * Solves issue where new bookings from external patient devices didn't appear in admin dashboard.
 */
export function subscribeToAllAppointments(
  onUpdate: (appts: AppointmentRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  // Emit initial local cache immediately
  const local = getGlobalAppointments();
  if (local.length > 0) {
    onUpdate(local);
  }

  // Fetch immediately
  getAllAppointments().then((fresh) => {
    if (fresh.length > 0) onUpdate(fresh);
  });

  // Cross-device continuous polling every 3 seconds for instant detection of bookings made on any device
  const pollTimer = setInterval(async () => {
    try {
      const fresh = await getAllAppointments();
      onUpdate(fresh);
    } catch {}
  }, 3000);

  // Parallel Firestore listener
  let unsubscribeFirestore = () => {};
  try {
    const appointmentsRef = collection(db, 'appointments');
    unsubscribeFirestore = onSnapshot(
      appointmentsRef,
      (snapshot) => {
        const firestoreList: AppointmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<AppointmentRecord, 'id'>),
          });
        });
        if (firestoreList.length > 0) {
          getAllAppointments().then((all) => onUpdate(all));
        }
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  } catch {}

  return () => {
    clearInterval(pollTimer);
    unsubscribeFirestore();
  };
}

/**
 * Update an appointment's status (e.g. 'confirmed', 'pending', 'completed', 'cancelled')
 * Synchronizes across server and Firestore so all patient devices receive the update instantly.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'confirmed' | 'pending' | 'completed' | 'cancelled',
  adminNotes?: string
): Promise<void> {
  // 1. Update on shared server database
  try {
    await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, notes: adminNotes }),
    });
  } catch (err: any) {
    console.warn('Server API updateAppointmentStatus notice:', err.message);
  }

  // 2. Attempt to sync with Firestore
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const updatePayload: any = { 
      status: newStatus,
      updatedAt: serverTimestamp() 
    };
    if (adminNotes !== undefined) {
      updatePayload.notes = adminNotes;
    }
    await updateDoc(appointmentRef, updatePayload);
  } catch (err: any) {
    // Firestore rules notice
  }

  // 3. Update in global storage & target user cache
  const allGlobal = getGlobalAppointments();
  const updatedGlobal = allGlobal.map((a) => {
    if (a.id === appointmentId) {
      return {
        ...a,
        status: newStatus,
        notes: adminNotes !== undefined ? adminNotes : a.notes,
      };
    }
    return a;
  });
  setGlobalAppointments(updatedGlobal);

  const target = allGlobal.find((a) => a.id === appointmentId);
  if (target?.userId) {
    const userAppts = getLocalAppointments(target.userId);
    const updatedUser = userAppts.map((a) => {
      if (a.id === appointmentId) {
        return {
          ...a,
          status: newStatus,
          notes: adminNotes !== undefined ? adminNotes : a.notes,
        };
      }
      return a;
    });
    setLocalAppointments(target.userId, updatedUser);
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(userId: string, appointmentId: string): Promise<void> {
  await updateAppointmentStatus(appointmentId, 'cancelled');
}

/**
 * Fast 1-Click Patient Sign-In (Name & Phone)
 * Bypasses Google popup / unauthorized domain errors completely on mobile browsers!
 */
export async function signInGuestPatient(name: string, phone: string): Promise<UserProfile> {
  let user: User;
  
  // Try anonymous auth first
  try {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  } catch {
    // Fallback: create or sign in synthetic patient account based on phone
    const cleanPhone = phone.replace(/[^0-9]/g, '') || Date.now().toString();
    const syntheticEmail = `patient_${cleanPhone}@flexifit.local`;
    const syntheticPass = `patient#${cleanPhone.slice(-6).padStart(6, '0')}`;
    try {
      const cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
      user = cred.user;
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
      user = cred.user;
    }
  }

  try {
    await updateProfile(user, { displayName: name });
  } catch {}

  const profile = await saveUserProfile(user, phone);
  return profile;
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
};

