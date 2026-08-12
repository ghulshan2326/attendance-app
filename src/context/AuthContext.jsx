import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  isFirebaseConfigured 
} from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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

// Demo users when Firebase keys are not yet configured
const DEMO_USERS = {
  'admin@company.com': { uid: 'demo-admin-1', email: 'admin@company.com', displayName: 'Admin Manager', role: 'admin' },
  'employee@company.com': { uid: 'demo-emp-1', email: 'employee@company.com', displayName: 'Munibah Khan', role: 'employee' }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'employee'
  const [loading, setLoading] = useState(true);

  // Monitor Firebase Auth state if configured
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      // Default to demo admin mode for instant preview if no keys
      setCurrentUser(DEMO_USERS['admin@company.com']);
      setUserRole('admin');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch User Role from Firestore 'users' collection
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCurrentUser({ uid: user.uid, email: user.email, displayName: userData.name || user.email });
            setUserRole(userData.role || 'employee');
          } else {
            // Default role if doc not yet created
            setCurrentUser({ uid: user.uid, email: user.email, displayName: user.email });
            setUserRole('employee');
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setCurrentUser({ uid: user.uid, email: user.email });
          setUserRole('employee');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login handler
  const login = async (email, password) => {
    if (!isFirebaseConfigured()) {
      const demoUser = DEMO_USERS[email.toLowerCase()];
      if (demoUser) {
        setCurrentUser(demoUser);
        setUserRole(demoUser.role);
        return demoUser;
      }
      // Demo fallback login
      const fallbackRole = email.includes('admin') ? 'admin' : 'employee';
      const userObj = { uid: `demo-${Date.now()}`, email, displayName: email.split('@')[0], role: fallbackRole };
      setCurrentUser(userObj);
      setUserRole(fallbackRole);
      return userObj;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch role
    if (db) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserRole(userDocSnap.data().role || 'employee');
      }
    }
    return user;
  };

  // Sign up handler
  const signup = async (email, password, name, role = 'employee') => {
    if (!isFirebaseConfigured()) {
      const userObj = { uid: `demo-${Date.now()}`, email, displayName: name, role };
      setCurrentUser(userObj);
      setUserRole(role);
      return userObj;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save profile and role to Firestore 'users' collection
    if (db) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });
    }

    setCurrentUser({ uid: user.uid, email, displayName: name });
    setUserRole(role);
    return user;
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
    logout,
    isFirebaseConfigured: isFirebaseConfigured()
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
