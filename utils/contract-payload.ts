import { CarContract } from '@/types/contract';

export function contractTemplate(language: string): 'english' | 'arabic' | 'hebrew' {
    switch (language.toLowerCase().split('-')[0]) {
        case 'ar':
        case 'ae':
            return 'arabic';
        case 'he':
            return 'hebrew';
        default:
            return 'english';
    }
}

export function parseContractPayload(value: string, contractType?: string): { contract: CarContract; template: string } | null {
    if (value.trim().startsWith('<')) return null;
    const parsed = JSON.parse(value);
    if (!parsed?.contract || !parsed.template || (contractType && parsed.contractType !== contractType)) {
        throw new Error('Invalid contract data format');
    }
    return parsed;
}
