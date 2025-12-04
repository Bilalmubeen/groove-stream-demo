import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Settings, UserPlus, UserMinus, MessageCircle, BarChart3, Ban, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ClickableText } from '@/components/ui/clickable-text';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileHeaderProps {
  userId: string;
  isOwnProfile: boolean;
  onUploadClick: () => void;
  onEditClick: () => void;
  isArtist?: boolean;
}

interface ProfileData {
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface StatsData {
  followers: number;
  following: number;
  likes: number;
}

export function ProfileHeader({ userId, isOwnProfile, onUploadClick, onEditClick, isArtist = false }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData>({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();

  useEffect(() => {
    loadProfile();
    loadStats();
    if (!isOwnProfile) {
      checkFollowStatus();
    }
  }, [userId, isOwnProfile]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error loading profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [followersRes, followingRes, likesRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
        supabase.from('artist_profiles').select('total_likes').eq('user_id', userId).maybeSingle(),
      ]);

      setStats({
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        likes: likesRes.data?.total_likes || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Please sign in to follow',
          variant: 'destructive',
        });
        return;
      }

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
        
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        
        if (error) throw error;
        
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error updating follow status',
        variant: 'destructive',
      });
    }
  };

  const handleMessage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Please sign in to message',
          variant: 'destructive',
        });
        return;
      }

      // Check if conversation already exists
      const { data: existingMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConversations = existingMembers?.map(m => m.conversation_id) || [];

      if (myConversations.length > 0) {
        // Check if any of these conversations include the other user
        const { data: otherUserMemberships } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', userId)
          .in('conversation_id', myConversations);

        if (otherUserMemberships && otherUserMemberships.length > 0) {
          // Conversation exists, navigate to it
          navigate(`/messages?conversation=${otherUserMemberships[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation with client-generated ID to avoid SELECT policy issue
      const newConversationId = crypto.randomUUID();
      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: newConversationId });

      if (convError) throw convError;

      // Add current user as member first
      const { error: currentUserError } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: newConversationId, user_id: user.id });

      if (currentUserError) throw currentUserError;

      // Then add other user as member
      const { error: otherUserError } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: newConversationId, user_id: userId });

      if (otherUserError) throw otherUserError;

      // Navigate to messages with new conversation
      navigate(`/messages?conversation=${newConversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error starting conversation',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
        {/* Avatar */}
        <Avatar className={cn(
          "border-2 border-primary/20",
          isMobile ? "w-20 h-20" : "w-24 h-24 sm:w-32 sm:h-32"
        )}>
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} />
          <AvatarFallback className={isMobile ? "text-xl" : "text-2xl"}>{getInitials(profile?.username || 'U')}</AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 space-y-3 md:space-y-4 w-full">
          <div>
            <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl sm:text-3xl")}>{profile?.username}</h1>
            <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-base")}>@{profile?.username}</p>
          </div>

          {/* Stats */}
          <div className={cn("flex items-center gap-4 md:gap-6", isMobile ? "text-xs" : "text-sm")}>
            <button 
              onClick={() => navigate(`/u/${profile?.username}/followers`)}
              className="hover:text-primary transition-smooth"
            >
              <span className="font-semibold">{stats.followers}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </button>
            <button 
              onClick={() => navigate(`/u/${profile?.username}/followers`)}
              className="hover:text-primary transition-smooth"
            >
              <span className="font-semibold">{stats.following}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </button>
            <div>
              <span className="font-semibold">{stats.likes}</span>
              <span className="text-muted-foreground ml-1">Likes</span>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <div className={cn("text-foreground max-w-md line-clamp-3", isMobile ? "text-xs" : "text-sm")}>
              <ClickableText text={profile.bio} />
            </div>
          )}

          {/* Action Buttons */}
          <div className={cn("flex flex-wrap items-center gap-2 md:gap-3 pt-2")}>
            {isOwnProfile ? (
              <>
                <Button
                  variant="gradient"
                  onClick={onUploadClick}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-initial"
                >
                  <Upload className={cn(isMobile ? "w-3 h-3" : "w-4 h-4", !isMobile && "mr-2")} />
                  {!isMobile && "Upload Snippet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={onEditClick}
                  size={isMobile ? "sm" : "default"}
                  className={isMobile ? "flex-1" : ""}
                >
                  {isMobile ? "Edit" : "Edit Profile"}
                </Button>
                {isArtist && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/analytics')}
                    size={isMobile ? "sm" : "default"}
                  >
                    <BarChart3 className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  size={isMobile ? "sm" : "default"}
                >
                  <Settings className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={isFollowing ? 'outline' : 'gradient'}
                  onClick={handleFollow}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-initial"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className={cn(isMobile ? "w-3 h-3" : "w-4 h-4", !isMobile && "mr-2")} />
                      {!isMobile && "Unfollow"}
                    </>
                  ) : (
                    <>
                      <UserPlus className={cn(isMobile ? "w-3 h-3" : "w-4 h-4", !isMobile && "mr-2")} />
                      {!isMobile && "Follow"}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMessage}
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-initial"
                >
                  <MessageCircle className={cn(isMobile ? "w-3 h-3" : "w-4 h-4", !isMobile && "mr-2")} />
                  {!isMobile && "Message"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size={isMobile ? "sm" : "default"}>
                      <MoreHorizontal className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => isBlocked(userId) ? unblockUser(userId) : blockUser(userId)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {isBlocked(userId) ? "Unblock User" : "Block User"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
