import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Settings, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProfileHeaderProps {
  userId: string;
  isOwnProfile: boolean;
  onUploadClick: () => void;
  onEditClick: () => void;
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

export function ProfileHeader({ userId, isOwnProfile, onUploadClick, onEditClick }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData>({ followers: 0, following: 0, likes: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

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
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-primary/20">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username} />
          <AvatarFallback className="text-2xl">{getInitials(profile?.username || 'U')}</AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{profile?.username}</h1>
            <p className="text-muted-foreground">@{profile?.username}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
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
            <p className="text-sm text-foreground max-w-md line-clamp-3">{profile.bio}</p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {isOwnProfile ? (
              <>
                <Button
                  variant="gradient"
                  onClick={onUploadClick}
                  className="flex-1 sm:flex-initial"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Snippet
                </Button>
                <Button
                  variant="outline"
                  onClick={onEditClick}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={isFollowing ? 'outline' : 'gradient'}
                  onClick={handleFollow}
                  className="flex-1 sm:flex-initial"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
