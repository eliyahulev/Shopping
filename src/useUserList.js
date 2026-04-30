import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// Provisions a single list per user.
// On first login: claim a pending invite (if any) or create a fresh list.
export function useUserList(user) {
  const [listId, setListId] = useState(null);
  const [error, setError] = useState("");
  const [resolvedFor, setResolvedFor] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const email = (user.email || "").toLowerCase();
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let myListId = userSnap.exists() ? userSnap.data().listId : null;

        if (!myListId && email) {
          const inviteRef = doc(db, "invites", email);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists() && inviteSnap.data().listId) {
            const invitedListId = inviteSnap.data().listId;
            await updateDoc(doc(db, "lists", invitedListId), {
              members: arrayUnion(user.uid),
            });
            await deleteDoc(inviteRef);
            myListId = invitedListId;
          }
        }

        if (!myListId) {
          const listRef = await addDoc(collection(db, "lists"), {
            ownerId: user.uid,
            members: [user.uid],
            createdAt: serverTimestamp(),
          });
          myListId = listRef.id;
        }

        await setDoc(
          userRef,
          {
            email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            listId: myListId,
          },
          { merge: true },
        );

        if (!cancelled) {
          setListId(myListId);
          setResolvedFor(user.uid);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setResolvedFor(user.uid);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loading = !!user && resolvedFor !== user.uid;

  async function switchToList(newListId) {
    if (!user || !newListId) return;
    await updateDoc(doc(db, "lists", newListId), {
      members: arrayUnion(user.uid),
    });
    await setDoc(
      doc(db, "users", user.uid),
      { listId: newListId },
      { merge: true },
    );
    setListId(newListId);
  }

  return {
    listId: user ? listId : null,
    error,
    loading,
    switchToList,
  };
}
