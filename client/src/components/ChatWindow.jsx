import { useEffect, useMemo, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { useSocket } from "../hooks/useSocket";

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ChatWindow({
  messagesApi,
  conversation,
  conversationId,
  currentUser,
  onConversationSeen,
  onMessageSent,
  isBootstrapping,
  currentUserId
}) {
  const service = useMemo(() => {
    if (messagesApi) return messagesApi;
    return {
      async list() {
        return [];
      },
      async send() {
        throw new Error("messagesApi not provided");
      }
    };
  }, [messagesApi]);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const viewportRef = useRef(null);
  const conversationIdRef = useRef(conversationId);

  const socket = useSocket(currentUserId);

  // determine the other participant
  const otherMember = useMemo(() => {
    if (!conversation || !currentUser?.id) return null;
    if (conversation.isGroup) return null;
    return (
      conversation.members?.find(
        (member) => member.clerkUserId !== currentUser.id
      ) || null
    );
  }, [conversation, currentUser]);

  // reset state when changing conversations
  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError(null);
  }, [conversationId]);

  // load conversation history
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setIsLoading(true);
    (async () => {
      try {
        const data = await service.list(conversationId);
        if (!active) return;
        setMessages(Array.isArray(data) ? data : []);
        onConversationSeen?.(conversationId);
      } catch (err) {
        if (active) {
          setError("We couldn't fetch the conversation history. Please retry.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [service, conversationId, onConversationSeen]);

  // auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // join conversation room via socket.io
  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (!socket || !conversationId) return;

    socket.emit("conversation:join", conversationId);

    // handle incoming messages in real-time
    const handleNewMessage = ({ conversationId: id, message }) => {
      if (id === conversationIdRef.current) {
        setMessages((prev) => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    };

    // handle conversation updates (e.g., unread counts)
    const handleConversationUpdate = ({ conversationId: id }) => {
      if (id === conversationIdRef.current) {
        onConversationSeen?.(id);
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("conversation:update", handleConversationUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:update", handleConversationUpdate);
      socket.emit("conversation:leave", conversationIdRef.current);
    };
  }, [socket, conversationId, onConversationSeen]);

  // sending message handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !conversationId) return;

    setIsSending(true);
    setError(null);

    try {
      const nextMessage = await service.send(conversationId, draft.trim());
      
      // Check if message already exists before adding
      setMessages((prev) => {
        const exists = prev.some(m => m._id === nextMessage._id);
        if (exists) return prev;
        return [...prev, nextMessage];
      });
      
      onMessageSent?.(conversationId, nextMessage);

      // emit real-time event so others see instantly
      socket?.emit("message:new", {
        conversationId,
        message: nextMessage,
      });

      setDraft("");
    } catch (err) {
      setError("Your message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isBootstrapping) {
    return (
      <section className="flex flex-1 flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-slate-300">
        Preparing your conversations…
      </section>
    );
  }

  if (!conversationId || !conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
        <p className="max-w-xs">
          Choose a conversation from the sidebar or start a new one to begin
          chatting.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={
              conversation.isGroup
                ? conversation.avatar
                : otherMember?.avatarUrl
            }
            alt={conversation.name}
            fallback={conversation.name}
          />
          <div>
            <p className="text-sm font-semibold text-white">
              {conversation.name}
            </p>
            <p className="text-xs text-slate-400">
              {otherMember?.lastSeenAt
                ? `Last seen ${longDateFormatter.format(
                    new Date(otherMember.lastSeenAt)
                  )}`
                : conversation.isGroup
                ? `${conversation.members?.length || 0} participants`
                : "Online"}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="hidden rounded-full border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100 sm:inline-flex"
        >
          Live Socket Chat
        </Badge>
      </header>

      <div
        ref={viewportRef}
        className="custom-scroll flex-1 space-y-4 overflow-y-auto bg-chat-gradient px-6 py-6"
      >
        {isLoading && (
          <div className="text-sm text-slate-300">Loading messages…</div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-slate-400">
            No messages yet — start the conversation.
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message._id ? `${message._id}-${index}` : `msg-${message.senderId}-${message.createdAt}-${index}`}
            message={message}
            isMine={message.senderId === currentUser.id}
            currentUser={currentUser}
            otherMember={otherMember}
          />
        ))}
      </div>

      <footer className="border-t border-white/10 bg-white/[0.04] px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message..."
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!draft.trim() || isSending}
            className={cn(isSending && "opacity-75")}
          >
            {isSending ? "Sending…" : "Send"}
          </Button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-red-300">{error}</p>
        )}
      </footer>
    </section>
  );
}
