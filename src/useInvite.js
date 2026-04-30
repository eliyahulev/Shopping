import { useEffect, useState } from "react";
import { deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function useInvite(user) {
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    const ref = doc(db, "invites", user.email.toLowerCase());
    return onSnapshot(
      ref,
      (snap) => setInvite(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setInvite(null),
    );
  }, [user]);

  async function dismiss() {
    if (!user?.email) return;
    try {
      await deleteDoc(doc(db, "invites", user.email.toLowerCase()));
    } catch {
      /* swallow — banner will refresh from snapshot */
    }
  }

  return { invite, dismiss };
}
