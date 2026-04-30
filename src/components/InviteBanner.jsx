import Icon from "./Icon";

export default function InviteBanner({ invite, onAccept, onDecline }) {
  return (
    <div
      className="bg-amber-50 border-b border-amber-200/60 px-4 py-3"
      style={{ animation: "menuDrop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Icon name="mail" size={18} />
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong className="font-semibold">
              {invite.fromName || invite.fromEmail || "מישהו"}
            </strong>{" "}
            מזמינים אותך להצטרף לרשימה משותפת
          </p>
          <p className="text-xs text-amber-800/70 mt-0.5">
            הצטרפות תחליף את הרשימה הנוכחית שלך
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAccept}
              className="bg-brand hover:bg-brand-light text-white rounded-lg px-4 py-1.5 text-sm font-semibold active:scale-[0.97] transition"
            >
              הצטרף
            </button>
            <button
              onClick={onDecline}
              className="bg-white border border-amber-200 text-amber-900 rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-amber-50 transition"
            >
              לא תודה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
