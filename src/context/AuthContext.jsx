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

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'employee'
  const [loading, setLoading] = useState(true);

  // Helper to fetch complete user profile strictly from Firestore users/{uid}
  const fetchUserProfileFromFirestore = async (user) => {
    const defaultProfile = {
      uid: user?.uid || '',
      email: user?.email || '',
      displayName: user?.displayName || user?.email?.split('@')[0] || 'Employee',
      name: user?.displayName || user?.email?.split('@')[0] || 'Employee',
      role: 'employee',
      designation: 'Team Member',
      department: 'General'
    };

    if (!isFirebaseConfigured() || !db || !user) return defaultProfile;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return {
          uid: user.uid,
          email: user.email,
          displayName: data.name || user.displayName || user.email.split('@')[0],
          name: data.name || user.displayName || user.email.split('@')[0],
          role: data.role === 'admin' ? 'admin' : 'employee',
          designation: data.designation || 'Team Member',
          department: data.department || 'General'
        };
      }
    } catch (err) {
      console.error("Error fetching user profile from Firestore:", err);
    }
    return defaultProfile;
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfileFromFirestore(user);
        setCurrentUser(profile);
        setUserRole(profile.role);
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

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch profile strictly from Firestore document users/{user.uid}
    const profile = await fetchUserProfileFromFirestore(user);

    setCurrentUser(profile);
    setUserRole(profile.role);
    return user;
  };

  // Secure Sign-Up handler (All new sign-ups default STRICTLY to 'employee')
  const signup = async (email, password, name) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const newProfile = {
      uid: user.uid,
      name: name.trim(),
      email: email.trim(),
      role: 'employee', // Always default to employee. Only manual Firestore edit grants admin.
      designation: 'Team Member',
      department: 'General',
      createdAt: new Date().toISOString()
    };

    // Save user profile in Firestore 'users' collection with user.uid as document key
    if (db) {
      await setDoc(doc(db, 'users', user.uid), newProfile);
    }

    setCurrentUser({ ...newProfile, displayName: name.trim() });
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
