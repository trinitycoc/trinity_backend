# Trinity Backend Server

This is the backend server for the Trinity Clash of Clans website. It handles API requests to the Clash of Clans API using the `clashofclans.js` library.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Clash of Clans API credentials:
   ```
   COC_EMAIL=your-email@example.com
   COC_PASSWORD=your-password
   PORT=3001
   ```

### 3. Get Clash of Clans API Credentials

1. Go to [Clash of Clans Developer Portal](https://developer.clashofclans.com)
2. Create an account or log in
3. Create a new API key for your IP address
4. Use your developer portal email and password in the `.env` file

## Running the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` (or the PORT specified in `.env`)

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if server is running

### Clans
- **GET** `/api/clans/:clanTag` - Get single clan details
- **POST** `/api/clans/multiple` - Get multiple clans (send `{ clanTags: [...] }`)
- **GET** `/api/clans/search/:name` - Search clans by name

### War Data
- **GET** `/api/clans/:clanTag/war` - Get current war data
- **GET** `/api/clans/:clanTag/cwl` - Get CWL group data

## Project Structure

```
server/
├── index.js                 # Main server file
├── routes/
│   └── clans.js            # Clan-related routes
├── services/
│   └── clashOfClansService.js  # CoC API service
├── package.json            # Dependencies
├── .env                    # Environment variables (create this)
└── .env.example            # Environment template
```

## Troubleshooting

### Authentication Errors
- Make sure your email and password are correct
- Verify your API key is active on the CoC developer portal
- Check that your IP address is whitelisted

### CORS Errors
- The server is configured to allow all origins in development
- For production, update the CORS settings in `index.js`

### Connection Errors
- Ensure the server is running before starting the frontend
- Check that PORT 3001 is not in use by another application

