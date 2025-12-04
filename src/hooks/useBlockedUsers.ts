import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useBlockedUsers = () => {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBlockedUsers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBlockedUserIds([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    if (error) {
      console.error("Error fetching blocked users:", error);
    } else {
      setBlockedUserIds(data?.map(b => b.blocked_id) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const blockUser = async (userIdToBlock: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: userIdToBlock });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
      return false;
    }

    setBlockedUserIds(prev => [...prev, userIdToBlock]);
    toast({
      title: "User blocked",
      description: "You will no longer see content from this user",
    });
    return true;
  };

  const unblockUser = async (userIdToUnblock: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userIdToUnblock);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
      return false;
    }

    setBlockedUserIds(prev => prev.filter(id => id !== userIdToUnblock));
    toast({
      title: "User unblocked",
      description: "You can now see content from this user again",
    });
    return true;
  };

  const isBlocked = (userId: string) => blockedUserIds.includes(userId);

  return {
    blockedUserIds,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    refetch: fetchBlockedUsers,
  };
};
