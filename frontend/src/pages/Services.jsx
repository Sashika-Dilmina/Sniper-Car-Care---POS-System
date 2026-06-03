import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ vehicle_type: '', status: '' });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    service_name: '',
    vehicle_type: 'Saloon',
    price: '',
    description: ''
  });

  const calculateDuration = (service) => {
    if (!service.started_at || !service.completed_at) return null;
    const start = new Date(service.started_at);
    const end = new Date(service.completed_at);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return diffMins;
  };

  const formatDuration = (mins) => {
    if (mins === null || mins === undefined) return 'N/A';
    if (mins < 0) return '0 min';
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  useEffect(() => {
    fetchServices();
  }, [filter]);

  const fetchServices = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.vehicle_type) params.append('vehicle_type', filter.vehicle_type);
      if (filter.status) params.append('status', filter.status);

      const response = await axios.get(`/api/services?${params.toString()}`);
      setServices(response.data.services);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/services', formData);
      toast.success('Service created successfully');
      setShowModal(false);
      setFormData({
        service_name: '',
        vehicle_type: 'Saloon',
        price: '',
        description: ''
      });
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create service');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`/api/services/${id}/status`, { status });
      toast.success('Service status updated');
      fetchServices();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Services</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          + Add Service
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex space-x-4">
        <select
          value={filter.vehicle_type}
          onChange={(e) => setFilter({ ...filter, vehicle_type: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Vehicle Types</option>
          <option value="Saloon">Saloon</option>
          <option value="4x4">4x4</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service) => {
              const duration = calculateDuration(service);
              return (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">#{service.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                    {service.customer_name || <span className="text-gray-400 italic">Walk-in</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {service.vehicle_plate || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{service.service_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {service.vehicle_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    AED {parseFloat(service.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.status === 'completed' ? (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white">
                        {formatDuration(duration)}
                      </span>
                    ) : service.status === 'in_progress' ? (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-white animate-pulse">
                        In Progress
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={service.status}
                      onChange={(e) => handleStatusUpdate(service.id, e.target.value)}
                      className={`px-2 py-1 text-xs rounded-full border font-bold outline-none ${
                        service.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                        service.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/services/${service.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add Service</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Full Service Package"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Saloon">Saloon</option>
                  <option value="4x4">4x4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

