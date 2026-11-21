-- Fix payment_status for all cancelled orders and cancelled VIP bookings
UPDATE orders SET payment_status = 'cancelled' WHERE status = 'cancelled';
UPDATE vip_bookings SET payment_status = 'cancelled' WHERE status = 'cancelled';
