# Riot API Setup Guide

## Getting Your Riot API Key

1. Go to [Riot Games Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot Games account
3. Click on "Register Product" or navigate to your dashboard
4. Generate a Development API Key (valid for 24 hours)
5. For production use, apply for a Production API Key

## Adding Your API Key

1. Open `src/lib/riot-api.ts`
2. Replace `RGAPI-your-api-key-here` with your actual API key:

```typescript
const RIOT_API_KEY = "RGAPI-your-actual-key-here";
```

## Important Notes

⚠️ **Security Warning**: This approach stores the API key in the frontend code, which is **not secure for production**. For a production app, you should:
- Use a backend server/proxy to handle API calls
- Store the API key in environment variables on the server
- Never expose API keys in client-side code

This implementation is suitable for:
- Personal use
- Development/testing
- Local applications

## Using the Feature

1. Click "Add Account" or edit an existing account
2. Enter the summoner name (e.g., "Faker#KR1") and select the region
3. Click "Fetch from Riot" button
4. The app will automatically populate:
   - Summoner icon
   - Current rank and division
   - Total games played

## API Rate Limits

Development keys have strict rate limits:
- 20 requests every 1 second
- 100 requests every 2 minutes

Be mindful of these limits when fetching multiple accounts.
