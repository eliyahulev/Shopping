# רשימת קניות / Shopping App

אפליקציית רשימת קניות בעברית, מותאמת לנייד. כל משתמש מקבל רשימה אחת, וניתן לשתף אותה עם משתמשים נוספים לפי כתובת מייל. כל השינויים מסונכרנים בזמן אמת.

A mobile-first Hebrew shopping list app. Each user gets a single list which can be shared with other users by email. All changes sync in real-time.

## טכנולוגיות / Stack

- Vite + React
- Tailwind CSS (RTL)
- Firebase Auth (Google) + Firestore (real-time sync)

## הפעלה / Getting Started

```bash
npm install
cp .env.example .env   # then fill in Firebase values
npm run dev
```

## הגדרת Firebase / Firebase Setup

1. צרו פרויקט ב-[Firebase Console](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → Enable **Google**.
3. **Firestore Database** → Create database (production mode).
4. **Project Settings** → Your apps → Web → רישום אפליקציה, העתיקו את הערכים ל-`.env`.
5. **Authentication → Settings → Authorized domains** — הוסיפו את `localhost` (וכל דומיין production).

### חוקי אבטחה ל-Firestore / Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // index of users so we can look them up by email
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // pending invites keyed by lowercased email
    match /invites/{email} {
      // anyone signed in can create an invite for any email
      allow create: if request.auth != null;
      // only the recipient can read or delete their own invite
      allow read, delete: if request.auth != null
                          && request.auth.token.email != null
                          && request.auth.token.email.lower() == email;
    }

    match /lists/{listId} {
      allow read: if request.auth != null
                  && request.auth.uid in resource.data.members;
      allow create: if request.auth != null
                    && request.auth.uid in request.resource.data.members;
      // existing members can update freely; non-members can self-join only if a
      // valid invite exists for their email pointing at this list
      allow update: if request.auth != null && (
        request.auth.uid in resource.data.members
        || (
          request.auth.uid in request.resource.data.members
          && request.auth.token.email != null
          && exists(/databases/$(database)/documents/invites/$(request.auth.token.email.lower()))
          && get(/databases/$(database)/documents/invites/$(request.auth.token.email.lower())).data.listId == listId
        )
      );
      allow delete: if request.auth != null
                    && request.auth.uid == resource.data.ownerId;

      match /items/{itemId} {
        allow read, write: if request.auth != null
                           && request.auth.uid in
                              get(/databases/$(database)/documents/lists/$(listId)).data.members;
      }
    }
  }
}
```

## איך מתחילים / How it works

1. נכנסים עם Google. בכניסה הראשונה האפליקציה יוצרת לכם רשימה ריקה אוטומטית.
2. ניתן לייבא רשימה מוכנה מקובצת לפי קטגוריות, או להוסיף פריטים ידנית.
3. סימון פריטים, מחיקה, ואיפוס — מתעדכנים בזמן אמת לכל המשתתפים.
4. **שיתוף**: תפריט עליון → "שיתוף הרשימה במייל" → הזינו כתובת. בכניסה הבאה של אותו משתמש לאפליקציה הוא יראה באנר "X מזמינים אותך להצטרף". בקבלה, הוא עובר לרשימה שלכם.

## סקריפטים / Scripts

- `npm run dev` — שרת פיתוח
- `npm run build` — בנייה לפרודקשן
- `npm run preview` — תצוגה מקדימה של הבנייה
