# BeatSeek - Music Discovery Platform

BeatSeek is a modern music discovery platform where artists can share 30-second snippets of their tracks and listeners can discover new music through an engaging, swipeable feed interface.

## Features

- 🎵 **30-Second Snippets**: Artists share bite-sized previews of their tracks
- 📱 **Swipeable Feed**: TikTok-style vertical scrolling interface
- 👤 **Role-Based Access**: Listener, Artist, and Admin roles
- 🔥 **Trending Algorithm**: Time-decayed engagement scoring
- 🔍 **Search & Filters**: Full-text search and genre filtering
- ♥️ **Engagement Tracking**: Likes, saves, plays, and completion tracking
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode support
- 🔒 **Secure**: Row-level security and validated uploads

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL with RLS
- **Storage**: Supabase Storage for audio and images
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Lovable Cloud account (or Supabase project)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd beatseek
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   The environment variables are automatically configured by Lovable Cloud. If using a custom Supabase project, update with your credentials.

4. **Run the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

   The app will be available at `http://localhost:8080`

## Database Setup

The database schema is managed through migrations in `supabase/migrations/`. 

### Key Tables

- `profiles` - User profile information
- `user_roles` - Role-based access control
- `artist_profiles` - Artist-specific information
- `snippets` - Music snippet metadata
- `user_snippet_interactions` - User engagement (likes, saves)
- `engagement_events` - Detailed engagement tracking
- `follows` - Artist following relationships
- `reports` - Content moderation

### Storage Buckets

- `snippets` - Audio files (max 20MB, 30s duration)
- `covers` - Cover art images
- `avatars` - User profile pictures

## User Roles

### Listener (Default)
- Browse and discover snippets
- Like, save, and share tracks
- Follow artists
- Report inappropriate content

### Artist
- Upload 30-second snippets
- Manage artist profile
- View snippet analytics
- All listener capabilities

### Admin
- Approve/reject snippet uploads
- Review content reports
- Moderate users
- Access all analytics

## Audio Upload Guidelines

- **Format**: MP3, WAV, or M4A
- **Duration**: Maximum 30 seconds
- **File Size**: Maximum 20MB
- **Quality**: Recommended 128-320kbps

Files are validated both client-side and server-side.

## Development

### Project Structure

```
src/
├── components/        # React components
│   ├── Auth/         # Authentication components
│   ├── Feed/         # Feed-related components
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts (Audio, etc.)
├── hooks/            # Custom React hooks
├── integrations/     # Supabase integration
├── pages/            # Page components
└── lib/              # Utility functions

supabase/
├── functions/        # Edge functions
└── migrations/       # Database migrations
```

### Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Type Safety**: TypeScript strict mode
- **Testing**: Playwright for E2E tests

Run quality checks:
```bash
npm run lint
npm run typecheck
```

## Deployment

This project is optimized for deployment on Lovable:

1. Click "Publish" in the Lovable interface
2. Your app will be deployed to `yourapp.lovable.app`
3. Configure custom domains in Project Settings

## Security

- All tables use Row-Level Security (RLS)
- Authentication required for sensitive operations
- Storage buckets have strict access policies
- Input validation on all uploads
- Content reporting system for moderation

## Accessibility

- Keyboard navigation support (↑/↓, Space, L)
- ARIA labels on all interactive elements
- Focus indicators
- Respects `prefers-reduced-motion`
- Color contrast compliance

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Lovable Project: https://lovable.dev/projects/ab79fa62-69c2-4014-b0eb-e671608bc63e
- GitHub Issues: [Your repo issues]

## Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
