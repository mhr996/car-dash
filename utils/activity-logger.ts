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

// Helper function to update existing deal log with bill information
const updateDealLogWithBill = async (bill: any) => {
    try {
        console.log('🔍 Searching for existing deal log for deal_id:', bill.deal_id);

        // First, find the existing deal log by searching for deal_id in the JSONB deal column
        const { data: existingLogs, error: findError } = await supabase.from('logs').select('*').eq('type', 'deal_created').order('created_at', { ascending: false });

        if (findError) {
            console.error('❌ Error finding existing deal log:', findError);
            return;
        }

        console.log(`📊 Found ${existingLogs?.length || 0} deal_created logs`);

        if (!existingLogs || existingLogs.length === 0) {
            console.warn('⚠️ No deal logs found');
            return;
        }

        // Debug: log all deal IDs we found
        console.log('🔍 Looking for deal_id:', bill.deal_id, 'type:', typeof bill.deal_id);
        existingLogs.forEach((log, index) => {
            console.log(`  Log ${index}: deal.id = ${log.deal?.id} (type: ${typeof log.deal?.id}), type = ${log.type}`);
        });

        // Find the log that contains the deal with matching ID
        // Make sure to compare both as strings to avoid type mismatches
        const existingLog = existingLogs.find((log) => log.deal && String(log.deal.id) === String(bill.deal_id));

        if (!existingLog) {
            console.warn('❌ No existing deal log found for deal_id:', bill.deal_id);
            return;
        }

        console.log('✅ Found existing deal log, updating with bill information');
        let enrichedBill = { ...bill };

        // Get complete bill data including payments
        if (bill.id) {
            try {
                const { data: fullBillData, error: billError } = await supabase
                    .from('bills')
                    .select(
                        `
                        *,
                        bill_payments (*)
                    `,
                    )
                    .eq('id', bill.id)
                    .single();

                if (!billError && fullBillData) {
                    enrichedBill = { ...enrichedBill, ...fullBillData };
                    console.log('📊 Enriched bill with payments data:', enrichedBill);
                }
            } catch (error) {
                console.warn('Could not fetch complete bill data:', error);
            }
        }

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
                }
            } catch (error) {
                console.warn('Could not fetch deal details for bill update:', error);
            }
        }

        // Preserve existing log data and add/update bill information
        // If there's already bill data, we might want to store multiple bills
        let billData = enrichedBill;
        if (existingLog.bill) {
            // If there's existing bill data, we could either:
            // 1. Replace it with new bill data (current approach)
            // 2. Store an array of bills
            // For now, we'll replace it but log that there was existing bill data
            console.log('Existing bill data found in log, updating with new bill for deal_id:', bill.deal_id);
        }

        // Update the existing log with bill information
        const { error: updateError } = await supabase
            .from('logs')
            .update({
                bill: billData,
            })
            .eq('id', existingLog.id);

        if (updateError) {
            console.error('Error updating deal log with bill:', updateError);
        } else {
            console.log('Successfully updated deal log with bill information for deal_id:', bill.deal_id);
        }
    } catch (error) {
        console.error('Error in updateDealLogWithBill:', error);
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
