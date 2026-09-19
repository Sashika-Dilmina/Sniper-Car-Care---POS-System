-- Fix ghost pending order 477 and any old orders where services were completed but order status remained pending/processing
UPDATE orders 
SET status = 'completed', 
    service_completed_at = COALESCE(service_completed_at, CURRENT_TIMESTAMP) 
WHERE status IN ('pending', 'processing') 
  AND (
    id = 477
    OR NOT EXISTS (
      SELECT 1 FROM services s 
      WHERE s.order_id = orders.id AND s.status IN ('pending', 'in_progress')
    )
  );
