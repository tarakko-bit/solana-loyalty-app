# Solana Loyalty App

Advanced blockchain-powered user management system designed for seamless, secure, and engaging digital interactions across multiple platforms.

## Features

- 🔐 Multi-layer authentication with granular access controls
- 📱 Responsive design supporting desktop and mobile wallet connections
- 📊 Comprehensive admin dashboard for user management
- 💰 Solana blockchain integration with transaction management
- 🔄 Points-based referral system with real-time tracking
- 📲 Mobile-first design with Phantom wallet deep linking
- 🛡️ Enhanced security with session management and CSP
- 🌐 Cross-platform compatibility

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Blockchain**: Solana Web3.js, Phantom Wallet Adapter
- **Authentication**: Session-based auth with PostgreSQL store
- **Security**: Content Security Policy, Rate limiting, Secure sessions

## Environment Setup

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL=your_postgresql_url
PGHOST=your_db_host
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# Production Configuration
NODE_ENV=production  # For production deployment
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. For production:
```bash
npm run build
npm run start
```

## Features Guide

### Admin Dashboard
- Access via `/admin/login`
- Manage user accounts and referrals
- Monitor points distribution
- View system analytics
- Bulk Solana transfer capabilities

### User Features
- Connect Phantom wallet (mobile or desktop)
- Generate unique referral links
- Track earned points
- View referral history
- Request point-to-SOL conversions

### Mobile Integration
- Deep linking with Phantom mobile app
- Automatic wallet detection
- Responsive UI for all screen sizes
- Seamless mobile-to-desktop experience

### Security Features
- Secure session management
- Content Security Policy implementation
- Rate limiting on sensitive endpoints
- Production-ready error handling
- Comprehensive request logging

## Points System

- New user signup: 100 points welcome bonus
- Successful referral: 100 points per referral
- Points can be converted to SOL (managed by admin)
- Real-time points tracking and updates

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support or questions about the platform, please create an issue in the repository.