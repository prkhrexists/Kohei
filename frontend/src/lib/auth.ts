import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

export type UserRole = "admin" | "compliance" | "executive" | "analyst" | "viewer" | "unknown";

export type AuthState = {
  user: User | null;
  role: UserRole;
};

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user ?? null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function getUserRole(uid: string): Promise<UserRole> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return "unknown";
  }
  const data = snapshot.data() as { role?: UserRole };
  return data.role ?? "unknown";
}

export function observeAuthState(callback: (state: AuthState) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, role: "unknown" });
      return;
    }
    const role = await getUserRole(user.uid);
    callback({ user, role });
  });
}
