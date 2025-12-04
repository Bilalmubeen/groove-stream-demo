import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MessageBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      // Get conversations the user is a member of
      const { data: memberConversations } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", userId);

      if (!memberConversations?.length) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = memberConversations.map(c => c.conversation_id);

      // Count unread messages not sent by the current user
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .eq("read", false);

      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to message changes
    const channel = supabase
      .channel("message-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
};
