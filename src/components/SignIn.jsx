import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";
import { useState } from "react";

export default function SignIn() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e.message || "ההתחברות נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="w-20 h-20 rounded-3xl bg-brand text-white flex items-center justify-center text-4xl shadow-pop mb-6"
        style={{ animation: "spinIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both" }}
      >
        🛒
      </div>
      <h1
        className="text-3xl font-bold text-brand tracking-tight mb-2"
        style={{ animation: "slideUp 0.4s 0.1s ease-out both" }}
      >
        רשימת קניות
      </h1>
      <p
        className="text-stone-600 text-sm leading-relaxed max-w-xs mb-10"
        style={{ animation: "slideUp 0.4s 0.18s ease-out both" }}
      >
        רשימה משותפת חיה. הוסיפו, סמנו ושתפו עם כל המשפחה — הכל מסונכרן בזמן
        אמת.
      </p>

      {!isFirebaseConfigured ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-right text-sm text-amber-900 max-w-sm">
          <p className="font-semibold mb-1">דרושה הגדרת Firebase</p>
          <p>
            צרו פרויקט ב-Firebase, הפעילו Google Sign-In ו-Firestore, והעתיקו
            את הערכים לקובץ{" "}
            <code className="bg-amber-100 px-1 rounded">.env</code>.
          </p>
        </div>
      ) : (
        <div
          className="w-full max-w-xs"
          style={{ animation: "slideUp 0.4s 0.26s ease-out both" }}
        >
          <button
            onClick={handleSignIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:bg-stone-50 active:scale-[0.98] transition rounded-2xl px-6 py-3.5 shadow-card font-medium text-stone-800 disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              />
            </svg>
            {busy ? "מתחבר..." : "התחברות עם Google"}
          </button>
          {error && (
            <p className="text-red-600 text-xs mt-4 leading-relaxed">{error}</p>
          )}
        </div>
      )}

      <p className="text-stone-400 text-xs mt-10">
        בכניסה הראשונה תיווצר רשימה ריקה אוטומטית
      </p>
    </div>
  );
}
