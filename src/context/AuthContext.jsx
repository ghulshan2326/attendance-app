import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  isFirebaseConfigured 
} from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { checkRegisteredEmployee } from '../firebase/attendanceService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'employee'
  const [loading, setLoading] = useState(true);

  // Helper to fetch complete user profile strictly from Firestore users/{user.uid}
  const fetchUserProfileFromFirestore = async (user) => {
    if (!user || !user.uid) return null;

    const defaultProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      name: user.displayName || user.email?.split('@')[0] || 'User',
      role: 'employee',
      designation: 'Staff Member',
      department: 'General'
    };

    if (!isFirebaseConfigured() || !db) return defaultProfile;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const rawRole = String(data.role || 'employee').toLowerCase().trim();
        const isAdminRole = rawRole === 'admin' || rawRole === 'administrator';

        return {
          uid: user.uid,
          email: user.email,
          displayName: data.name || user.displayName || user.email?.split('@')[0],
          name: data.name || user.displayName || user.email?.split('@')[0],
          role: isAdminRole ? 'admin' : 'employee',
          designation: data.designation || 'Staff Member',
          department: data.department || 'General'
        };
      }
    } catch (err) {
      console.error("Error fetching user profile from Firestore:", err);
    }

    return defaultProfile;
  };

  // Monitor Firebase Auth state dynamically
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfileFromFirestore(user);
        setCurrentUser(profile);
        setUserRole(profile?.role || 'employee');
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Secure Login handler
  const login = async (email, password) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;
    
    const profile = await fetchUserProfileFromFirestore(user);

    setCurrentUser(profile);
    setUserRole(profile?.role || 'employee');
    return user;
  };

  // Restricted Sign-Up handler (Checks if email exists in Admin's 'employees' collection)
  const signup = async (email, password, name) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify email exists in Firestore 'employees' collection (added by Admin)
    const empRecord = await checkRegisteredEmployee(normalizedEmail);

    if (!empRecord) {
      throw new Error("Your email is not registered by the Admin yet. Please contact your admin.");
    }

    // 2. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    const newProfile = {
      uid: user.uid,
      name: (name && name.trim()) || empRecord.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role: 'employee',
      designation: empRecord.designation || 'Staff Member',
      department: empRecord.department || 'General',
      createdAt: new Date().toISOString()
    };

    if (db) {
      // 3. Save profile in 'users' collection
      await setDoc(doc(db, 'users', user.uid), newProfile);

      // 4. Link UID to employee document
      await setDoc(doc(db, 'employees', normalizedEmail), {
        uid: user.uid
      }, { merge: true });
    }

    setCurrentUser({ ...newProfile, displayName: newProfile.name });
    setUserRole('employee');
    return user;
  };

  // Password Reset handler via Firebase Auth
  const resetPassword = async (email) => {
    if (!isFirebaseConfigured() || !auth) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }
    return await sendPasswordResetEmail(auth, email.trim());
  };

  // Logout handler
  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
    setUserRole(null);
  };

  const value = {
    currentUser,
    userRole,
    login,
    signup,
    resetPassword,
    logout,
    isFirebaseConfigured: isFirebaseConfigured()
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
