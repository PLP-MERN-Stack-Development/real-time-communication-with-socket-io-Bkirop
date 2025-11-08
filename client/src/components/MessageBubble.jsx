import { Avatar } from "./ui/avatar";
import { cn } from "../lib/utils";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "numeric"
});

const statusLabelMap = {
  sent: "Sent",
  delivered: "Delivered",
  seen: "Seen"
};

export default function MessageBubble({
  message,
  isMine,
  currentUser,
  otherMember
}) {
  const timestamp = message?.createdAt ? new Date(message.createdAt) : null;
  const statusLabel = statusLabelMap[message.status] || "Sent";

  return (
    <div
      className={cn(
        "flex items-end gap-3",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {!isMine && (
        <Avatar
          size="sm"
          src={message.senderAvatar || otherMember?.avatarUrl}
          alt={message.senderName}
          fallback={message.senderName}
        />
      )}

      <div
        className={cn(
          "flex max-w-xl flex-col gap-1",
          isMine ? "items-end text-right" : "items-start text-left"
        )}
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {isMine ? currentUser?.name : message.senderName}
        </p>
        <div
          className={cn(
            "rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg",
            isMine
              ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white shadow-indigo-900/40"
              : "border border-white/10 bg-white text-slate-900"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400/90">
          {timestamp && <span>{timeFormatter.format(timestamp)}</span>}
          {isMine && (
            <span
              className={cn(
                "font-semibold",
                message.status === "seen" ? "text-emerald-300" : "text-indigo-200"
              )}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {isMine && (
        <Avatar
          size="sm"
          src={currentUser?.avatar}
          alt={currentUser?.name}
          fallback={currentUser?.name}
        />
      )}
    </div>
  );
}
