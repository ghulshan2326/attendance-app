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

  // Helper to fetch complete user profile strictly from Firestore users/{user.uid}
  const fetchUserProfileFromFirestore = async (user) => {
    if (!user || !user.uid) {
      console.warn("⚠️ [Auth] fetchUserProfileFromFirestore called without a valid user object.");
      return null;
    }

    // LOG CURRENT USER UID FOR AUDITING
    console.log(`🔍 [Auth] Fetching Firestore document at path: "users/${user.uid}" (Email: ${user.email})`);

    const defaultProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      name: user.displayName || user.email?.split('@')[0] || 'User',
      role: 'employee',
      designation: 'Team Member',
      department: 'General'
    };

    if (!isFirebaseConfigured() || !db) {
      console.warn("⚠️ [Auth] Firebase/Firestore is not configured.");
      return defaultProfile;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        console.log(`✅ [Auth] Successfully fetched Firestore document for UID "${user.uid}":`, data);
        
        const rawRole = String(data.role || 'employee').toLowerCase().trim();
        const isAdminRole = rawRole === 'admin' || rawRole === 'administrator';

        const profile = {
          uid: user.uid,
          email: user.email,
          displayName: data.name || user.displayName || user.email?.split('@')[0],
          name: data.name || user.displayName || user.email?.split('@')[0],
          role: isAdminRole ? 'admin' : 'employee',
          designation: data.designation || 'Team Member',
          department: data.department || 'General'
        };

        console.log(`🚀 [Auth] Final active profile for UID "${user.uid}" -> Role: "${profile.role}", Name: "${profile.name}"`);
        return profile;
      } else {
        console.warn(`⚠️ [Auth] No Firestore document found at path "users/${user.uid}". Defaulting role to "employee".`);
      }
    } catch (err) {
      console.error(`❌ [Auth] Error fetching Firestore document for UID "${user.uid}":`, err);
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
        console.log(`🔄 [Auth] onAuthStateChanged triggered for logged-in UID: "${user.uid}" (${user.email})`);
        const profile = await fetchUserProfileFromFirestore(user);
        setCurrentUser(profile);
        setUserRole(profile?.role || 'employee');
      } else {
        console.log(`🚪 [Auth] User signed out.`);
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

    console.log(`🔐 [Auth] Attempting login for email: "${email}"...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`🔑 [Auth] Authentication successful! Logged-in Auth UID: "${user.uid}"`);
    
    // Fetch profile strictly from Firestore document users/{user.uid}
    const profile = await fetchUserProfileFromFirestore(user);

    setCurrentUser(profile);
    setUserRole(profile?.role || 'employee');
    return user;
  };

  // Secure Sign-Up handler (All new sign-ups default STRICTLY to 'employee')
  const signup = async (email, password, name) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    console.log(`📝 [Auth] Creating new account for: "${email}"...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log(`✨ [Auth] Account created! New Auth UID: "${user.uid}"`);

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
      console.log(`💾 [Auth] Writing new user document at path: "users/${user.uid}"`);
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
