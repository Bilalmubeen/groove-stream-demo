# BeatSeek - Demo Accounts & Data

## 🎵 Demo Accounts

### Admin Account
- **Email**: `dino606@email.com`
- **Role**: Admin + Artist
- **Artist Name**: Lil Uzi
- **Capabilities**: Full admin access, content moderation, analytics

### Artist/Listener Account  
- **Email**: `musiclover1@email.com`
- **Role**: Artist + Listener
- **Artist Name**: Luna Waves
- **Capabilities**: Upload snippets, engage with content

## 🎤 Demo Artists

### 1. Lil Uzi
- **Genres**: Hip-Hop, Trap
- **Verified**: ✅ Yes
- **Snippets**: 5 tracks
- **Top Track**: "Diamond Chains" (312 likes, 4.5K views)

### 2. Luna Waves
- **Genres**: Electronic, EDM
- **Verified**: ✅ Yes
- **Snippets**: 3 tracks
- **Top Track**: "Sunset Boulevard" (201 likes, 2.9K views)

## 🎧 Demo Snippets (8 total)

| Title | Artist | Genre | Likes | Views | Status |
|-------|--------|-------|-------|-------|--------|
| Diamond Chains | Lil Uzi | Hip-Hop | 312 | 4,532 | ✅ Approved |
| Crazy Flex | Lil Uzi | Trap | 234 | 3,421 | ✅ Approved |
| Purple Vibes | Lil Uzi | Hip-Hop | 178 | 2,567 | ✅ Approved |
| Lil Uzi - 30 (Snippet) | Lil Uzi | Hip-Hop | 127 | 1,543 | ✅ Approved |
| Sunset Boulevard | Luna Waves | Electronic | 201 | 2,890 | ✅ Approved |
| Midnight Drive | Luna Waves | EDM | 156 | 2,103 | ✅ Approved |
| Crystal Tokyo | Luna Waves | EDM | 145 | 1,876 | ✅ Approved |
| Neon Dreams | Luna Waves | Electronic | 89 | 892 | ✅ Approved |

## 📊 Engagement Data

### Seeded Interactions
- **Total Likes**: 50+ interactions
- **Total Saves**: 15+ saves
- **Total Plays**: 100+ play events
- **Engagement Events**: 10+ tracked events (3s retention, completions, replays)
- **Follows**: 2 follow relationships

### Engagement Types Tracked
- ✅ play_start - When a snippet starts playing
- ✅ play_3s - 3-second retention milestone
- ✅ play_complete - Full snippet completion
- ✅ replay - User replays the snippet
- ✅ like - User likes the snippet
- ✅ save - User saves to library
- ✅ share - User shares the snippet

## 🔥 Trending Algorithm

Snippets are ranked using a time-decayed scoring formula:

```
score = (plays×1 + retention×2 + completions×3 + likes×5 + replays×4) / (hours_old + 2)^1.5
```

This ensures:
- Recent content gets boosted
- High engagement = higher ranking
- Older viral content gradually decays
- Balanced discovery for new artists

## 🔍 Search & Discovery Features

### Full-Text Search
- Searches across snippet titles and tags
- Uses PostgreSQL's `tsvector` for performance
- Weighted search (title > tags)

### Genre Filters
Available genres:
- Hip-Hop
- Trap
- Electronic
- EDM
- Pop
- Rock
- R&B
- Jazz
- Indie Pop
- Lo-Fi
- House
- Soul
- Classical
- Other

## ⌨️ Keyboard Shortcuts

- **↑/↓ Arrow Keys** - Navigate between snippets
- **Space** - Play/Pause current snippet
- **L** - Like current snippet

## 🎨 Features Demonstrated

✅ Vertical scrolling feed (TikTok-style)
✅ Autoplay on scroll into view
✅ Pause on tab blur/visibility change
✅ Real-time engagement tracking
✅ Search with filters
✅ Trending algorithm
✅ Role-based access control
✅ Artist profiles & verification
✅ Like, save, share functionality
✅ Follow system
✅ Content moderation (reports table)

## 🚀 Next Steps

1. **Login** with one of the demo accounts
2. **Explore** the feed by scrolling
3. **Interact** with snippets (like, save, share)
4. **Search** for specific tracks or genres
5. **Upload** new snippets (as artist account)
6. **Moderate** content (as admin account)

## 📱 Mobile Experience

All features work seamlessly on mobile:
- Touch-friendly interface
- Swipe to navigate
- Native share API integration
- Responsive design
- Optimized for small screens

## 🔒 Security Features

✅ Row-level security on all tables
✅ Storage bucket access policies
✅ Authentication required for uploads
✅ Input validation (30s max, 20MB limit)
✅ Content reporting system
✅ Admin-only moderation

---

**Note**: All snippets currently use the same audio file (`lil-uzi-30-snippet.mp3`) for demonstration purposes. In production, each would have unique audio files uploaded to Supabase Storage.
