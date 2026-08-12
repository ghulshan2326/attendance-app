import { db, isFirebaseConfigured } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';

// Save or Update Attendance Record in Firestore
export const saveAttendanceRecord = async (dateStr, empId, status) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const docRef = doc(db, 'attendance', dateStr);
    await setDoc(docRef, {
      [empId]: status
    }, { merge: true });
  } catch (error) {
    console.error("Error saving attendance to Firestore:", error);
  }
};

// Real-time listener for attendance records
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
    });
  } catch (error) {
    console.error("Error subscribing to Firestore attendance:", error);
    return () => {};
  }
};

// Add Employee to Firestore
export const addEmployeeToFirestore = async (empData) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const docRef = doc(db, 'employees', empData.id.toString());
    await setDoc(docRef, empData);
  } catch (error) {
    console.error("Error adding employee to Firestore:", error);
  }
};

// Delete Employee from Firestore
export const deleteEmployeeFromFirestore = async (empId) => {
  if (!isFirebaseConfigured() || !db) return;

  try {
    const docRef = doc(db, 'employees', empId.toString());
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting employee from Firestore:", error);
  }
};

// Real-time listener for Employees
export const subscribeToEmployees = (callback) => {
  if (!isFirebaseConfigured() || !db) return () => {};

  try {
    const employeesCollection = collection(db, 'employees');
    return onSnapshot(employeesCollection, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
      callback(list);
    });
  } catch (error) {
    console.error("Error subscribing to Firestore employees:", error);
    return () => {};
  }
};
