import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionedUsers?: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionedUsers,
  placeholder = "Add a comment...",
  className,
}: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search for users when @ is typed
  useEffect(() => {
    const searchMentions = async () => {
      if (!textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex === -1 || cursorPos - atIndex > 30) {
        setShowSuggestions(false);
        return;
      }

      const searchTerm = textBeforeCursor.slice(atIndex + 1);
      
      // Check if there's a space after @, if so, don't show suggestions
      if (searchTerm.includes(" ")) {
        setShowSuggestions(false);
        return;
      }

      setMentionStart(atIndex);

      // Search for users
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `${searchTerm}%`)
        .limit(5);

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    };

    searchMentions();
  }, [value]);

  // Extract mentioned user IDs from text
  useEffect(() => {
    if (!onMentionedUsers) return;

    const mentionRegex = /@(\w+)/g;
    const mentions = value.match(mentionRegex);
    
    if (!mentions) {
      onMentionedUsers([]);
      return;
    }

    const usernames = mentions.map(m => m.slice(1));
    
    supabase
      .from("profiles")
      .select("id")
      .in("username", usernames)
      .then(({ data }) => {
        if (data) {
          onMentionedUsers(data.map(u => u.id));
        }
      });
  }, [value, onMentionedUsers]);

  const insertMention = (profile: Profile) => {
    if (!textareaRef.current || mentionStart === -1) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current.selectionStart);
    const newValue = `${before}@${profile.username} ${after}`;

    onChange(newValue);
    setShowSuggestions(false);

    // Move cursor after the mention
    setTimeout(() => {
      const newPos = mentionStart + profile.username.length + 2;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleClick = () => {
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex-1" onClick={handleClick}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {}}
        placeholder={placeholder}
        className={cn("cursor-text", className)}
        autoComplete="off"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {suggestions.map((profile, index) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => insertMention(profile)}
              className={cn(
                "w-full px-3 py-2 flex items-center gap-2 hover:bg-accent transition-colors text-left",
                index === selectedIndex && "bg-accent"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">{profile.username[0].toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm">@{profile.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
