import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedGenre: string;
  onGenreChange: (value: string) => void;
}

const genres = [
  { value: 'all', label: 'All Genres' },
  { value: 'hiphop', label: 'Hip Hop' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'rnb', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'country', label: 'Country' },
  { value: 'classical', label: 'Classical' },
];

export function SearchBar({ searchQuery, onSearchChange, selectedGenre, onGenreChange }: SearchBarProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex gap-2 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <button
        onClick={() => navigate('/search')}
        className="relative flex-1 text-left"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tracks, artists, playlists..."
          value=""
          readOnly
          className="pl-10 cursor-pointer"
        />
      </button>
      <Select value={selectedGenre} onValueChange={onGenreChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent>
          {genres.map((genre) => (
            <SelectItem key={genre.value} value={genre.value}>
              {genre.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
