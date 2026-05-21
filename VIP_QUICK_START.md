# VIP Booking System - Quick Start Guide

## 🚀 Getting Started with VIP Bookings

This guide shows how to use the VIP booking system with code examples.

---

## API Usage Examples

### 1. Get Available VIP Services

**Request:**
```bash
curl -X GET http://localhost:5000/api/vip/services
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "Interior Deep Clean",
      "description": "Complete interior detailing with premium products",
      "price": "150.00",
      "features": "Deep vacuum, leather conditioning, window cleaning"
    },
    {
      "id": 2,
      "name": "Paint Protection",
      "description": "Professional paint protection and ceramic coating",
      "price": "250.00",
      "features": "Scratch protection, UV protection, water beading"
    }
    // ... more services
  ]
}
```

---

### 2. Create a VIP Booking

**Request:**
```bash
curl -X POST http://localhost:5000/api/vip/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed Mohammed",
    "phone": "+971501234567",
    "email": "ahmed@example.com",
    "vehicle_model": "BMW 7 Series",
    "vehicle_type": "Saloon",
    "service_type": "Interior Deep Clean",
    "appointment_date": "2024-05-25",
    "appointment_time": "10:00"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "VIP booking created successfully",
  "bookingId": 42,
  "customerId": 15
}
```

---

### 3. Get Available Time Slots

**Request:**
```bash
curl -X GET http://localhost:5000/api/vip/bookings/available-slots/2024-05-25
```

**Response:**
```json
{
  "success": true,
  "available_slots": [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00"
  ]
}
```

---

### 4. Get All VIP Bookings (Admin/Staff)

**Request:**
```bash
curl -X GET http://localhost:5000/api/vip/bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "vip_customer_id": 15,
      "name": "Ahmed Mohammed",
      "phone": "+971501234567",
      "vehicle_model": "BMW 7 Series",
      "vehicle_type": "Saloon",
      "service_type": "Interior Deep Clean",
      "appointment_date": "2024-05-25",
      "appointment_time": "10:00",
      "status": "confirmed",
      "staff_name": "Ali Hassan",
      "notes": "Customer prefers morning slots"
    }
    // ... more bookings
  ]
}
```

---

### 5. Update VIP Booking Status

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/vip/bookings/42 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Service completed successfully. Customer very satisfied.",
    "assigned_staff_id": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "VIP booking updated successfully"
}
```

---

### 6. Get VIP Customers (Admin Only)

**Request:**
```bash
curl -X GET http://localhost:5000/api/vip/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 15,
      "name": "Ahmed Mohammed",
      "phone": "+971501234567",
      "email": "ahmed@example.com",
      "vehicle_model": "BMW 7 Series",
      "vehicle_type": "Saloon",
      "total_bookings": 5,
      "last_booking_date": "2024-05-25"
    }
    // ... more customers
  ]
}
```

---

## Frontend Usage Examples

### 1. Using VIP Dashboard in React

```jsx
import VIPDashboard from './components/VIPDashboard';

function AdminPage() {
  return (
    <div>
      <VIPDashboard />
    </div>
  );
}
```

### 2. Fetching VIP Services in Customer Website

```jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

function VIPServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/vip/services');
        setServices(response.data.data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <div>
      {services.map(service => (
        <div key={service.id}>
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <p>Price: {service.price} AED</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Creating a Booking

```jsx
const submitVIPBooking = async (bookingData) => {
  try {
    const response = await axios.post('/api/vip/bookings', {
      name: bookingData.name,
      phone: bookingData.phone,
      email: bookingData.email,
      vehicle_model: bookingData.vehicleModel,
      vehicle_type: bookingData.vehicleType,
      service_type: bookingData.serviceType,
      appointment_date: bookingData.date,
      appointment_time: bookingData.time
    });

    if (response.data.success) {
      alert('Booking confirmed! Check your email for details.');
    }
  } catch (error) {
    alert('Booking failed: ' + error.response.data.message);
  }
};
```

---

## Database Queries

### 1. View All VIP Customers

```sql
SELECT id, name, phone, email, vehicle_model, vehicle_type, created_at 
FROM vip_customers 
ORDER BY created_at DESC;
```

### 2. View Bookings for a Specific Date

```sql
SELECT 
  vb.*, 
  vc.name, 
  vc.phone, 
  vc.vehicle_model,
  u.name as staff_name
FROM vip_bookings vb
JOIN vip_customers vc ON vb.vip_customer_id = vc.id
LEFT JOIN users u ON vb.assigned_staff_id = u.id
WHERE vb.appointment_date = '2024-05-25'
ORDER BY vb.appointment_time ASC;
```

### 3. View Pending Bookings

```sql
SELECT 
  vb.*, 
  vc.name, 
  vc.phone,
  vs.name as service_name
FROM vip_bookings vb
JOIN vip_customers vc ON vb.vip_customer_id = vc.id
JOIN vip_services vs ON vb.service_type = vs.name
WHERE vb.status = 'pending'
ORDER BY vb.appointment_date ASC;
```

### 4. Get VIP Customer Booking History

```sql
SELECT 
  vb.*, 
  vs.name as service_name,
  vs.price
FROM vip_bookings vb
JOIN vip_services vs ON vb.service_type = vs.name
WHERE vb.vip_customer_id = 15
ORDER BY vb.appointment_date DESC;
```

---

## Status Lifecycle

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
                   ↓
              CANCELLED
```

**Status Meanings:**
- `pending` - Booking created, awaiting confirmation
- `confirmed` - Booking confirmed by staff
- `in_progress` - Service is being performed
- `completed` - Service finished, customer satisfied
- `cancelled` - Booking cancelled by customer or staff

---

## Error Handling

### Common Error Responses:

**Missing Required Fields:**
```json
{
  "success": false,
  "message": "Please provide all required fields"
}
```

**Booking Not Found:**
```json
{
  "success": false,
  "message": "VIP booking not found"
}
```

**Authentication Error:**
```json
{
  "success": false,
  "message": "Unauthorized - Please provide valid token"
}
```

---

## Testing the VIP System

### Step 1: Test Public Endpoints

```bash
# Get services
curl http://localhost:5000/api/vip/services

# Check available slots
curl http://localhost:5000/api/vip/bookings/available-slots/2024-05-25

# Create booking
curl -X POST http://localhost:5000/api/vip/bookings \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Step 2: Test Protected Endpoints

Get your auth token:
```bash
# Login and get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@example.com","password":"password"}'
```

Use token to get bookings:
```bash
curl http://localhost:5000/api/vip/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Test Admin Panel

1. Go to `/dashboard/vip`
2. Switch between "VIP Bookings" and "VIP Customers" views
3. Filter bookings by status
4. Click "Edit" on a booking
5. Update status and notes
6. Verify changes saved

---

## Troubleshooting

### Issue: Bookings not showing up

**Solution:**
1. Check database connection
2. Verify migration was run: `SHOW TABLES LIKE 'vip_%';`
3. Check server logs for errors

### Issue: Slots not available

**Solution:**
1. Ensure date is in future
2. Check if all slots are booked
3. Verify time format is correct (HH:MM)

### Issue: Authentication errors

**Solution:**
1. Verify token is in Authorization header
2. Check token hasn't expired
3. Ensure user has correct role (admin/staff)

---

## Performance Tips

1. **Caching:** Cache VIP services list (doesn't change often)
2. **Pagination:** Add pagination for large booking lists
3. **Indexes:** Database uses indexes on key fields
4. **Lazy Loading:** Load bookings on demand

---

## Support & Documentation

- Full API docs: See VIP_IMPLEMENTATION_GUIDE.md
- Database schema: See migration_add_vip_tables.sql
- Component code: See frontend/src/components/VIPDashboard.jsx
- Controller code: See backend/controllers/vipBookingController.js

---

**Last Updated:** May 21, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
