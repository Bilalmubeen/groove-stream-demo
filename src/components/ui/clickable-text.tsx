import { Link } from "react-router-dom";

interface ClickableTextProps {
  text: string;
  className?: string;
}

export function ClickableText({ text, className = "" }: ClickableTextProps) {
  // Regular expression to match hashtags and mentions
  const regex = /(#[\w]+|@[\w]+)/g;
  
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          // Hashtag - link to search
          return (
            <Link
              key={index}
              to={`/search?q=${encodeURIComponent(part)}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        } else if (part.startsWith('@')) {
          // Mention - link to search for now (could be profile later)
          return (
            <Link
              key={index}
              to={`/search?q=${encodeURIComponent(part)}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
}
