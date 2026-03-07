import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    try {
      const response = await axios.get(`/api/services/${id}`);
      setService(response.data.service);
    } catch (error) {
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await axios.put(`/api/services/${id}/status`, { status });
      toast.success('Service status updated');
      fetchService();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!service) {
    return <div>Service not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Service #{service.id}</h1>
        <Link to="/services" className="text-primary-600 hover:underline">
          ← Back to Services
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Service Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Service Name</p>
              <p className="text-lg font-semibold">{service.service_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="text-lg">{service.customer_name || 'N/A'}</p>
            </div>
            {service.vehicle_plate && (
              <div>
                <p className="text-sm text-gray-600">Vehicle Plate</p>
                <p className="text-lg font-mono">{service.vehicle_plate}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Vehicle Type</p>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                {service.vehicle_type}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="text-2xl font-bold text-primary-600">
                AED {parseFloat(service.price).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <select
                value={service.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className={`mt-1 px-4 py-2 border rounded-lg ${service.status === 'completed' ? 'bg-green-100 text-green-800' :
                    service.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                  }`}
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created At</p>
              <p className="text-lg">
                {new Date(service.created_at).toLocaleString()}
              </p>
            </div>
            {service.description && (
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-lg">{service.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;

