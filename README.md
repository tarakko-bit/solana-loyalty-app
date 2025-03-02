# Solana Loyalty App

Advanced blockchain-powered user management system designed for seamless, secure, and engaging digital interactions across multiple platforms.

## Features

- 🔐 Multi-layer authentication with granular access controls
- 📱 Responsive design supporting desktop and mobile wallet connections
- 📊 Comprehensive admin dashboard for user management
- 💰 Solana blockchain integration with transaction management
- 🔄 Referral system with points tracking
- 📲 Mobile wallet connection with error handling

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Blockchain**: Solana Web3.js, Phantom Wallet Adapter
- **Authentication**: Passport.js, 2FA with TOTP
- **Security**: Session management, Rate limiting, bcrypt encryption

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/tarakko-bit/solana-loyalty-app.git
cd solana-loyalty-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file with:
```
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_session_secret
```

4. Start the development server
```bash
npm run dev
```

## Usage

### Admin Dashboard
- Access the admin panel at `/admin/login`
- Default admin credentials are provided during setup
- Enable 2FA for enhanced security
- Monitor user registrations and referrals
- Manage bulk Solana transfers

### User Features
- Connect Phantom wallet
- Generate and share referral links
- Track points earned through referrals
- Request point-to-SOL conversions

### Mobile Support
- Access via Phantom mobile app
- Seamless deep linking integration
- Responsive UI for all screen sizes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
