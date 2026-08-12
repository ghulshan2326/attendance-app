import { db, isFirebaseConfigured } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';

// Save or Update Attendance Record permanently in Firestore
export const saveAttendanceRecord = async (dateStr, empId, status) => {
  if (!isFirebaseConfigured() || !db) return;

  const key = String(empId);
  try {
    const docRef = doc(db, 'attendance', dateStr);
    // Writes/merges [key]: status into document 'attendance/{dateStr}'
    await setDoc(docRef, {
      [key]: status
    }, { merge: true });
    
    console.log(`💾 [Firestore Attendance Saved] Date: "${dateStr}", EmpID: "${key}", Status: "${status}"`);
  } catch (error) {
    console.error("❌ Error saving attendance to Firestore:", error);
  }
};

// Real-time listener for attendance records across all dates
export const subscribeToAttendance = (callback) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  try {
    const attendanceCollection = collection(db, 'attendance');
    return onSnapshot(attendanceCollection, (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      console.log(`📡 [Firestore Sync] Loaded attendance for ${Object.keys(data).length} dates.`);
      callback(data);
    }, (error) => {
      console.error("❌ Error subscribing to Firestore attendance:", error);
    });
  } catch (error) {
    console.error("Error setting up attendance listener:", error);
    return () => {};
  }
};

// Admin invites a new employee by email -> Creates document in 'invitedEmployees' collection
export const inviteEmployeeToFirestore = async (empData) => {
  if (!isFirebaseConfigured() || !db) return;

  const normalizedEmail = empData.email.toLowerCase().trim();

  try {
    const docRef = doc(db, 'invitedEmployees', normalizedEmail);
    await setDoc(docRef, {
      email: normalizedEmail,
      name: empData.name.trim(),
      designation: empData.designation?.trim() || 'Team Member',
      department: empData.department || 'General',
      role: 'employee',
      status: 'pending',
      invitedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`✉️ [Invite] Successfully created pending invite for "${normalizedEmail}" in invitedEmployees collection.`);
  } catch (error) {
    console.error("Error creating employee invitation in Firestore:", error);
    throw error;
  }
};

// Check if an email has a pending invitation in 'invitedEmployees' collection
export const checkEmployeeInvite = async (email) => {
  if (!isFirebaseConfigured() || !db) return null;

  const normalizedEmail = email.toLowerCase().trim();
  try {
    const docRef = doc(db, 'invitedEmployees', normalizedEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.status === 'pending') {
        return data;
      }
    }
  } catch (error) {
    console.error("Error checking employee invite in Firestore:", error);
    throw error;
  }
  return null;
};

// Delete Employee (active user or pending invite) from Firestore
export const deleteEmployeeFromFirestore = async (empId, email) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    if (empId) {
      const userDocRef = doc(db, 'users', empId.toString());
      await deleteDoc(userDocRef).catch(() => {});
    }

    if (email) {
      const inviteDocRef = doc(db, 'invitedEmployees', email.toLowerCase().trim());
      await deleteDoc(inviteDocRef).catch(() => {});
    }
  } catch (error) {
    console.error("Error deleting employee from Firestore:", error);
  }
};

// Real-time listener for Employees (combines active signed-up users and pending invited employees)
export const subscribeToEmployees = (callback) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  let activeUsers = [];
  let pendingInvites = [];

  const updateRoster = () => {
    const activeEmails = new Set(activeUsers.map(u => (u.email || '').toLowerCase().trim()));
    
    // Filter pending invites that haven't signed up yet
    const filteredPending = pendingInvites.filter(inv => !activeEmails.has((inv.email || '').toLowerCase().trim()));
    
    const combined = [...activeUsers, ...filteredPending];
    callback(combined);
  };

  try {
    // 1. Listen to active registered users in 'users' collection
    const usersCollection = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCollection, (snapshot) => {
      activeUsers = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const rawRole = String(data.role || 'employee').toLowerCase().trim();
        if (rawRole !== 'admin' && rawRole !== 'administrator') {
          activeUsers.push({
            id: data.uid || docSnap.id,
            uid: data.uid || docSnap.id,
            name: data.name || data.displayName || data.email?.split('@')[0] || 'Employee',
            email: data.email || '',
            designation: data.designation || 'Team Member',
            department: data.department || 'General',
            accountStatus: 'active' // 🟢 Active account
          });
        }
      });
      updateRoster();
    });

    // 2. Listen to pending invitations in 'invitedEmployees' collection
    const invitesCollection = collection(db, 'invitedEmployees');
    const unsubInvites = onSnapshot(invitesCollection, (snapshot) => {
      pendingInvites = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === 'pending') {
          pendingInvites.push({
            id: `invite-${docSnap.id}`,
            name: data.name || data.email?.split('@')[0] || 'Invited Employee',
            email: data.email || docSnap.id,
            designation: data.designation || 'Team Member',
            department: data.department || 'General',
            accountStatus: 'pending' // 🟡 Pending invitation
          });
        }
      });
      updateRoster();
    });

    return () => {
      unsubUsers();
      unsubInvites();
    };
  } catch (error) {
    console.error("Error setting up real-time listener for employees:", error);
    return () => {};
  }
};
