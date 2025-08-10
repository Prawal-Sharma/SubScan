# SubScan Deployment Guide

## Table of Contents
- [Vercel Deployment](#vercel-deployment)
- [Custom Domain Setup (GoDaddy)](#custom-domain-setup-godaddy)
- [Environment Configuration](#environment-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Analytics](#monitoring--analytics)

## Vercel Deployment

### Prerequisites
- GitHub account with the SubScan repository
- Vercel account (free tier works)
- Node.js 18+ locally for testing

### Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure build settings (auto-detected):
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Step 2: Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Your app will be live at `https://[project-name].vercel.app`

### Step 3: Configure Production Settings

1. Go to Project Settings → General
2. Set Node.js Version to 18.x
3. Go to Project Settings → Functions
4. Set Function Region to your preferred location

## Custom Domain Setup (GoDaddy)

### Method 1: Using GoDaddy Domain with Vercel (Recommended)

#### Step 1: Add Domain to Vercel

1. In Vercel Dashboard, go to your project
2. Navigate to Settings → Domains
3. Enter your domain (e.g., `subscan.com` or `app.subscan.com`)
4. Click "Add"

#### Step 2: Configure GoDaddy DNS

**For Root Domain (subscan.com):**

1. Log into [GoDaddy Domain Manager](https://dcc.godaddy.com/domains)
2. Select your domain
3. Click "DNS" or "Manage DNS"
4. Delete any existing A records for `@`
5. Add new A record:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21`
   - TTL: `600` (10 minutes)

**For Subdomain (app.subscan.com):**

1. In GoDaddy DNS Management
2. Add new CNAME record:
   - Type: `CNAME`
   - Name: `app` (or your chosen subdomain)
   - Value: `cname.vercel-dns.com`
   - TTL: `600`

**For www redirect:**

1. Add CNAME record:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: `600`

#### Step 3: Verify in Vercel

1. Return to Vercel Domains settings
2. You should see "Valid Configuration" ✓
3. SSL certificate will be automatically provisioned
4. Domain will be active in 10-30 minutes

### Method 2: Using GoDaddy Forwarding (Alternative)

If you want to keep using GoDaddy's services:

1. In GoDaddy, go to Domain Settings → Forwarding
2. Set up domain forwarding:
   - Forward to: `https://your-app.vercel.app`
   - Type: Permanent (301)
   - Forward with masking: No

**Note:** This method doesn't provide SSL on your custom domain.

### DNS Propagation

- DNS changes typically take 10-30 minutes
- Maximum propagation time: 48 hours
- Check status: [dnschecker.org](https://dnschecker.org)

### Troubleshooting Domain Issues

**Domain not working after 1 hour:**

1. Verify DNS records in GoDaddy
2. Clear browser cache and try incognito mode
3. Check Vercel dashboard for any configuration errors
4. Use `nslookup yourdomain.com` to verify DNS

**SSL Certificate Issues:**

1. Vercel automatically provisions Let's Encrypt certificates
2. If SSL isn't working, remove and re-add the domain in Vercel
3. Ensure no CAA records blocking Let's Encrypt

## Environment Configuration

### Security Headers (Already Configured)

The `vercel.json` file includes security headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Performance Configuration

Build optimizations in `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'pdf-processing': ['pdfjs-dist'],
        'date-utils': ['date-fns'],
        'ui-components': ['lucide-react'],
      },
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

## Performance Optimization

### Vercel Edge Network

Your app automatically benefits from:
- Global CDN distribution
- Edge caching
- Automatic compression (Brotli/Gzip)
- HTTP/2 and HTTP/3 support

### Monitoring Performance

1. Go to Vercel Dashboard → Analytics
2. Monitor:
   - Web Vitals (LCP, FID, CLS)
   - Traffic patterns
   - Error rates
   - Performance by region

### Recommended Optimizations

1. **Enable Vercel Analytics** (Optional):
   ```bash
   npm install @vercel/analytics
   ```
   
   Add to App.tsx:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';
   
   function App() {
     return (
       <>
         {/* Your app */}
         <Analytics />
       </>
     );
   }
   ```

2. **Enable Speed Insights** (Optional):
   ```bash
   npm install @vercel/speed-insights
   ```

## Monitoring & Analytics

### Health Checks

Create a health check endpoint by adding `public/api/health.json`:

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

Monitor at: `https://yourdomain.com/api/health.json`

### Error Tracking

Consider adding error tracking (optional):
- Sentry: For error monitoring
- LogRocket: For session replay
- Datadog: For comprehensive monitoring

### Uptime Monitoring

Free services to monitor your app:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

## Production Checklist

Before going live:

- [ ] Remove all console.log statements ✅
- [ ] Test all bank parsers with sample PDFs ✅
- [ ] Verify export functionality (CSV, JSON, ICS) ✅
- [ ] Check responsive design on mobile devices
- [ ] Test with large PDF files (10+ MB)
- [ ] Verify privacy - no data sent to external servers ✅
- [ ] SSL certificate active on custom domain
- [ ] Analytics/monitoring configured
- [ ] Error handling for edge cases ✅
- [ ] Performance optimized (code splitting) ✅

## Maintenance

### Updating the App

1. Make changes locally
2. Test thoroughly: `npm run build && npm run preview`
3. Commit and push to GitHub
4. Vercel automatically deploys within 2-3 minutes

### Rollback Deployment

If issues occur:
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

### Domain Renewal

- GoDaddy domains auto-renew by default
- Verify auto-renewal is enabled in GoDaddy account
- Keep payment method updated

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- GoDaddy: [godaddy.com/help](https://godaddy.com/help)
- SubScan Issues: [GitHub Issues](https://github.com/yourusername/SubScan/issues)

## Cost Considerations

### Vercel (Free Tier Includes)
- 100GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Suitable for most personal/small business use

### GoDaddy
- Domain: ~$12-20/year
- DNS hosting: Usually included with domain
- No additional costs for using with Vercel

### Scaling Beyond Free Tier
If you exceed Vercel's free tier:
- Pro plan: $20/month per user
- Includes: 1TB bandwidth, advanced analytics
- Alternative: Self-host on VPS (~$5-10/month)