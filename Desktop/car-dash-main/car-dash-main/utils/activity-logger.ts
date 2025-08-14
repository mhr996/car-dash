import supabase from '@/lib/supabase';

export type ActivityType =
    | 'car_added'
    | 'car_updated'
    | 'car_deleted'
    | 'deal_created'
    | 'deal_updated'
    | 'deal_deleted'
    | 'bill_created'
    | 'bill_updated'
    | 'bill_deleted'
    | 'customer_added'
    | 'customer_updated'
    | 'customer_deleted'
    | 'provider_added'
    | 'provider_updated'
    | 'provider_deleted';

interface LogActivityParams {
    type: ActivityType;
    deal?: any; // The actual deal object/data
    car?: any; // The actual car object/data
    bill?: any; // The actual bill object/data
}

// Helper function to get provider details
const getProviderDetails = async (providerId: string) => {
    try {
        const { data, error } = await supabase.from('providers').select('*').eq('id', providerId).single();
        return error ? null : data;
    } catch {
        return null;
    }
};

// Helper function to get customer details
const getCustomerDetails = async (customerId: string) => {
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
        return error ? null : data;
    } catch {
        return null;
    }
};

// Helper function to get car details
const getCarDetails = async (carId: string) => {
    try {
        const { data, error } = await supabase
            .from('cars')
            .select(
                `
                *,
                providers!cars_provider_fkey (
                    id,
                    name,
                    address,
                    phone
                )
            `,
            )
            .eq('id', carId)
            .single();
        return error ? null : data;
    } catch {
        return null;
    }
};

export const logActivity = async ({ type, deal, car, bill }: LogActivityParams) => {
    try {
        let logData: any = {
            type,
        };

        // For deal-related activities, collect comprehensive data
        if (deal) {
            let enrichedDeal = { ...deal };

            // Get customer details if customer_id exists
            if (deal.customer_id) {
                const customer = await getCustomerDetails(deal.customer_id);
                if (customer) {
                    enrichedDeal.customer = customer;
                }
            }

            // Get car details if car_id exists
            if (deal.car_id) {
                const carData = await getCarDetails(deal.car_id);
                if (carData) {
                    enrichedDeal.car = carData;
                    // Also store car data in separate column for easier querying
                    logData.car = carData;
                }
            }

            logData.deal = enrichedDeal;
        }

        // For car-related activities
        if (car) {
            let enrichedCar = { ...car };

            // Get provider details if provider exists
            if (car.provider) {
                const provider = await getProviderDetails(car.provider);
                if (provider) {
                    enrichedCar.provider_details = provider;
                }
            }

            logData.car = enrichedCar;
        }

        // For bill-related activities, get full deal and related data
        if (bill) {
            let enrichedBill = { ...bill };

            // Get deal with car and customer details
            if (bill.deal_id) {
                try {
                    const { data: dealData, error: dealError } = await supabase
                        .from('deals')
                        .select(
                            `
                            *,
                            customers!deals_customer_id_fkey (*),
                            cars!deals_car_id_fkey (
                                *,
                                providers!cars_provider_fkey (*)
                            )
                        `,
                        )
                        .eq('id', bill.deal_id)
                        .single();

                    if (!dealError && dealData) {
                        enrichedBill.deal = dealData;
                        // Also store related data in separate columns
                        if (dealData.cars) {
                            logData.car = dealData.cars;
                        }
                        logData.deal = dealData;
                    }
                } catch (error) {
                    console.warn('Could not fetch deal details for bill log:', error);
                }
            }

            logData.bill = enrichedBill;
        }

        const { error } = await supabase.from('logs').insert([logData]);

        if (error) {
            console.error('Error logging activity:', error);
        }
    } catch (error) {
        console.error('Error in logActivity:', error);
    }
};
