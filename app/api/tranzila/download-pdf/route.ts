import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const retrievalKey = searchParams.get('key');

        if (!retrievalKey) {
            return NextResponse.json({ error: 'Retrieval key is required' }, { status: 400 });
        }

        // Fetch PDF from Tranzila
        const tranzilaUrl = `https://my.tranzila.com/api/get_financial_document/${retrievalKey}`;
        const response = await fetch(tranzilaUrl);

        if (!response.ok) {
            throw new Error(`Failed to download from Tranzila: ${response.statusText}`);
        }

        // Get the PDF blob
        const pdfBuffer = await response.arrayBuffer();

        // Return the PDF with proper headers
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="invoice.pdf"',
            },
        });
    } catch (error) {
        console.error('Error downloading PDF from Tranzila:', error);
        return NextResponse.json({ error: 'Failed to download PDF', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
