import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PlaylistActivityFeedProps {
  playlistId: string;
}

export function PlaylistActivityFeed({ playlistId }: PlaylistActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('playlist-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'playlist_activity',
          filter: `playlist_id=eq.${playlistId}`
        },
        (payload) => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playlistId]);

  const loadActivities = async () => {
    const { data: activityData, error } = await supabase
      .from("playlist_activity")
      .select("*")
      .eq("playlist_id", playlistId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !activityData) return;

    // Fetch profiles separately
    const userIds = [...new Set(activityData.map(a => a.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const enrichedData = activityData.map(activity => ({
      ...activity,
      profiles: profilesData?.find(p => p.id === activity.user_id)
    }));

    setActivities(enrichedData as any);
  };

  const getActionText = (action: string, metadata: any) => {
    switch (action) {
      case "added_snippet":
        return `added "${metadata?.snippet_title || "a snippet"}"`;
      case "removed_snippet":
        return `removed "${metadata?.snippet_title || "a snippet"}"`;
      case "updated_playlist":
        return "updated the playlist";
      case "added_collaborator":
        return `invited ${metadata?.collaborator_name || "someone"}`;
      default:
        return action;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Recent Activity</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {activity.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.profiles?.username || "Someone"}</span>
                    {" "}
                    <span className="text-muted-foreground">
                      {getActionText(activity.action, activity.metadata)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
