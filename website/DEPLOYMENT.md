# Deployment Guide

This guide covers deploying the ShivikMart website to various platforms.

## Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Backend API is accessible
- [ ] Production build tested locally
- [ ] CORS configured in backend for production domain
- [ ] Assets optimized
- [ ] Security headers configured

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## Deployment Options

### 1. Vercel (Recommended)

Vercel provides the easiest deployment for Vite apps:

#### Via Vercel CLI

```bash
npm install -g vercel
vercel
```

#### Via GitHub

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

**Environment Variables:**
```
VITE_API_URL=https://your-backend-api.com
```

### 2. Netlify

#### Via Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

#### Via Git

1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in dashboard

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Docker

**Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional)
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Build and run:**
```bash
docker build -t shivikmart-website .
docker run -p 80:80 shivikmart-website
```

### 4. Traditional Hosting (cPanel, etc.)

1. Build the project:
   ```bash
   npm run build
   ```

2. Upload contents of `dist` folder to your web server

3. Configure web server for SPA:
   - Apache: Use `.htaccess` with mod_rewrite
   - Nginx: Configure try_files

**Apache .htaccess:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 5. AWS S3 + CloudFront

1. Create S3 bucket
2. Enable static website hosting
3. Upload build files
4. Create CloudFront distribution
5. Configure custom domain

**AWS CLI:**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## Environment Variables

Configure these in your deployment platform:

```env
# Required
VITE_API_URL=https://api.yourbackend.com

# Optional
VITE_APP_NAME=ShivikMart
VITE_APP_VERSION=1.0.0
```

## Post-deployment

### Verify Deployment

1. Check website loads correctly
2. Test login functionality
3. Verify API calls work
4. Test all major features
5. Check console for errors

### Performance Optimization

1. **Enable Compression**
   - Gzip/Brotli compression
   
2. **Cache Headers**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **CDN Setup**
   - Use CDN for static assets
   - CloudFlare, AWS CloudFront, etc.

### Security Headers

Add these headers in your web server configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## Monitoring

### Error Tracking

Consider integrating:
- Sentry
- LogRocket
- Rollbar

### Analytics

- Google Analytics
- Mixpanel
- Plausible

## Rollback Strategy

1. Keep previous builds
2. Use version tags in Git
3. Quick rollback command ready

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: cd website && npm ci
        
      - name: Build
        run: cd website && npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: website
```

## Troubleshooting

### Build Fails

- Clear node_modules and reinstall
- Check Node.js version compatibility
- Review build logs for specific errors

### API Connection Issues

- Verify VITE_API_URL is correct
- Check CORS configuration
- Ensure backend is accessible from production

### Routing Issues (404 on refresh)

- Configure server for SPA routing
- Check .htaccess or nginx config

## Support

For deployment issues:
- Check platform-specific documentation
- Review build logs
- Test production build locally first

## Best Practices

1. **Use environment-specific configs**
2. **Enable monitoring from day one**
3. **Set up automated backups**
4. **Configure CDN for assets**
5. **Enable HTTPS (SSL/TLS)**
6. **Regular security updates**
7. **Performance monitoring**

## Scaling

As your application grows:
- Implement code splitting
- Use lazy loading
- Optimize bundle size
- Consider server-side rendering (SSR)
- Implement proper caching strategies

---

© 2024 ShivikMart. All rights reserved.

