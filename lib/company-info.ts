import supabase from './supabase';
import { createClient } from '@supabase/supabase-js';

export interface CompanyInfo {
    id?: string;
    name: string;
    logo_url?: string;
    signature_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Get Supabase client with service role key for server-side operations
 */
const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }

    if (!serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }

    return createClient(supabaseUrl, serviceRoleKey);
};

/**
 * Fetch company information from the database
 * @param useServiceRole - Whether to use service role key (for API routes) or regular client (for client-side)
 * @returns Promise<CompanyInfo> - Company information with fallback defaults
 */
export const getCompanyInfo = async (useServiceRole: boolean = false): Promise<CompanyInfo> => {
    try {
        let client = supabase;

        // Use service role client for API routes to bypass RLS, regular client for client-side
        if (useServiceRole) {
            try {
                client = getSupabaseAdmin();
            } catch (error) {
                console.warn('Failed to create admin client, falling back to regular client:', error);
                // Fallback to regular client if admin client creation fails
                client = supabase;
            }
        }

        const { data, error } = await client.from('company_settings').select('*').limit(1).single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching company info:', error);
            // Return default company info if error
            return getDefaultCompanyInfo();
        }

        if (data) {
            return data;
        }

        return getDefaultCompanyInfo();
    } catch (error) {
        console.error('Error fetching company info:', error);
        return getDefaultCompanyInfo();
    }
};

/**
 * Get default company information when database is not available
 * @returns CompanyInfo - Default company information
 */
export const getDefaultCompanyInfo = (): CompanyInfo => {
    return {
        name: 'Car Dealership',
        logo_url: '/assets/images/logo.png',
        address: '',
        phone: '',
        tax_number: '',
    };
};

/**
 * Get company info specifically for PDF contracts with proper formatting
 * @param useServiceRole - Whether to use service role key (for API routes)
 * @returns Promise<CompanyInfo> - Formatted company information for contracts
 */
export const getCompanyInfoForContract = async (useServiceRole: boolean = false): Promise<CompanyInfo> => {
    const companyInfo = await getCompanyInfo(useServiceRole);

    // Ensure we have fallback values for contract generation
    return {
        ...companyInfo,
        name: companyInfo.name || 'Car Dealership',
        logo_url: companyInfo.logo_url || '/assets/images/logo.png',
        address: companyInfo.address || '',
        phone: companyInfo.phone || '',
        tax_number: companyInfo.tax_number || '',
    };
};
