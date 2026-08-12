import { db, isFirebaseConfigured } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';

// Save or Update Entire Attendance Map for a specific date in Firestore
export const saveDailyAttendance = async (dateStr, attendanceMap) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const docRef = doc(db, 'attendance', dateStr);
    await setDoc(docRef, attendanceMap, { merge: true });
    console.log(`💾 [Attendance Saved] Date: "${dateStr}"`, attendanceMap);
  } catch (error) {
    console.error("❌ Error saving attendance to Firestore:", error);
    throw error;
  }
};

// Save individual attendance status for an employee on a date
export const saveAttendanceRecord = async (dateStr, empId, status) => {
  if (!isFirebaseConfigured() || !db) return;

  const key = String(empId);
  try {
    const docRef = doc(db, 'attendance', dateStr);
    await setDoc(docRef, { [key]: status }, { merge: true });
    console.log(`💾 [Attendance Single Save] Date: "${dateStr}", EmpID: "${key}", Status: "${status}"`);
  } catch (error) {
    console.error("❌ Error saving single attendance to Firestore:", error);
  }
};

// Single, performance-optimized real-time listener for attendance collection
export const subscribeToAttendance = (callback) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  try {
    const attendanceCollection = collection(db, 'attendance');
    return onSnapshot(attendanceCollection, (snapshot) => {
      const data = {};
      snapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      callback(data);
    }, (error) => {
      console.error("❌ Error subscribing to attendance:", error);
    });
  } catch (error) {
    console.error("Error setting up attendance listener:", error);
    return () => {};
  }
};

// Admin adds an employee by Name + Email -> Saves to 'employees' collection
export const addEmployeeToFirestore = async (empData) => {
  if (!isFirebaseConfigured() || !db) return;

  const normalizedEmail = empData.email.toLowerCase().trim();

  try {
    const docRef = doc(db, 'employees', normalizedEmail);
    await setDoc(docRef, {
      id: normalizedEmail,
      email: normalizedEmail,
      name: empData.name.trim(),
      designation: empData.designation?.trim() || 'Staff Member',
      department: empData.department || 'General',
      role: 'employee',
      addedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ [Employee Added] Saved "${normalizedEmail}" to employees collection.`);
  } catch (error) {
    console.error("❌ Error adding employee to Firestore:", error);
    throw error;
  }
};

// Check if an email is registered in 'employees' collection (added by Admin)
export const checkRegisteredEmployee = async (email) => {
  if (!isFirebaseConfigured() || !db) return null;

  const normalizedEmail = email.toLowerCase().trim();
  try {
    const docRef = doc(db, 'employees', normalizedEmail);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.error("Error checking registered employee in Firestore:", error);
  }
  return null;
};

// Delete Employee from 'employees' and 'users' collections
export const deleteEmployeeFromFirestore = async (empId, email) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    if (email) {
      const empDocRef = doc(db, 'employees', email.toLowerCase().trim());
      await deleteDoc(empDocRef).catch(() => {});
    }

    if (empId && empId !== email) {
      const userDocRef = doc(db, 'users', empId.toString());
      await deleteDoc(userDocRef).catch(() => {});
    }
  } catch (error) {
    console.error("Error deleting employee from Firestore:", error);
  }
};

// Optimized single real-time listener for 'employees' collection
export const subscribeToEmployees = (callback) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  try {
    const employeesCollection = collection(db, 'employees');
    return onSnapshot(employeesCollection, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: data.id || data.email || docSnap.id,
          uid: data.uid || data.id || docSnap.id,
          name: data.name || data.email?.split('@')[0] || 'Employee',
          email: data.email || docSnap.id,
          designation: data.designation || 'Staff Member',
          department: data.department || 'General'
        });
      });
      callback(list);
    }, (error) => {
      console.error("❌ Error subscribing to employees collection:", error);
    });
  } catch (error) {
    console.error("Error setting up listener for employees:", error);
    return () => {};
  }
};
