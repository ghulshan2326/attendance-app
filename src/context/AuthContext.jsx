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

  // Helper to fetch user role strictly from Firestore
  const fetchUserRoleFromFirestore = async (user) => {
    if (!isFirebaseConfigured() || !db || !user) return 'employee';
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return data.role === 'admin' ? 'admin' : 'employee';
      }
    } catch (err) {
      console.error("Error fetching user role from Firestore:", err);
    }
    return 'employee';
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const role = await fetchUserRoleFromFirestore(user);
        
        // Fetch display name from Firestore if available
        let name = user.displayName || user.email;
        try {
          if (db) {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (userDocSnap.exists() && userDocSnap.data().name) {
              name = userDocSnap.data().name;
            }
          }
        } catch (e) {
          // ignore fallback
        }

        setCurrentUser({ uid: user.uid, email: user.email, displayName: name });
        setUserRole(role);
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
    
    // Fetch role strictly from Firestore document
    const role = await fetchUserRoleFromFirestore(user);
    
    let name = user.displayName || user.email;
    try {
      if (db) {
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists() && userDocSnap.data().name) {
          name = userDocSnap.data().name;
        }
      }
    } catch (e) {
      // ignore
    }

    setCurrentUser({ uid: user.uid, email: user.email, displayName: name });
    setUserRole(role);
    return user;
  };

  // Secure Sign-Up handler (All new sign-ups default STRICTLY to 'employee')
  const signup = async (email, password, name) => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured yet. Please configure Firebase keys.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user profile with role hardcoded as 'employee' in Firestore 'users' collection
    if (db) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        role: 'employee', // Always default to employee. Only manual Firestore edit grants admin.
        createdAt: new Date().toISOString()
      });
    }

    setCurrentUser({ uid: user.uid, email, displayName: name });
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
