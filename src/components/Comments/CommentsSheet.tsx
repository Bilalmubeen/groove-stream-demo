import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Pin, Heart, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useEngagement } from "@/hooks/useEngagement";

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
  const { trackEvent } = useEngagement();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      subscribeToComments();
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

      // Fetch reactions for each comment
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
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          snippet_id: snippetId,
          user_id: currentUserId,
          text: newComment,
          parent_comment_id: replyingTo
        });

      if (error) throw error;

      // Don't track comment event via engagement - just update UI
      setNewComment("");
      setReplyingTo(null);
      toast.success("Comment posted!");
    } catch (error) {
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

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-12 mt-2' : ''} space-y-2`}>
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
          <p className="text-sm mt-1">{comment.text}</p>

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

      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} isReply />
      ))}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments {comments.length > 0 && `(${comments.length})`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 my-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
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
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="resize-none"
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !newComment.trim()}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
