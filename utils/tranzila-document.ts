import supabase from '@/lib/supabase';

export class TranzilaReconciliationRequiredError extends Error {
    constructor(billId: number, details: string) {
        super(`Bill ${billId} requires reconciliation. A Tranzila document may already exist. The local bill was retained. Do not retry; check Tranzila and reconcile this bill first. ${details}`);
        this.name = 'TranzilaReconciliationRequiredError';
    }
}

export async function createAndStoreTranzilaDocument(billId: number, date: string, data: Record<string, unknown>): Promise<void> {
    let creationMayHaveSucceeded = true;
    let documentNumber: string | number | undefined;
    try {
        const response = await fetch('/api/tranzila', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_document', data }),
        });
        const result = await response.json();
        if (!result?.ok || !result.response || result.response.status_code !== 0) {
            if (result?.ok && typeof result.response?.status_code === 'number' && result.response.status_code !== 0) {
                creationMayHaveSucceeded = false;
            }
            throw new Error(`Tranzila error (${result?.response?.status_code ?? 'N/A'}): ${result?.response?.status_msg || result?.error || result?.message || 'Unknown Tranzila error'}`);
        }

        const document = result.response.document;
        const validIdentifier = (value: unknown) => (typeof value === 'string' ? value.trim().length > 0 : typeof value === 'number' && Number.isFinite(value) && value > 0);
        documentNumber = validIdentifier(document?.number) ? document.number : undefined;
        if (!validIdentifier(document?.id) || !validIdentifier(document?.number) || typeof document?.retrieval_key !== 'string' || !document.retrieval_key.trim()) {
            throw new Error('Tranzila reported success (status_code 0) but omitted required document details (id, number, or retrieval_key).');
        }
        const { error } = await supabase
            .from('bills')
            .update({
                tranzila_document_id: document.id,
                tranzila_document_number: document.number,
                tranzila_retrieval_key: document.retrieval_key,
                tranzila_created_at: date ? new Date(date + 'T00:00:00').toISOString() : document.created_at,
            })
            .eq('id', billId);
        if (error) throw new Error('Failed to update bill with Tranzila data: ' + error.message);
    } catch (error) {
        console.error('Error calling Tranzila API:', error);
        if (creationMayHaveSucceeded) {
            throw new TranzilaReconciliationRequiredError(billId, `${documentNumber ? `Tranzila document: ${documentNumber}. ` : ''}${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        throw error;
    }
}
