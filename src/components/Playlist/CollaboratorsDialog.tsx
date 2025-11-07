import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Trash2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  invited_at: string;
  accepted_at: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface CollaboratorsDialogProps {
  playlistId: string;
  isOwner: boolean;
}

export function CollaboratorsDialog({ playlistId, isOwner }: CollaboratorsDialogProps) {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("editor");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCollaborators();
    }
  }, [open, playlistId]);

  const loadCollaborators = async () => {
    const { data: collaboratorsData, error } = await supabase
      .from("playlist_collaborators")
      .select("*")
      .eq("playlist_id", playlistId);

    if (error) {
      console.error("Error loading collaborators:", error);
      return;
    }

    if (!collaboratorsData) return;

    // Fetch profiles separately
    const userIds = collaboratorsData.map(c => c.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const enrichedData = collaboratorsData.map(collab => ({
      ...collab,
      profiles: profilesData?.find(p => p.id === collab.user_id)
    }));

    setCollaborators(enrichedData as any);
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("playlist_invites")
        .insert({
          playlist_id: playlistId,
          email,
          role,
          invited_by: userData.user?.id
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole("editor");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("playlist_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;

      toast.success("Collaborator removed");
      loadCollaborators();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleChangeRole = async (collaboratorId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("playlist_collaborators")
        .update({ role: newRole })
        .eq("id", collaboratorId);

      if (error) throw error;

      toast.success("Role updated");
      loadCollaborators();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Manage Collaborators
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Playlist Collaborators</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Invite Collaborator</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="artist@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleInvite} disabled={loading} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold">Current Collaborators</h3>
          {collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collaborators yet</p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={collab.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {collab.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{collab.profiles?.username || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {collab.accepted_at ? "Active" : "Pending"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <Select
                          value={collab.role}
                          onValueChange={(v) => handleChangeRole(collab.id, v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCollaborator(collab.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary">
                        {collab.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                        {collab.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
