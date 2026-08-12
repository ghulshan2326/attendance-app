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
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;
    
    console.log(`🔑 [Auth] Authentication successful! Logged-in Auth UID: "${user.uid}"`);
    
    // Fetch profile strictly from Firestore document users/{user.uid}
    const profile = await fetchUserProfileFromFirestore(user);

    setCurrentUser(profile);
    setUserRole(profile?.role || 'employee');
    return user;
  };

  // Restricted Sign-Up handler (Requires valid pending invitation in 'invitedEmployees' collection)
  const signup = async (email, password, name) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`📝 [Auth] Verifying invitation for: "${normalizedEmail}"...`);

    // 1. Check if email exists in 'invitedEmployees' collection with status: 'pending'
    let inviteData = null;
    if (db) {
      const inviteRef = doc(db, 'invitedEmployees', normalizedEmail);
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        const data = inviteSnap.data();
        if (data.status === 'pending') {
          inviteData = data;
        }
      }
    }

    if (!inviteData) {
      throw new Error("This email is not authorized. Please contact your admin.");
    }

    console.log(`✅ [Auth] Valid pending invite found for "${normalizedEmail}". Proceeding with account creation...`, inviteData);

    // 2. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    console.log(`✨ [Auth] Account created! New Auth UID: "${user.uid}"`);

    const newProfile = {
      uid: user.uid,
      name: name.trim() || inviteData.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      role: 'employee',
      designation: inviteData.designation || 'Team Member',
      department: inviteData.department || 'General',
      createdAt: new Date().toISOString()
    };

    if (db) {
      // 3. Save profile in 'users' collection using user.uid
      console.log(`💾 [Auth] Writing new user profile at path: "users/${user.uid}"`);
      await setDoc(doc(db, 'users', user.uid), newProfile);

      // 4. Mark invitation as completed in 'invitedEmployees' collection
      console.log(`🏷️ [Auth] Updating invite status to 'completed' for "${normalizedEmail}"`);
      await setDoc(doc(db, 'invitedEmployees', normalizedEmail), {
        status: 'completed',
        uid: user.uid,
        completedAt: new Date().toISOString()
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
