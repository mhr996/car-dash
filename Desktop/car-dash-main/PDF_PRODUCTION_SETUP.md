# PDF Generation Setup for Production

This application uses Puppeteer to generate PDF contracts. For PDF generation to work in production environments, Chrome or Chromium must be available on the server.

## Production Setup Options

### Option 1: Automatic Chrome Installation (Recommended)

The application includes a postinstall script that automatically downloads Chrome:

```bash
npm install
# This will automatically run: puppeteer browsers install chrome
```

### Option 2: System Chrome Installation

#### Ubuntu/Debian:

```bash
# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install google-chrome-stable

# Or install Chromium
sudo apt update
sudo apt install chromium-browser
```

#### CentOS/RHEL:

```bash
# Install Chrome
sudo yum install -y https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm

# Or install Chromium
sudo yum install chromium
```

#### Alpine Linux (Docker):

```dockerfile
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Option 3: Environment Variable

Set the path to Chrome executable:

```bash
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
# or
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Docker Setup

If using Docker, add Chrome installation to your Dockerfile:

```dockerfile
# For Ubuntu/Debian base images
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

## Serverless Environments

For serverless platforms (Vercel, Netlify, etc.), you may need to use a different approach:

### Vercel:

Install `@sparticuz/chromium` for serverless Chrome:

```bash
npm install @sparticuz/chromium puppeteer-core
```

Then update your environment variables in Vercel dashboard:

```
PUPPETEER_EXECUTABLE_PATH=/var/task/node_modules/@sparticuz/chromium/bin/chromium
```

## Testing Chrome Availability

The application includes an API endpoint to check Chrome availability:

```bash
curl https://your-domain.com/api/check-chrome
```

This will return information about whether Chrome is available and where it's located.

## Troubleshooting

### Common Issues:

1. **"Could not find Chrome" error**:

    - Run: `npx puppeteer browsers install chrome`
    - Or install system Chrome (see options above)
    - Or set `PUPPETEER_EXECUTABLE_PATH` environment variable

2. **Permission errors**:

    - Ensure Chrome executable has proper permissions
    - Add `--no-sandbox` flag (already included in the app)

3. **Memory issues in containers**:

    - Increase container memory
    - Use `--disable-dev-shm-usage` flag (already included)

4. **Font issues with Arabic/Hebrew**:
    - Install additional fonts in your container:
    ```bash
    apt-get install fonts-noto fonts-noto-cjk fonts-noto-color-emoji
    ```

### Environment Variables:

- `PUPPETEER_EXECUTABLE_PATH`: Path to Chrome executable
- `NODE_ENV`: Set to 'production' for production optimizations

### Debug Mode:

To see which Chrome path is being used, check the server logs for:

```
Using Chrome at: /path/to/chrome
```
