import { useAuth } from "./useAuth";
import { useUserList } from "./useUserList";
import { useInvite } from "./useInvite";
import { isFirebaseConfigured } from "./firebase";
import SignIn from "./components/SignIn";
import ShoppingList from "./components/ShoppingList";
import InviteBanner from "./components/InviteBanner";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { listId, loading: listLoading, error, switchToList } =
    useUserList(user);
  const { invite, dismiss } = useInvite(user);

  if (!isFirebaseConfigured) return <Shell><SignIn /></Shell>;

  if (authLoading || (user && listLoading)) {
    return (
      <Shell>
        <Centered>טוען...</Centered>
      </Shell>
    );
  }

  if (!user) return <Shell><SignIn /></Shell>;

  if (error || !listId) {
    return (
      <Shell>
        <Centered>
          <div className="text-red-600 text-sm">
            {error || "שגיאה בטעינת הרשימה"}
          </div>
        </Centered>
      </Shell>
    );
  }

  const showInvite = invite && invite.listId !== listId;

  return (
    <Shell>
      {showInvite && (
        <InviteBanner
          invite={invite}
          onAccept={async () => {
            await switchToList(invite.listId);
            await dismiss();
          }}
          onDecline={dismiss}
        />
      )}
      <ShoppingList user={user} listId={listId} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="mx-auto max-w-md min-h-screen bg-cream-100 shadow-xl shadow-slate-300/40">
      {children}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-stone-500 gap-3">
      <div className="w-10 h-10 rounded-full border-[3px] border-stone-200 border-t-brand animate-spin" />
      <div className="text-sm">{children}</div>
    </div>
  );
}
