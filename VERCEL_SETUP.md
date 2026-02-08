# Single Vercel Project Setup

Yes! You can use **one Vercel project** - no Docker needed (Vercel is serverless).

## Solution: Vercel Rewrites with Hostname Matching

This is the **easiest single-project solution**:

### Setup Steps:

1. **Deploy your `app` directory as a separate Vercel project first**
   - Create a new Vercel project
   - Set Root Directory: `app`
   - Note the deployment URL (e.g., `your-app-project.vercel.app`)

2. **Deploy `landing` as your main project**
   - Create ONE Vercel project
   - Set Root Directory: `landing`
   - Add your root domain: `yourdomain.com`
   - Add your app subdomain: `app.yourdomain.com`

3. **Update `vercel.json`**
   - Replace `your-app-project.vercel.app` with your actual app project URL
   - The rewrites will automatically route:
     - `yourdomain.com` → serves landing app
     - `app.yourdomain.com` → proxies to your app project

## How It Works

- Vercel's edge network checks the incoming hostname
- For `app.*` subdomain, it rewrites to your external app deployment
- For root domain, it serves your landing app normally
- All happens at the edge - super fast!

## Benefits

✅ Single "entry point" project (landing)  
✅ Both domains work seamlessly  
✅ No Docker needed (Vercel is serverless)  
✅ Fast edge routing  
✅ Separate builds (app and landing build independently)  
✅ Zero code changes needed

## Why Not Docker?

Vercel is a serverless platform optimized for Next.js. Docker would:
- Add unnecessary complexity
- Not work with Vercel's deployment model
- Require a different platform (like Railway, Fly.io, or self-hosted)

The rewrites approach is the **native Vercel way** to handle this use case.
