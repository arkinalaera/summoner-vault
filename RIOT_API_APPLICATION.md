# LoL Account Manager - Riot API Application

## Application Information

**Application Name:** LoL Account Manager
**Application Type:** Desktop Application (Electron-based)
**Developer:** arkinalaera
**Repository:** https://github.com/arkinalaera/summoner-vault
**Demo URL:** https://arkinalaera.github.io/summoner-vault/

## Application Description

LoL Account Manager is a free, open-source desktop application that helps League of Legends players manage multiple accounts and track their ranked progression across all regions.

### Core Functionality

1. **Account Management**
   - Store and organize multiple League of Legends accounts
   - Securely encrypt login credentials using AES-256-GCM
   - Track account information (summoner name, region, notes)

2. **Rank Tracking**
   - Automatically fetch and display Solo Queue and Flex Queue ranks
   - Show rank emblems (Iron to Challenger) with divisions
   - Display game counts and ranked statistics
   - Cache data for 1 hour to minimize API calls

3. **Search & Filter**
   - Filter accounts by rank tier or region
   - Search accounts by summoner name
   - Drag-and-drop reordering

4. **Game Client Integration**
   - Auto-accept match queue using League Client Update (LCU) API
   - Monitor game client status in real-time

### User Interface

- Modern dark theme optimized for gaming
- Built with React, TypeScript, and Tailwind CSS
- Responsive design with real-time updates
- System tray integration for background operation

## Riot API Endpoints Used

### 1. Summoner-V4
- **GET** `/lol/summoner/v4/summoners/by-riot-id/{gameName}/{tagLine}`
  - Purpose: Retrieve summoner profile data (PUUID, summoner ID, profile icon, level)
  - Frequency: Once per account on creation/update

### 2. League-V4
- **GET** `/lol/league/v4/entries/by-summoner/{encryptedSummonerId}`
  - Purpose: Fetch ranked statistics (tier, division, LP, wins, losses)
  - Frequency: On startup (if cache expired) or manual refresh

### 3. Data Dragon (Static Assets)
- **GET** `https://ddragon.leagueoflegends.com/cdn/{version}/img/profileicon/{iconId}.png`
  - Purpose: Display summoner profile icons
  - Frequency: On-demand when displaying accounts

## Rate Limiting Implementation

### Current Implementation

```typescript
const API_CONFIG = {
  RATE_LIMIT_PER_SECOND: 19,  // Safety margin (Riot limit: 20/sec)
  RATE_LIMIT_WINDOW: 1000,     // 1 second window
  CACHE_DURATION_MS: 3600000,  // 1 hour cache
  RETRY_DELAY: 2000,           // 2 seconds for 429 errors
}
```

### Rate Limiting Strategy

1. **Request Queue System**
   - Sequential processing with 50ms delays between requests
   - Prevents burst requests that could trigger rate limits

2. **Smart Caching**
   - 1-hour cache for summoner and rank data
   - Reduces redundant API calls significantly
   - Cache timestamp stored per account

3. **429 Handling**
   - Automatic retry with exponential backoff
   - Respects `Retry-After` header when present
   - Maximum 3 retry attempts per request

4. **User Configuration**
   - Users can provide their own API key to avoid shared rate limits
   - API key stored securely in local settings

## Expected API Usage

### Per User Metrics

**Initial Setup (First Launch):**
- Average user: 2-5 accounts
- API calls: 2 calls per account × 5 accounts = **10 calls total**
  - 1 × Summoner-V4 call (get summoner data)
  - 1 × League-V4 call (get ranked data)

**Daily Usage (Typical):**
- Manual rank refresh: 1-3 times per day
- API calls per refresh: 1 call per account
- Total: 5 accounts × 3 refreshes = **15 calls/day**

**Peak Usage:**
- Auto-refresh on startup: Once per day (if cache expired)
- Manual refreshes: 5 times per day (worst case)
- Total: **50 calls/day per active user**

### Estimated User Base

**Target Audience:**
- Content creators managing multiple accounts
- Professional players with multiple smurfs
- Account traders/sellers
- Esports team managers

**Expected Users:**
- Month 1-3: 100-500 users
- Month 4-6: 500-2,000 users
- Year 1: 2,000-5,000 users

### Total API Usage Projection

**Conservative Estimate (500 active users):**
- Average calls per user per day: 30
- Total daily calls: 500 × 30 = **15,000 calls/day**
- Peak hourly rate: ~2,000 calls/hour
- Well within Production API limits

**Growth Scenario (5,000 active users):**
- Total daily calls: 5,000 × 30 = **150,000 calls/day**
- Peak hourly rate: ~20,000 calls/hour

## Data Storage & Privacy

- **Local Storage Only**: All data stored locally on user's device
- **No Cloud Sync**: Application does not transmit data to external servers
- **Encrypted Credentials**: Passwords encrypted using AES-256-GCM with machine-specific keys
- **No Analytics**: No user tracking or analytics collection
- **Open Source**: Code publicly available for security audit

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components

### Backend (Desktop)
- Electron for cross-platform desktop
- Node.js runtime
- node-window-manager for LCU integration
- Native Node.js crypto for encryption

### APIs
- Riot Games API (Summoner-V4, League-V4)
- League Client Update (LCU) API (local only)
- Data Dragon CDN (static assets)

## Terms of Service Compliance

This application:
- ✅ Does NOT automate gameplay
- ✅ Does NOT provide unfair advantages
- ✅ Does NOT violate game integrity
- ✅ Uses only official Riot APIs
- ✅ Respects rate limits with aggressive caching
- ✅ Is non-commercial and free

**Removed Features for Compliance:**
- ❌ Automated login (input simulation) - **REMOVED**
- ✅ Only uses official LCU API for auto-accept

## Support & Contact

- **GitHub Issues:** https://github.com/arkinalaera/summoner-vault/issues
- **Documentation:** https://github.com/arkinalaera/summoner-vault/blob/main/README.md
- **License:** MIT License (Open Source)

## Additional Information

### Screenshots

See the [main repository README](https://github.com/arkinalaera/summoner-vault#screenshots) for screenshots and video demonstrations.

### Code Quality

- TypeScript for type safety
- ESLint for code quality
- Comprehensive error handling
- Defensive programming against API failures

### Future Plans

- Multi-language support (i18n)
- Match history viewer
- Champion mastery display
- LP gain/loss tracking
- Statistics dashboard

---

**Last Updated:** 2025-11-21
**Version:** 1.0.0
