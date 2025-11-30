import { useState, useRef, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HashtagInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  maxHashtags?: number;
  placeholder?: string;
  className?: string;
}

export function HashtagInput({
  hashtags,
  onChange,
  maxHashtags = 10,
  placeholder = "Add hashtags (press Enter)...",
  className,
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeHashtag = (tag: string) => {
    // Remove # if present, convert to lowercase, remove spaces and special chars
    return tag
      .replace(/^#/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30); // Max 30 chars per hashtag
  };

  const addHashtag = (tag: string) => {
    const normalized = normalizeHashtag(tag);
    
    if (!normalized) return;
    if (hashtags.includes(normalized)) return;
    if (hashtags.length >= maxHashtags) return;

    onChange([...hashtags, normalized]);
    setInputValue("");
  };

  const removeHashtag = (tagToRemove: string) => {
    onChange(hashtags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue.trim());
      }
    } else if (e.key === "Backspace" && !inputValue && hashtags.length > 0) {
      // Remove last hashtag on backspace if input is empty
      removeHashtag(hashtags[hashtags.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addHashtag(inputValue.trim());
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {hashtags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            #{tag}
            <button
              type="button"
              onClick={() => removeHashtag(tag)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={
          hashtags.length >= maxHashtags
            ? `Max ${maxHashtags} hashtags reached`
            : placeholder
        }
        disabled={hashtags.length >= maxHashtags}
        className="text-sm"
      />

      <p className="text-xs text-muted-foreground">
        {hashtags.length}/{maxHashtags} hashtags • Press Enter to add
      </p>
    </div>
  );
}
