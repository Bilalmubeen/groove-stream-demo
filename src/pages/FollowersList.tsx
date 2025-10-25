import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface UserFollow {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  isFollowing: boolean;
  isMutual: boolean;
}

export default function FollowersList() {
  const navigate = useNavigate();
  const { handle } = useParams();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<UserFollow[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [profileUserId, setProfileUserId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [handle]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get profile user ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", handle || "")
        .single();

      if (!profile) {
        toast.error("User not found");
        navigate(-1);
        return;
      }
      setProfileUserId(profile.id);

      // Fetch followers
      const { data: followersData } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq("following_id", profile.id);

      // Fetch following
      const { data: followingData } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            username,
            avatar_url,
            bio
          )
        `)
        .eq("follower_id", profile.id);

      // Get current user's follows
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = new Set(myFollows?.map(f => f.following_id) || []);

      // Get mutual follows
      const followerIds = new Set(followersData?.map(f => f.follower_id) || []);
      const followingIds = new Set(followingData?.map(f => f.following_id) || []);

      setFollowers(
        followersData?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
          avatar_url: f.profiles.avatar_url,
          bio: f.profiles.bio,
          isFollowing: myFollowingIds.has(f.profiles.id),
          isMutual: followingIds.has(f.profiles.id)
        })) || []
      );

      setFollowing(
        followingData?.map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
          avatar_url: f.profiles.avatar_url,
          bio: f.profiles.bio,
          isFollowing: myFollowingIds.has(f.profiles.id),
          isMutual: followerIds.has(f.profiles.id)
        })) || []
      );
    } catch (error) {
      toast.error("Failed to load followers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId);
        
        toast.success("Unfollowed");
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: userId
          });

        // Create notification
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "follow",
            from_user_id: currentUserId
          });
        
        toast.success("Following");
      }

      // Update local state
      const updateUser = (user: UserFollow) =>
        user.id === userId ? { ...user, isFollowing: !currentlyFollowing } : user;
      
      setFollowers(prev => prev.map(updateUser));
      setFollowing(prev => prev.map(updateUser));
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  const UserCard = ({ user }: { user: UserFollow }) => (
    <div className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
      <button
        onClick={() => navigate(`/u/${user.username}`)}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <Avatar className="w-12 h-12">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{user.username}</h3>
            {user.isMutual && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                Mutual
              </span>
            )}
          </div>
          {user.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>
          )}
        </div>
      </button>
      {user.id !== currentUserId && (
        <Button
          variant={user.isFollowing ? "outline" : "default"}
          size="sm"
          onClick={() => handleFollow(user.id, user.isFollowing)}
          className="gap-2"
        >
          {user.isFollowing ? (
            <>
              <UserCheck className="w-4 h-4" />
              Following
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Follow
            </>
          )}
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-2xl mx-auto p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{handle}</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="max-w-2xl mx-auto">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="followers">
                Followers {followers.length > 0 && `(${followers.length})`}
              </TabsTrigger>
              <TabsTrigger value="following">
                Following {following.length > 0 && `(${following.length})`}
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="followers" className="mt-0">
            {followers.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">No followers yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {followers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-0">
            {following.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">Not following anyone yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {following.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
