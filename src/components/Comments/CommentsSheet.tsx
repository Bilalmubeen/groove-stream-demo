import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Pin, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MentionTextarea } from "./MentionTextarea";
import { ClickableText } from "@/components/ui/clickable-text";

interface Comment {
  id: string;
  text: string;
  pinned: boolean;
  ms_timestamp?: number;
  created_at: string;
  user_id: string;
  parent_comment_id?: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  replies?: Comment[];
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
}

interface CommentsSheetProps {
  snippetId: string;
  isOpen: boolean;
  onClose: () => void;
  isArtist?: boolean;
}

export function CommentsSheet({ snippetId, isOpen, onClose, isArtist }: CommentsSheetProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      const unsubscribe = subscribeToComments();
      return unsubscribe;
    }
  }, [isOpen, snippetId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq("snippet_id", snippetId)
        .is("parent_comment_id", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from("reactions")
            .select("emoji, user_id")
            .eq("comment_id", comment.id);

          const reactionCounts = reactions?.reduce((acc: any, r) => {
            if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
            acc[r.emoji].count++;
            acc[r.emoji].userIds.push(r.user_id);
            return acc;
          }, {});

          const { data: replies } = await supabase
            .from("comments")
            .select(`*, profiles (username, avatar_url)`)
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          return {
            ...comment,
            reactions: Object.values(reactionCounts || {}).map((r: any) => ({
              emoji: r.emoji,
              count: r.count,
              userReacted: r.userIds.includes(currentUserId)
            })),
            replies: replies || []
          };
        })
      );

      setComments(commentsWithReactions);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${snippetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `snippet_id=eq.${snippetId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId) return;

    setIsLoading(true);
    try {
      const { data: commentData, error } = await supabase
        .from("comments")
        .insert({
          snippet_id: snippetId,
          user_id: currentUserId,
          text: newComment,
          parent_comment_id: replyingTo
        })
        .select()
        .single();

      if (error) throw error;

      if (mentionedUserIds.length > 0 && commentData) {
        try {
          await supabase
            .from("mentions")
            .insert(
              mentionedUserIds.map(userId => ({
                comment_id: commentData.id,
                mentioned_user_id: userId
              }))
            );
        } catch (mentionError) {
          console.error("Failed to store mentions:", mentionError);
        }
      }

      setNewComment("");
      setReplyingTo(null);
      setMentionedUserIds([]);
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinComment = async (commentId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ pinned: !currentlyPinned })
        .eq("id", commentId);

      if (error) throw error;
      toast.success(currentlyPinned ? "Comment unpinned" : "Comment pinned");
    } catch (error) {
      toast.error("Failed to pin comment");
    }
  };

  const handleReaction = async (commentId: string, emoji: string, currentlyReacted: boolean) => {
    try {
      if (currentlyReacted) {
        await supabase
          .from("reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("reactions")
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
            emoji
          });
      }
      fetchComments();
    } catch (error) {
      toast.error("Failed to react");
    }
  };

  const handleCommentChange = useCallback((value: string) => {
    setNewComment(value);
  }, []);

  const handleMentionedUsers = useCallback((userIds: string[]) => {
    setMentionedUserIds(userIds);
  }, []);

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12 mt-2' : ''} space-y-2`}>
      <div className="flex gap-3">
        <button onClick={() => navigate(`/u/${comment.profiles.username}`)}>
          <Avatar className="w-8 h-8">
            <AvatarImage src={comment.profiles.avatar_url} />
            <AvatarFallback>{comment.profiles.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/u/${comment.profiles.username}`)}
              className="font-semibold text-sm hover:underline"
            >
              {comment.profiles.username}
            </button>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.pinned && (
              <Pin className="w-3 h-3 text-primary" />
            )}
          </div>
          <div className="text-sm mt-1">
            <ClickableText text={comment.text} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            {['🔥', '❤️', '😂'].map((emoji) => {
              const reaction = comment.reactions?.find(r => r.emoji === emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(comment.id, emoji, reaction?.userReacted || false)}
                  className={`flex items-center gap-1 text-xs transition-transform hover:scale-110 ${
                    reaction?.userReacted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <span>{emoji}</span>
                  {reaction && reaction.count > 0 && <span>{reaction.count}</span>}
                </button>
              );
            })}
            {!isReply && (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {isArtist && (
              <button
                onClick={() => handlePinComment(comment.id, comment.pinned)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {comment.pinned ? 'Unpin' : 'Pin'}
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  const commentsContent = (
    <>
      <div className="flex-1 overflow-y-auto space-y-4 my-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Replying to comment</span>
            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
              Cancel
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <MentionTextarea
            value={newComment}
            onChange={handleCommentChange}
            onMentionedUsers={handleMentionedUsers}
            placeholder="Add a comment... Use @ to mention users"
            className="resize-none min-h-[60px]"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !newComment.trim() || !currentUserId}
            size="icon"
            className="flex-shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments {comments.length > 0 && `(${comments.length})`}
            </SheetTitle>
          </SheetHeader>
          {commentsContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments {comments.length > 0 && `(${comments.length})`}
          </DialogTitle>
        </DialogHeader>
        {commentsContent}
      </DialogContent>
    </Dialog>
  );
}
