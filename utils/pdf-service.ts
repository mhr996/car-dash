import puppeteer, { Browser, Page } from 'puppeteer';
import puppeteerCore, { Browser as BrowserCore } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

interface PDFGenerationOptions {
    filename?: string;
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margins?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    printBackground?: boolean;
    scale?: number;
}

interface ContractPDFOptions extends PDFGenerationOptions {
    contractHtml: string;
    baseUrl?: string;
}

interface LogsPDFOptions extends PDFGenerationOptions {
    html: string;
    baseUrl?: string;
}

export class PDFService {
    private static instance: PDFService;
    private browser: Browser | BrowserCore | null = null;

    private constructor() {}

    static getInstance(): PDFService {
        if (!PDFService.instance) {
            PDFService.instance = new PDFService();
        }
        return PDFService.instance;
    }

    private async getBrowser(): Promise<Browser | BrowserCore> {
        if (!this.browser) {
            console.log('Launching browser with the chromium-min solution...');

            const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

            if (isProduction) {
                console.log('Production environment detected, using chromium-min with external binary...');

                // Use the latest version as recommended in the article (v133.0.0)
                const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar');
                console.log('Chromium executable path:', executablePath);

                this.browser = await puppeteerCore.launch({
                    executablePath,
                    args: [...chromium.args, '--disable-web-security', '--disable-features=VizDisplayCompositor', '--font-render-hinting=none'],
                    headless: chromium.headless,
                    defaultViewport: chromium.defaultViewport,
                });
                console.log('Browser launched successfully with chromium-min');
            } else {
                console.log('Development environment detected, using local puppeteer...');

                this.browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor', '--font-render-hinting=none'],
                });
                console.log('Browser launched successfully with local puppeteer');
            }
        }

        return this.browser!;
    }
    async generateContractPDF(options: ContractPDFOptions): Promise<Uint8Array> {
        const {
            contractHtml,
            format = 'A4',
            orientation = 'portrait',
            margins = {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm',
            },
            printBackground = true,
            scale = 1,
        } = options;

        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            // Set viewport for consistent rendering
            await page.setViewport({ width: 1200, height: 800 });

            // Increase navigation timeout to 60 seconds for slower CDN loads
            page.setDefaultNavigationTimeout(60000);
            page.setDefaultTimeout(60000);

            // Load the HTML content - use 'domcontentloaded' instead of 'networkidle0' for faster loading
            await page.setContent(contractHtml, {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            });

            // Wait for Tailwind to be ready (if using Tailwind CDN)
            try {
                await (page as Page).waitForFunction(() => (window as any).tailwindReady === true, { timeout: 5000 });
            } catch (e) {
                // Fallback: just wait 1 second if the tailwindReady flag isn't set
                console.log('Tailwind ready flag not found, using fallback wait');
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format,
                landscape: orientation === 'landscape',
                margin: margins,
                printBackground,
                scale,
                preferCSSPageSize: true,
            });

            return new Uint8Array(pdfBuffer);
        } finally {
            await page.close();
        }
    }

    async generateLogsPDF(options: LogsPDFOptions): Promise<Uint8Array> {
        const {
            html,
            format = 'A4',
            orientation = 'landscape',
            margins = {
                top: '15mm',
                right: '10mm',
                bottom: '15mm',
                left: '10mm',
            },
            printBackground = true,
            scale = 1,
        } = options;

        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            // Set viewport for consistent rendering
            await page.setViewport({ width: 1200, height: 800 });

            // Increase navigation timeout to 60 seconds
            page.setDefaultNavigationTimeout(60000);
            page.setDefaultTimeout(60000);

            // Load the HTML content - use 'domcontentloaded' for faster loading
            await page.setContent(html, {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            });

            // Wait for fonts and styles to load
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format,
                landscape: orientation === 'landscape',
                margin: margins,
                printBackground,
                scale,
                preferCSSPageSize: true,
            });

            return new Uint8Array(pdfBuffer);
        } finally {
            await page.close();
        }
    }

    async generateFromContract(contractData: any): Promise<Uint8Array> {
        // This is a placeholder - you should implement the actual contract HTML generation
        const contractHtml = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .contract { padding: 20px; }
                    </style>
                </head>
                <body>
                    <div class="contract">
                        <h1>Contract</h1>
                        <p>Contract details would go here...</p>
                    </div>
                </body>
            </html>
        `;

        return this.generateContractPDF({ contractHtml });
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
