# Railway Deployment Guide

## Environment Variables Required

Set these environment variables in your Railway project:

### Required Variables:
```
PORT=3001
NODE_ENV=production
```

### Email Configuration (Optional for basic functionality):
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
```

### Database Configuration:
```
DATABASE_URL=./data/receipts.db
```

## Deployment Steps:

1. **Connect your GitHub repository to Railway**
2. **Set the environment variables** in Railway dashboard
3. **Deploy the application**
4. **Check the health endpoint**: `https://your-app.railway.app/health`

## Troubleshooting:

### If deployment fails:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure the health check endpoint responds: `/health`
4. Check if the database directory is created properly

### Common Issues:
- **Port conflicts**: The app now uses port 3001 by default
- **Database permissions**: The app creates the data directory automatically
- **Build failures**: Ensure all dependencies are properly installed

## Health Check:

The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "OK",
  "timestamp": "2025-08-04T...",
  "port": 3001,
  "environment": "production"
}
```

## Local Testing:

To test locally before deploying:
```bash
npm install
npm run build
npm start
```

Then visit: `http://localhost:3001/health` 