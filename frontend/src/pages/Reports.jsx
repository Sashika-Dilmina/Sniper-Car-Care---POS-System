import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'daily');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Daily Summary State
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Credit Report State
  const [creditStartDate, setCreditStartDate] = useState('');
  const [creditEndDate, setCreditEndDate] = useState('');
  const [creditReport, setCreditReport] = useState(null);
  const [creditLoading, setCreditLoading] = useState(false);

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

  // Profit & Loss State
  const [plStartDate, setPlStartDate] = useState('');
  const [plEndDate, setPlEndDate] = useState('');
  const [plReport, setPlReport] = useState(null);
  const [plLoading, setPlLoading] = useState(false);

  // Cash Register Sessions State
  const [registers, setRegisters] = useState([]);
  const [loadingRegisters, setLoadingRegisters] = useState(false);
  const [selectedRegisterReport, setSelectedRegisterReport] = useState(null);
  const [loadingRegisterReport, setLoadingRegisterReport] = useState(false);

  const fetchRegistersList = async () => {
    setLoadingRegisters(true);
    try {
      const response = await axios.get('/api/registers/list');
      if (response.data.success) {
        setRegisters(response.data.registers || []);
      }
    } catch (error) {
      toast.error('Failed to load register sessions');
    } finally {
      setLoadingRegisters(false);
    }
  };

  const fetchRegisterReport = async (registerId) => {
    setLoadingRegisterReport(true);
    try {
      const response = await axios.get(`/api/registers/report?register_id=${registerId}`);
      if (response.data.success) {
        setSelectedRegisterReport(response.data.report);
      } else {
        toast.error('Failed to load session report');
      }
    } catch (error) {
      toast.error('Failed to load session report');
    } finally {
      setLoadingRegisterReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'registers') {
      fetchRegistersList();
      setSelectedRegisterReport(null);
    }
  }, [activeTab]);

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

  // Credit Report
  const fetchCreditReport = async () => {
    if (!creditStartDate || !creditEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setCreditLoading(true);
    try {
      const response = await axios.get('/api/credits');
      if (response.data.success) {
        const start = new Date(creditStartDate + 'T00:00:00');
        const end = new Date(creditEndDate + 'T23:59:59');
        const filtered = (response.data.credits || []).filter(c => {
          const date = new Date(c.created_at);
          return date >= start && date <= end;
        });
        setCreditReport(filtered);
      } else {
        toast.error('Failed to generate credit report');
      }
    } catch (error) {
      toast.error('Failed to generate credit report');
    } finally {
      setCreditLoading(false);
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

  // Profit & Loss Summary
  const fetchProfitLossReport = async () => {
    if (!plStartDate || !plEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setPlLoading(true);
    try {
      const response = await axios.get(`/api/analytics/reports/profit-loss?start_date=${plStartDate}&end_date=${plEndDate}`);
      if (response.data.success) {
        setPlReport(response.data);
      } else {
        toast.error(response.data.message || 'Failed to generate Profit & Loss report');
      }
    } catch (error) {
      toast.error('Failed to generate Profit & Loss report');
    } finally {
      setPlLoading(false);
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
    { id: 'business_summary', label: 'Business Summary Report' },
    { id: 'payment', label: 'Payment Type Report' },
    { id: 'customer', label: 'Customer Wise Report' },
    { id: 'supplier', label: 'Supplier Payment' },
    { id: 'purchases', label: 'Purchase of Items' },
    { id: 'credit', label: 'Credit Report' },
    { id: 'registers', label: 'Cash Register Sessions' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const printStyle = `
    @media print {
      aside, nav, .no-print, button, input, select, header {
        display: none !important;
      }
      body, html {
        background: white !important;
        color: black !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      main {
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-full-width {
        width: 100% !important;
        max-width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      h1, h2, h3, h4, p, td, th {
        color: black !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 15px !important;
      }
      th, td {
        border: 1px solid #ccc !important;
        padding: 6px 10px !important;
        text-align: left !important;
        font-size: 10pt !important;
      }
      th {
        background-color: #f3f4f6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  const totalCreditGranted = creditReport ? creditReport.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) : 0;
  const totalOutstanding = creditReport ? creditReport.reduce((sum, c) => sum + parseFloat(c.remaining_amount || 0), 0) : 0;
  const totalRecovered = totalCreditGranted - totalOutstanding;

  return (
    <div className="space-y-6">
      <style>{printStyle}</style>
      <div className="flex justify-between items-center no-print">
        <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm font-semibold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow no-print">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap space-x-1 p-2">
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
          <div className="mb-4 flex gap-4 items-end no-print">
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


      {/* Payment Type Report */}
      {activeTab === 'payment' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Payment Type Report</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
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
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
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
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
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
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
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

      {/* Business Summary Report */}
      {activeTab === 'business_summary' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-xl font-bold mb-4">Business Summary Report</h2>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end bg-gray-50 p-4 rounded-xl border no-print">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={plStartDate}
                onChange={(e) => setPlStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={plEndDate}
                onChange={(e) => setPlEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={fetchProfitLossReport}
              disabled={plLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-bold"
            >
              {plLoading ? 'Generating...' : 'Generate P&L'}
            </button>
          </div>

          {plReport && plReport.summary && (
            <div className="space-y-6">
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Sales Revenue</span>
                  <h3 className="text-3xl font-black text-blue-600 mt-2">
                    AED {plReport.summary.total_sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                  <span className="text-xs text-gray-400 mt-4">{plReport.summary.sales_count} sales transactions</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Purchases</span>
                  <h3 className="text-3xl font-black text-orange-600 mt-2">
                    AED {plReport.summary.total_purchases.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                  <span className="text-xs text-gray-400 mt-4">{plReport.summary.purchases_count} purchase orders</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
                  <h3 className="text-3xl font-black text-red-500 mt-2">
                    AED {plReport.summary.total_expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                  <span className="text-xs text-gray-400 mt-4">{plReport.summary.expenses_count} expense entries</span>
                </div>
                <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between ${
                  plReport.summary.net_profit >= 0 
                    ? 'bg-green-50/50 border-green-200 text-green-900' 
                    : 'bg-red-50/50 border-red-200 text-red-900'
                }`}>
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500">Net Profit / Loss</span>
                  <h3 className={`text-3xl font-black mt-2 ${
                    plReport.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    AED {plReport.summary.net_profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                  <span className="text-xs font-semibold mt-4">
                    {plReport.summary.net_profit >= 0 ? '🟢 Profit generated' : '🔴 Net loss in period'}
                  </span>
                </div>
              </div>

              {/* Secondary Details (Credits Summary) */}
              <div className="bg-gray-50 p-4 rounded-xl border flex justify-between items-center text-sm">
                <div>
                  <h4 className="font-bold text-gray-800">Outstanding Customer Credit Ledger</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Total credit currently active (not yet paid by customers)</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-red-600">
                    AED {plReport.summary.outstanding_credit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  <p className="text-xs font-bold text-gray-400">{plReport.summary.outstanding_credit_count} active credits</p>
                </div>
              </div>

              {/* Categorized breakdown sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                
                {/* Purchases by Category */}
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-gray-800 border-b pb-2">📦 Purchases by Category</h3>
                  {plReport.purchases_by_category && plReport.purchases_by_category.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Category</th>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Count</th>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {plReport.purchases_by_category.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2 text-sm font-semibold text-gray-700 capitalize">{cat.category}</td>
                              <td className="px-4 py-2 text-sm text-center font-mono text-gray-600">{cat.count}</td>
                              <td className="px-4 py-2 text-sm font-bold text-right text-gray-900">
                                AED {parseFloat(cat.total).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-xs">
                      No purchases recorded in this range.
                    </div>
                  )}
                </div>

                {/* Expenses by Category */}
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-gray-800 border-b pb-2">💸 Expenses by Category</h3>
                  {plReport.expenses_by_category && plReport.expenses_by_category.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Category</th>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Count</th>
                            <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {plReport.expenses_by_category.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2 text-sm font-semibold text-gray-700 capitalize">{cat.category}</td>
                              <td className="px-4 py-2 text-sm text-center font-mono text-gray-600">{cat.count}</td>
                              <td className="px-4 py-2 text-sm font-bold text-right text-gray-900">
                                AED {parseFloat(cat.total).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-xs">
                      No expenses recorded in this range.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit Report */}
      {activeTab === 'credit' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <h2 className="text-xl font-bold mb-4">Credit Report</h2>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end bg-gray-50 p-4 rounded-xl border no-print">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={creditStartDate}
                onChange={(e) => setCreditStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={creditEndDate}
                onChange={(e) => setCreditEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={fetchCreditReport}
              disabled={creditLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-bold"
            >
              {creditLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {creditReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Credit Granted</span>
                  <h3 className="text-3xl font-black text-orange-600 mt-2">
                    AED {totalCreditGranted.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Recovered</span>
                  <h3 className="text-3xl font-black text-green-600 mt-2">
                    AED {totalRecovered.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Balance</span>
                  <h3 className="text-3xl font-black text-red-600 mt-2">
                    AED {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </h3>
                </div>
              </div>

              {/* Credits List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Customer</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Plate</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Total Credit</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Recovered</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Remaining</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {creditReport.length > 0 ? (
                      creditReport.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-sm text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-gray-800">{c.customer_name}</td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-700">{c.vehicle_plate}</td>
                          <td className="px-4 py-2 text-sm font-bold text-right text-gray-900">
                            AED {parseFloat(c.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">
                            AED {parseFloat(c.amount - c.remaining_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm font-bold text-right text-red-600">
                            AED {parseFloat(c.remaining_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              c.status === 'fully_paid' ? 'bg-green-100 text-green-800' :
                              c.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-6 text-gray-500 text-sm">
                          No credit records found in this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Cash Register Sessions */}
      {activeTab === 'registers' && (
        <div className="bg-white p-6 rounded-lg shadow">
          {!selectedRegisterReport ? (
            <div>
              <h2 className="text-xl font-bold mb-4">Cash Register Sessions</h2>
              {loadingRegisters ? (
                <div className="text-center py-12 text-gray-500">Loading sessions...</div>
              ) : registers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Session ID</th>
                        <th className="px-4 py-2 text-left">Opened By</th>
                        <th className="px-4 py-2 text-left">Opened At</th>
                        <th className="px-4 py-2 text-left">Closed By / At</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-right font-bold">Starting Cash</th>
                        <th className="px-4 py-2 text-right font-bold">Closed Amount</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registers.map((reg) => (
                        <tr key={reg.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-bold">#{reg.id}</td>
                          <td className="px-4 py-2">{reg.opened_by_name}</td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(reg.opened_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {reg.status === 'open' ? (
                              <span className="text-green-600 font-semibold">Session Active</span>
                            ) : (
                              <div>
                                <p>{reg.closed_by_name}</p>
                                <p className="text-gray-400 text-[10px]">
                                  {new Date(reg.closed_at).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                              reg.status === 'open' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reg.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            AED {parseFloat(reg.opening_balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {reg.closed_amount !== null 
                              ? `AED ${parseFloat(reg.closed_amount).toFixed(2)}` 
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => fetchRegisterReport(reg.id)}
                              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-bold transition"
                            >
                              View Statement
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  No register sessions found.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center no-print">
                <button
                  onClick={() => setSelectedRegisterReport(null)}
                  className="px-4 py-2 border hover:bg-gray-50 text-gray-750 text-sm font-semibold rounded-lg transition"
                >
                  ← Back to Sessions
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                >
                  🖨️ Print Statement
                </button>
              </div>

              {/* Printable Cash Register Report Card */}
              <div className="print-full-width p-6 border rounded-2xl bg-gray-50/10 space-y-6 text-black">
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-black uppercase tracking-wide">SNIPER CAR CARE</h1>
                  <p className="text-sm text-gray-650 font-bold">Daily Cash Register Statement</p>
                  <p className="text-xs text-gray-450 mt-1">Session ID: #{selectedRegisterReport.register_id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="text-left">
                    <p><span className="font-bold text-gray-700">Opened At:</span> {new Date(selectedRegisterReport.opened_at).toLocaleString()}</p>
                    <p><span className="font-bold text-gray-700">Closed At:</span> {selectedRegisterReport.closed_at ? new Date(selectedRegisterReport.closed_at).toLocaleString() : 'Active Session'}</p>
                  </div>
                  <div className="text-right">
                    <p><span className="font-bold text-gray-700">Status:</span> {selectedRegisterReport.status.toUpperCase()}</p>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse mt-4 text-left">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-100 font-bold">
                      <th className="p-2">Transaction Type</th>
                      <th className="text-right p-2">Details</th>
                      <th className="text-right p-2">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 font-bold">Starting Cash Balance</td>
                      <td className="p-2 text-right text-gray-550 font-normal">Opening Balance</td>
                      <td className="p-2 text-right font-semibold">AED {selectedRegisterReport.opening_balance.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Cash Sales (POS checkouts)</td>
                      <td className="p-2 text-right text-gray-550 font-normal">AED {selectedRegisterReport.cash_payments.sale.toFixed(2)}</td>
                      <td className="p-2 text-right">AED {selectedRegisterReport.cash_payments.sale.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Cash Credit Recoveries</td>
                      <td className="p-2 text-right text-gray-550 font-normal">AED {selectedRegisterReport.cash_payments.recovery.toFixed(2)}</td>
                      <td className="p-2 text-right">AED {selectedRegisterReport.cash_payments.recovery.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Cash Expenses</td>
                      <td className="p-2 text-right text-gray-550 font-normal">-AED {selectedRegisterReport.cash_expense.toFixed(2)}</td>
                      <td className="p-2 text-right text-red-650">-AED {selectedRegisterReport.cash_expense.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td className="p-2">Expected Cash in Drawer</td>
                      <td className="p-2 text-right text-gray-555 font-normal">Calculated Cash</td>
                      <td className="p-2 text-right">AED {selectedRegisterReport.amount_in_cash_drawer.toFixed(2)}</td>
                    </tr>
                    {selectedRegisterReport.closed_amount !== null && (
                      <>
                        <tr className="font-bold border-t-2">
                          <td className="p-2">Actual Cash Drawer Count</td>
                          <td className="p-2 text-right text-gray-550 font-normal">Counted Cash</td>
                          <td className="p-2 text-right text-blue-700">AED {selectedRegisterReport.closed_amount.toFixed(2)}</td>
                        </tr>
                        <tr className="font-bold">
                          <td className="p-2">Cash Discrepancy (Over/Short)</td>
                          <td className="p-2 text-right text-gray-555 font-normal">Drawer Variance</td>
                          <td className={`p-2 text-right ${selectedRegisterReport.closed_amount - selectedRegisterReport.amount_in_cash_drawer >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            AED {(selectedRegisterReport.closed_amount - selectedRegisterReport.amount_in_cash_drawer).toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="border-t-2 bg-gray-150">
                      <td colSpan="3" className="p-1 font-bold text-[10px] uppercase text-gray-500 text-left">Non-Cash Transactions Summary</td>
                    </tr>
                    <tr>
                      <td className="p-2">Card Payments (Sales + Recoveries)</td>
                      <td className="p-2 text-right text-gray-550 font-normal">Sale: {selectedRegisterReport.card_payments.sale.toFixed(2)} / Rec: {selectedRegisterReport.card_payments.recovery.toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold">AED {selectedRegisterReport.card_payments.total.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Tap Payments (Apple Pay / Samsung Pay)</td>
                      <td className="p-2 text-right text-gray-550 font-normal">Mobile contactless</td>
                      <td className="p-2 text-right font-semibold">AED {selectedRegisterReport.other_payments.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Bank Transfer Sales</td>
                      <td className="p-2 text-right text-gray-550 font-normal">Bank payments</td>
                      <td className="p-2 text-right font-semibold">AED {selectedRegisterReport.bank_transfer.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2">Cheque Payments</td>
                      <td className="p-2 text-right text-gray-555 font-normal font-normal">Cheque transactions</td>
                      <td className="p-2 text-right font-semibold">AED {selectedRegisterReport.cheque_payments.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-gray-600">Credit Sales (Unpaid)</td>
                      <td className="p-2 text-right text-gray-550 font-normal">To credit balances</td>
                      <td className="p-2 text-right text-gray-600 font-semibold">AED {selectedRegisterReport.credit_sales.toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold bg-gray-100 border-t-2 text-sm">
                      <td className="p-2">Total Net Sales Revenue</td>
                      <td className="p-2 text-right text-gray-550 font-normal">Grand Total</td>
                      <td className="p-2 text-right">AED {selectedRegisterReport.total_sales.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {selectedRegisterReport.notes && (
                  <div className="mt-4 p-3 border rounded bg-yellow-50 text-xs text-left">
                    <p className="font-bold text-gray-700">Register Notes:</p>
                    <p className="text-gray-600 mt-1">{selectedRegisterReport.notes}</p>
                  </div>
                )}

                <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="border-t pt-2">
                    <p>Staff Member Signature</p>
                    <p className="text-gray-400 mt-4">(...................................................)</p>
                  </div>
                  <div className="border-t pt-2">
                    <p>Manager Signature</p>
                    <p className="text-gray-400 mt-4">(...................................................)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
