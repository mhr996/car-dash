import supabase from '@/lib/supabase';

export type ActivityType =
    | 'car_added'
    | 'car_updated'
    | 'car_deleted'
    | 'car_received_from_client'
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

        // Skip bill-related logging since we now fetch bills dynamically
        if (type === 'bill_created' || type === 'bill_updated' || type === 'bill_deleted') {
            console.log('⏭️ Skipping bill logging - bills are now fetched dynamically from deals');
            return;
        }

        // For deal-related activities, collect comprehensive data
        if (deal && type === 'deal_created') {
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

            // Check if there's an existing car log for this car
            // Include both 'car_added' and 'car_received_from_client' types
            if (deal.car_id) {
                console.log('🔍 Checking for existing car log for car_id:', deal.car_id);

                const { data: existingLogs, error: findError } = await supabase
                    .from('logs')
                    .select('*')
                    .in('type', ['car_added', 'car_received_from_client'])
                    .order('created_at', { ascending: false });

                if (!findError && existingLogs && existingLogs.length > 0) {
                    // Find the log that contains the car with matching ID
                    const existingCarLog = existingLogs.find((log) => log.car && String(log.car.id) === String(deal.car_id));

                    if (existingCarLog) {
                        console.log('✅ Found existing car log (type: %s), updating with deal information', existingCarLog.type);

                        // Only update if there's no existing deal data to avoid overwriting
                        if (existingCarLog.deal) {
                            console.log('⚠️ Car log already has deal data, skipping update to preserve existing deal');
                            // Still skip creating a new log
                            return;
                        }

                        // Update the existing car log with deal information
                        const { error: updateError } = await supabase
                            .from('logs')
                            .update({
                                deal: enrichedDeal,
                                // Keep the original type (car_added or car_received_from_client)
                            })
                            .eq('id', existingCarLog.id);

                        if (updateError) {
                            console.error('❌ Error updating car log with deal:', updateError);
                        } else {
                            console.log('✅ Successfully updated car log with deal information');
                            return; // Don't create a new log
                        }
                    }
                }
            }

            logData.deal = enrichedDeal;
        } else if (deal) {
            // For deal updates/deletes, still log normally
            let enrichedDeal = { ...deal };

            if (deal.customer_id) {
                const customer = await getCustomerDetails(deal.customer_id);
                if (customer) {
                    enrichedDeal.customer = customer;
                }
            }

            if (deal.car_id) {
                const carData = await getCarDetails(deal.car_id);
                if (carData) {
                    enrichedDeal.car = carData;
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

        const { error } = await supabase.from('logs').insert([logData]);

        if (error) {
            console.error('Error logging activity:', error);
        }
    } catch (error) {
        console.error('Error in logActivity:', error);
    }
};
