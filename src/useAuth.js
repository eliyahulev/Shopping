import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setResolved(true);
    });
  }, []);

  const loading = isFirebaseConfigured && !resolved;
  return { user, loading };
}
