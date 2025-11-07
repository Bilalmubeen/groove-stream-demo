import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PlaylistInvite() {
  const { id: playlistId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvite();
  }, [playlistId, token]);

  const loadInvite = async () => {
    try {
      // Check if user is authenticated
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate("/login");
        return;
      }

      // Load invite
      const { data: inviteData, error: inviteError } = await supabase
        .from("playlist_invites")
        .select("*")
        .eq("playlist_id", playlistId)
        .eq("token", token)
        .single();

      if (inviteError || !inviteData) {
        setError("Invalid or expired invitation");
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setError("This invitation has expired");
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (inviteData.accepted) {
        setError("This invitation has already been accepted");
        setLoading(false);
        return;
      }

      setInvite(inviteData);

      // Load playlist details
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .single();

      if (!playlistError && playlistData) {
        setPlaylist(playlistData);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

      // Add user as collaborator
      const { error: collabError } = await supabase
        .from("playlist_collaborators")
        .insert({
          playlist_id: playlistId,
          user_id: userData.user?.id,
          role: invite.role,
          invited_by: invite.invited_by,
          accepted_at: new Date().toISOString()
        });

      if (collabError) throw collabError;

      // Mark invite as accepted
      await supabase
        .from("playlist_invites")
        .update({ accepted: true })
        .eq("id", invite.id);

      // Log activity
      await supabase
        .from("playlist_activity")
        .insert({
          playlist_id: playlistId,
          user_id: userData.user?.id,
          action: "accepted_invite",
          metadata: { role: invite.role }
        });

      toast.success("You've joined the playlist!");
      navigate(`/playlist/${playlistId}`);
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  const handleDecline = () => {
    toast.info("Invitation declined");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-center">Playlist Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to collaborate on a playlist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="font-semibold">{playlist?.title}</p>
            <p className="text-sm text-muted-foreground">{playlist?.description}</p>
            <p className="text-sm">
              Role: <span className="font-medium capitalize">{invite?.role}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDecline} variant="outline" className="flex-1">
              Decline
            </Button>
            <Button onClick={handleAccept} className="flex-1">
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
