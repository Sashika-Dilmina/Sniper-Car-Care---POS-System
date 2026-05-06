import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('daily');

  // Daily Summary State
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly Summary State
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Payment Type State
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [paymentReport, setPaymentReport] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Customer Wise State
  const [customerStartDate, setCustomerStartDate] = useState('');
  const [customerEndDate, setCustomerEndDate] = useState('');
  const [customerReport, setCustomerReport] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Supplier Payment State
  const [supplierStartDate, setSupplierStartDate] = useState('');
  const [supplierEndDate, setSupplierEndDate] = useState('');
  const [supplierReport, setSupplierReport] = useState(null);
  const [supplierLoading, setSupplierLoading] = useState(false);

  // Purchases State
  const [purchaseStartDate, setPurchaseStartDate] = useState('');
  const [purchaseEndDate, setPurchaseEndDate] = useState('');
  const [purchaseReport, setPurchaseReport] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Daily Business Summary
  const fetchDailySummary = async () => {
    setDailyLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/daily-summary?date=${dailyDate}`);
      setDailyReport(response.data);
    } catch (error) {
      toast.error('Failed to generate daily summary');
    } finally {
      setDailyLoading(false);
    }
  };

  // Monthly Summary
  const fetchMonthlySummary = async () => {
    setMonthlyLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/monthly-summary?year=${monthlyYear}&month=${monthlyMonth}`);
      setMonthlyReport(response.data);
    } catch (error) {
      toast.error('Failed to generate monthly summary');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Payment Type Report
  const fetchPaymentTypeReport = async () => {
    if (!paymentStartDate || !paymentEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setPaymentLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/payment-types?start_date=${paymentStartDate}&end_date=${paymentEndDate}`);
      setPaymentReport(response.data);
    } catch (error) {
      toast.error('Failed to generate payment type report');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Customer Wise Report
  const fetchCustomerWiseReport = async () => {
    if (!customerStartDate || !customerEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setCustomerLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/customer-wise?start_date=${customerStartDate}&end_date=${customerEndDate}`);
      setCustomerReport(response.data);
    } catch (error) {
      toast.error('Failed to generate customer wise report');
    } finally {
      setCustomerLoading(false);
    }
  };

  // Supplier Payment Report
  const fetchSupplierPaymentReport = async () => {
    if (!supplierStartDate || !supplierEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setSupplierLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/supplier-payments?start_date=${supplierStartDate}&end_date=${supplierEndDate}`);
      setSupplierReport(response.data);
    } catch (error) {
      toast.error('Failed to generate supplier payment report');
    } finally {
      setSupplierLoading(false);
    }
  };

  // Purchases Report
  const fetchPurchasesReport = async () => {
    if (!purchaseStartDate || !purchaseEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setPurchaseLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/purchases?start_date=${purchaseStartDate}&end_date=${purchaseEndDate}`);
      setPurchaseReport(response.data);
    } catch (error) {
      toast.error('Failed to generate purchases report');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Excel Download Functions
  const downloadDailyExcel = async () => {
    try {
      const response = await axios.get(`/api/analytics/reports/daily-summary?date=${dailyDate}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily-summary-${dailyDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const downloadMonthlyExcel = async () => {
    try {
      const response = await axios.get(`/api/analytics/reports/monthly-summary?year=${monthlyYear}&month=${monthlyMonth}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly-summary-${monthlyYear}-${monthlyMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const downloadPaymentTypeExcel = async () => {
    if (!paymentStartDate || !paymentEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const response = await axios.get(`/api/analytics/reports/payment-types?start_date=${paymentStartDate}&end_date=${paymentEndDate}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payment-types-${paymentStartDate}-${paymentEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const downloadCustomerWiseExcel = async () => {
    if (!customerStartDate || !customerEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const response = await axios.get(`/api/analytics/reports/customer-wise?start_date=${customerStartDate}&end_date=${customerEndDate}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer-wise-${customerStartDate}-${customerEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const downloadSupplierPaymentExcel = async () => {
    if (!supplierStartDate || !supplierEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const response = await axios.get(`/api/analytics/reports/supplier-payments?start_date=${supplierStartDate}&end_date=${supplierEndDate}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplier-payments-${supplierStartDate}-${supplierEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const downloadPurchasesExcel = async () => {
    if (!purchaseStartDate || !purchaseEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    try {
      const response = await axios.get(`/api/analytics/reports/purchases?start_date=${purchaseStartDate}&end_date=${purchaseEndDate}&format=excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchases-${purchaseStartDate}-${purchaseEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const tabs = [
    { id: 'daily', label: 'Daily Business Summary' },
    { id: 'monthly', label: 'Monthly Summary' },
    { id: 'payment', label: 'Payment Type Report' },
    { id: 'customer', label: 'Customer Wise Report' },
    { id: 'supplier', label: 'Supplier Payment' },
    { id: 'purchases', label: 'Purchase of Items' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Reports</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Daily Business Summary */}
      {activeTab === 'daily' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Daily Business Summary</h2>
          <div className="mb-4 flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={fetchDailySummary}
              disabled={dailyLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {dailyLoading ? 'Loading...' : 'Generate Report'}
            </button>
            <button
              onClick={downloadDailyExcel}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              title="Download as Excel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
          </div>

          {dailyReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{dailyReport.orders?.total_orders || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary-600">
                    AED {parseFloat(dailyReport.orders?.total_revenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Services</p>
                  <p className="text-2xl font-bold">{dailyReport.services?.total_services || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Services Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    AED {parseFloat(dailyReport.services?.services_revenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {dailyReport.payment_methods && dailyReport.payment_methods.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Method</th>
                          <th className="px-4 py-2 text-right">Count</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.payment_methods.map((pm, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2 capitalize">{pm.method}</td>
                            <td className="px-4 py-2 text-right">{pm.count}</td>
                            <td className="px-4 py-2 text-right">
                              AED {parseFloat(pm.total_amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dailyReport.top_products && dailyReport.top_products.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Top Products</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Product</th>
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Quantity</th>
                          <th className="px-4 py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.top_products.map((product, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2">{product.name}</td>
                            <td className="px-4 py-2">{product.category}</td>
                            <td className="px-4 py-2 text-right">{product.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">
                              AED {parseFloat(product.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary */}
      {activeTab === 'monthly' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Monthly Summary Report</h2>
          <div className="mb-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <input
                type="number"
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                className="w-32 px-4 py-2 border rounded-lg"
                min="2020"
                max="2099"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                className="w-32 px-4 py-2 border rounded-lg"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchMonthlySummary}
              disabled={monthlyLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {monthlyLoading ? 'Loading...' : 'Generate Report'}
            </button>
            <button
              onClick={downloadMonthlyExcel}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              title="Download as Excel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
          </div>

          {monthlyReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary-600">
                    AED {parseFloat(monthlyReport.totals?.total_revenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{monthlyReport.totals?.total_orders || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Services Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    AED {parseFloat(monthlyReport.totals?.total_services_revenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Services</p>
                  <p className="text-2xl font-bold">{monthlyReport.totals?.total_services || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Unique Customers</p>
                  <p className="text-2xl font-bold">{monthlyReport.totals?.unique_customers || 0}</p>
                </div>
              </div>

              {monthlyReport.daily_orders && monthlyReport.daily_orders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Daily Orders Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-right">Orders</th>
                          <th className="px-4 py-2 text-right">Paid Orders</th>
                          <th className="px-4 py-2 text-right">Daily Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReport.daily_orders.map((day, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2">{new Date(day.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right">{day.orders_count}</td>
                            <td className="px-4 py-2 text-right">{day.paid_orders}</td>
                            <td className="px-4 py-2 text-right">
                              AED {parseFloat(day.daily_revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Type Report */}
      {activeTab === 'payment' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Payment Type Report</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchPaymentTypeReport}
                disabled={paymentLoading}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {paymentLoading ? 'Loading...' : 'Generate Report'}
              </button>
              <button
                onClick={downloadPaymentTypeExcel}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                title="Download as Excel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
            </div>
          </div>

          {paymentReport && (
            <div className="space-y-6">
              {paymentReport.payment_methods && paymentReport.payment_methods.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Methods Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Method</th>
                          <th className="px-4 py-2 text-right">Transactions</th>
                          <th className="px-4 py-2 text-right">Completed</th>
                          <th className="px-4 py-2 text-right">Pending</th>
                          <th className="px-4 py-2 text-right">Failed</th>
                          <th className="px-4 py-2 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentReport.payment_methods.map((pm, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2 capitalize">{pm.method}</td>
                            <td className="px-4 py-2 text-right">{pm.transaction_count}</td>
                            <td className="px-4 py-2 text-right">{pm.completed_count}</td>
                            <td className="px-4 py-2 text-right">{pm.pending_count}</td>
                            <td className="px-4 py-2 text-right">{pm.failed_count}</td>
                            <td className="px-4 py-2 text-right font-semibold">
                              AED {parseFloat(pm.total_amount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Wise Report */}
      {activeTab === 'customer' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Customer Wise Report</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customerStartDate}
                onChange={(e) => setCustomerStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customerEndDate}
                onChange={(e) => setCustomerEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchCustomerWiseReport}
                disabled={customerLoading}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {customerLoading ? 'Loading...' : 'Generate Report'}
              </button>
              <button
                onClick={downloadCustomerWiseExcel}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                title="Download as Excel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
            </div>
          </div>

          {customerReport && customerReport.customers && customerReport.customers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-right">Orders</th>
                    <th className="px-4 py-2 text-right">Services</th>
                    <th className="px-4 py-2 text-right">Total Spent</th>
                    <th className="px-4 py-2 text-right">Services Spent</th>
                    <th className="px-4 py-2 text-right">Paid</th>
                    <th className="px-4 py-2 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReport.customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{customer.name}</td>
                      <td className="px-4 py-2">{customer.phone || 'N/A'}</td>
                      <td className="px-4 py-2">{customer.vehicle_plate}</td>
                      <td className="px-4 py-2 text-right">{customer.total_orders}</td>
                      <td className="px-4 py-2 text-right">{customer.total_services}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        AED {parseFloat(customer.total_spent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        AED {parseFloat(customer.services_spent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        AED {parseFloat(customer.paid_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-orange-600">
                        AED {parseFloat(customer.pending_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier Payment Report */}
      {activeTab === 'supplier' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Supplier Payment Report</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={supplierStartDate}
                onChange={(e) => setSupplierStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={supplierEndDate}
                onChange={(e) => setSupplierEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchSupplierPaymentReport}
                disabled={supplierLoading}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {supplierLoading ? 'Loading...' : 'Generate Report'}
              </button>
              <button
                onClick={downloadSupplierPaymentExcel}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                title="Download as Excel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
            </div>
          </div>

          {supplierReport && supplierReport.suppliers && supplierReport.suppliers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Supplier</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-right">Products</th>
                    <th className="px-4 py-2 text-right">Orders</th>
                    <th className="px-4 py-2 text-right">Items Sold</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierReport.suppliers.map((supplier) => (
                    <tr key={supplier.supplier_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{supplier.supplier_name}</td>
                      <td className="px-4 py-2">{supplier.contact_person || 'N/A'}</td>
                      <td className="px-4 py-2">{supplier.phone || 'N/A'}</td>
                      <td className="px-4 py-2 text-right">{supplier.products_count}</td>
                      <td className="px-4 py-2 text-right">{supplier.orders_involved}</td>
                      <td className="px-4 py-2 text-right">{supplier.items_sold || 0}</td>
                      <td className="px-4 py-2 text-right font-semibold text-primary-600">
                        AED {parseFloat(supplier.total_revenue_from_products || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Purchase of Items Report */}
      {activeTab === 'purchases' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Purchase of Items Report</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={purchaseStartDate}
                onChange={(e) => setPurchaseStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={purchaseEndDate}
                onChange={(e) => setPurchaseEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchPurchasesReport}
                disabled={purchaseLoading}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {purchaseLoading ? 'Loading...' : 'Generate Report'}
              </button>
              <button
                onClick={downloadPurchasesExcel}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                title="Download as Excel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
            </div>
          </div>

          {purchaseReport && (
            <div className="space-y-6">
              {purchaseReport.category_summary && purchaseReport.category_summary.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Category Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {purchaseReport.category_summary.map((cat, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">{cat.category}</p>
                        <p className="text-xl font-bold">{cat.product_count} Products</p>
                        <p className="text-lg text-primary-600">
                          AED {parseFloat(cat.category_revenue || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{cat.total_quantity_sold} items sold</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {purchaseReport.items && purchaseReport.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Items Purchased</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Product</th>
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-left">Supplier</th>
                          <th className="px-4 py-2 text-right">Quantity</th>
                          <th className="px-4 py-2 text-right">Orders</th>
                          <th className="px-4 py-2 text-right">Avg Price</th>
                          <th className="px-4 py-2 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseReport.items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-semibold">{item.name}</td>
                            <td className="px-4 py-2">{item.category}</td>
                            <td className="px-4 py-2">{item.supplier_name || 'N/A'}</td>
                            <td className="px-4 py-2 text-right">{item.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">{item.order_count}</td>
                            <td className="px-4 py-2 text-right">
                              AED {parseFloat(item.average_price || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-primary-600">
                              AED {parseFloat(item.total_revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
