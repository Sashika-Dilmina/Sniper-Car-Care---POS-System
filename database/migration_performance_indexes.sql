-- Performance Optimization Indexes
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_method_status ON payments(method, status);
CREATE INDEX idx_anpr_logs_created_at ON anpr_logs(created_at);
CREATE INDEX idx_anpr_logs_plate_created ON anpr_logs(plate_number, created_at);
CREATE INDEX idx_services_created_at ON services(created_at);
