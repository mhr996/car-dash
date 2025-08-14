import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // With @sparticuz/chromium-min, we don't need to check for local Chrome
        // The solution downloads Chromium on-demand from GitHub releases
        return NextResponse.json({
            available: true,
            method: '@sparticuz/chromium-min',
            message: 'PDF generation available using chromium-min with external binary download',
            details: {
                development: 'Uses local puppeteer with Chrome/Chromium',
                production: 'Downloads Chromium binary from GitHub releases on-demand',
            },
        });
    } catch (error) {
        console.error('PDF service check error:', error);
        return NextResponse.json(
            {
                available: false,
                error: error instanceof Error ? error.message : String(error),
                message: 'Error checking PDF service availability',
            },
            { status: 500 },
        );
    }
}
