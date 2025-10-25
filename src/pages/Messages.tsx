import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  last_message?: {
    text: string;
    created_at: string;
    read: boolean;
  };
}

interface Message {
  id: string;
  text: string;
  sender_id: string;
  read: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      subscribeToMessages(selectedConversation);
      markMessagesAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  const initializeChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUserId(user.id);
      await fetchConversations(user.id);
    } catch (error) {
      toast.error("Failed to initialize chat");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversations = async (userId: string) => {
    try {
      const { data: members } = await supabase
        .from("conversation_members")
        .select(`
          conversation_id,
          conversations (
            id,
            updated_at
          )
        `)
        .eq("user_id", userId);

      const conversationIds = members?.map(m => m.conversation_id) || [];

      const conversationsWithUsers = await Promise.all(
        conversationIds.map(async (convId) => {
          const { data: otherMember } = await supabase
            .from("conversation_members")
            .select(`
              user_id,
              profiles (
                id,
                username,
                avatar_url
              )
            `)
            .eq("conversation_id", convId)
            .neq("user_id", userId)
            .single();

          const { data: lastMessage } = await supabase
            .from("messages")
            .select("text, created_at, read")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const conv = members?.find(m => m.conversation_id === convId)?.conversations;

          return {
            id: convId,
            updated_at: conv?.updated_at || "",
            other_user: {
              id: otherMember?.profiles?.id || "",
              username: otherMember?.profiles?.username || "",
              avatar_url: otherMember?.profiles?.avatar_url || ""
            },
            last_message: lastMessage || undefined
          };
        })
      );

      setConversations(conversationsWithUsers.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast.error("Failed to load messages");
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          markMessagesAsRead(conversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .eq("read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUserId,
          text: newMessage
        });

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation);

      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-border/50`}>
        <header className="p-4 border-b border-border/50 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Messages</h1>
        </header>

        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b border-border/50 ${
                  selectedConversation === conv.id ? 'bg-accent/50' : ''
                } ${conv.last_message && !conv.last_message.read ? 'bg-primary/5' : ''}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.other_user.avatar_url} />
                  <AvatarFallback>{conv.other_user.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{conv.other_user.username}</h3>
                  {conv.last_message && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {conv.last_message.text}
                    </p>
                  )}
                </div>
                {conv.last_message && !conv.last_message.read && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          <header className="p-4 border-b border-border/50 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
              className="md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={conversations.find(c => c.id === selectedConversation)?.other_user.avatar_url} />
              <AvatarFallback>
                {conversations.find(c => c.id === selectedConversation)?.other_user.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-semibold">
              {conversations.find(c => c.id === selectedConversation)?.other_user.username}
            </h2>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.profiles.avatar_url} />
                  <AvatarFallback>{message.profiles.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${message.sender_id === currentUserId ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-xs ${
                      message.sender_id === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'glass'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
}
