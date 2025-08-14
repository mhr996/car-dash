-- Add car_taken_from_client column to deals table for exchange deals
-- This column will store the ID of the car received from the client in exchange deals

ALTER TABLE deals 
ADD COLUMN car_taken_from_client bigint REFERENCES cars(id);

-- Add index for better performance when querying by car_taken_from_client
CREATE INDEX idx_deals_car_taken_from_client ON deals(car_taken_from_client);

-- Add comment to explain the column purpose
COMMENT ON COLUMN deals.car_taken_from_client IS 'Foreign key to cars table - stores the car received from client in exchange deals';
