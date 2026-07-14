import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? (tabParam || 'daily') : 'registers');

  useEffect(() => {
    if (user?.role === 'admin') {
      if (tabParam) {
        setActiveTab(tabParam);
      }
    } else {
      setActiveTab('registers');
    }
  }, [tabParam, user]);

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

  // Stock Report State
  const [stockStartDate, setStockStartDate] = useState('');
  const [stockEndDate, setStockEndDate] = useState('');
  const [stockReport, setStockReport] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  // Cash Register Sessions State
  const [registers, setRegisters] = useState([]);
  const [loadingRegisters, setLoadingRegisters] = useState(false);
  const [selectedRegisterReport, setSelectedRegisterReport] = useState(null);
  const [loadingRegisterReport, setLoadingRegisterReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const printRegisterId = searchParams.get('print_register_id');

  const formatRegisterDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    
    const day = d.getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${day}${suffix} ${month}, ${year} ${hours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    if (printRegisterId) {
      fetchRegisterReport(printRegisterId);
    }
  }, [printRegisterId]);

  useEffect(() => {
    if (printRegisterId && selectedRegisterReport && selectedRegisterReport.register_id === parseInt(printRegisterId)) {
      const handleAfterPrint = () => {
        const newParams = new URLSearchParams(window.location.search);
        if (newParams.has('print_register_id')) {
          newParams.delete('print_register_id');
          setSearchParams(newParams);
        }
        window.removeEventListener('afterprint', handleAfterPrint);
      };

      const timer = setTimeout(() => {
        window.addEventListener('afterprint', handleAfterPrint);
        window.print();
      }, 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [selectedRegisterReport, printRegisterId, setSearchParams]);

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
      if (!printRegisterId) {
        setSelectedRegisterReport(null);
      }
    } else if (activeTab === 'stock') {
      fetchStockReport();
    }
  }, [activeTab, printRegisterId]);

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

  // Stock Report
  const fetchStockReport = async () => {
    setStockLoading(true);
    try {
      let url = '/api/analytics/reports/stock';
      if (stockStartDate && stockEndDate) {
        url += `?start_date=${stockStartDate}&end_date=${stockEndDate}`;
      }
      const response = await axios.get(url);
      setStockReport(response.data.stock || []);
    } catch (err) {
      toast.error('Failed to generate stock report');
    } finally {
      setStockLoading(false);
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

  const tabs = user?.role === 'admin' ? [
    { id: 'daily', label: 'Daily Business Summary' },
    { id: 'business_summary', label: 'Business Summary Report (P&L)' },
    { id: 'stock', label: 'Stock Report' },
    { id: 'payment', label: 'Payment Type Report' },
    { id: 'customer', label: 'Customer Wise Report' },
    { id: 'supplier', label: 'Supplier Payment' },
    { id: 'purchases', label: 'Purchase of Items' },
    { id: 'credit', label: 'Credit Report' },
    { id: 'registers', label: 'Cash Register Sessions' },
  ] : [
    { id: 'registers', label: 'Cash Register Sessions' },
  ];

  const handleWhatsAppShare = async () => {
    setSharing(true);
    try {
      const params = new URLSearchParams();
      params.append('tab', activeTab);
      
      if (activeTab === 'daily') {
        params.append('date', dailyDate);
      } else if (activeTab === 'business_summary') {
        if (!plStartDate || !plEndDate) {
          toast.error('Please select both start and end dates');
          setSharing(false);
          return;
        }
        params.append('start_date', plStartDate);
        params.append('end_date', plEndDate);
      } else if (activeTab === 'stock') {
        if (stockStartDate && stockEndDate) {
          params.append('start_date', stockStartDate);
          params.append('end_date', stockEndDate);
        }
      } else if (activeTab === 'payment') {
        if (!paymentStartDate || !paymentEndDate) {
          toast.error('Please select both start and end dates');
          setSharing(false);
          return;
        }
        params.append('start_date', paymentStartDate);
        params.append('end_date', paymentEndDate);
      } else if (activeTab === 'customer') {
        if (!customerStartDate || !customerEndDate) {
          toast.error('Please select both start and end dates');
          setSharing(false);
          return;
        }
        params.append('start_date', customerStartDate);
        params.append('end_date', customerEndDate);
      } else if (activeTab === 'supplier') {
        if (!supplierStartDate || !supplierEndDate) {
          toast.error('Please select both start and end dates');
          setSharing(false);
          return;
        }
        params.append('start_date', supplierStartDate);
        params.append('end_date', supplierEndDate);
      } else if (activeTab === 'purchases') {
        if (!purchaseStartDate || !purchaseEndDate) {
          toast.error('Please select both start and end dates');
          setSharing(false);
          return;
        }
        params.append('start_date', purchaseStartDate);
        params.append('end_date', purchaseEndDate);
      } else if (activeTab === 'credit') {
        if (creditStartDate && creditEndDate) {
          params.append('start_date', creditStartDate);
          params.append('end_date', creditEndDate);
        }
      } else if (activeTab === 'registers') {
        if (!selectedRegisterReport) {
          toast.error('No active register session report opened');
          setSharing(false);
          return;
        }
        params.append('register_id', selectedRegisterReport.register_id);
      }

      const response = await axios.get(`/api/analytics/reports/pdf?${params.toString()}`);
      if (response.data.success && response.data.pdfUrl) {
        const backendBaseUrl = axios.defaults.baseURL || window.location.origin;
        const fullPdfUrl = `${backendBaseUrl}${response.data.pdfUrl}`;
        
        try {
          // Fetch the PDF blob to create a File object
          const fileResponse = await fetch(fullPdfUrl);
          const blob = await fileResponse.blob();
          const file = new File([blob], `report-${activeTab}-${Date.now()}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Sniper Car Care Report',
              text: 'Please find the attached PDF report.'
            });
            toast.success('Report PDF shared successfully!');
            return;
          }
        } catch (shareErr) {
          console.warn('Native sharing failed, falling back to link:', shareErr);
        }
        
        // Fallback to text link if navigator.share fails or is not supported
        const message = `Check out the Sniper Car Care report: ${fullPdfUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('Opened PDF report link in browser.');
      } else {
        toast.error('Failed to generate report PDF');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      toast.error('Failed to generate and share report PDF');
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const printStyle = `
    @media print {
      @page {
        size: auto;
        margin: 10mm !important;
      }
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
      .print-card {
        margin: 0 !important;
        padding: 0 !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
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
      
      {/* Screen layout content (Hidden during printing) */}
      <div className="space-y-6 no-print">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsAppShare}
              disabled={sharing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm font-semibold disabled:opacity-50"
            >
              {sharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating PDF...
                </>
              ) : (
                <>💬 Share via WhatsApp</>
              )}
            </button>
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
        </div>
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
              {/* Restructured Business Summary Printable Template Sheet */}
              <div className="max-w-3xl mx-auto bg-white p-8 border rounded-2xl shadow-sm space-y-6 text-black print-full-width">
                {/* Header */}
                <div className="text-center space-y-1 border-b pb-6">
                  <h2 className="text-2xl font-black uppercase tracking-wide">Business Summary Report</h2>
                  <p className="text-sm font-bold text-gray-600">Business Location: Main Branch</p>
                  <p className="text-xs text-gray-500 font-mono">
                    Date Range: {plStartDate ? plStartDate.split('-').reverse().join('-') : ''} TO {plEndDate ? plEndDate.split('-').reverse().join('-') : ''}
                  </p>
                </div>

                {/* Report Body */}
                <div className="space-y-6 text-sm">
                  
                  {/* Sales Details Section */}
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-base border-b pb-1 text-gray-900 uppercase">Sales Details :</h3>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Sales</span>
                        <span className="font-mono text-gray-900 font-bold">{parseFloat(plReport.summary.total_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Sales Return</span>
                        <span className="font-mono text-gray-900">0.000</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-b py-1 my-1">
                        <span className="text-gray-900">Net Sales</span>
                        <span className="font-mono text-indigo-700 font-extrabold">{parseFloat(plReport.summary.net_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-gray-500">Cash Sale</span>
                        <span className="font-mono text-gray-800 font-semibold">{parseFloat(plReport.summary.cash_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-gray-500">Card Sale</span>
                        <span className="font-mono text-gray-800 font-semibold">{parseFloat(plReport.summary.card_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-gray-500">Credit Sale</span>
                        <span className="font-mono text-gray-800 font-semibold">{parseFloat(plReport.summary.credit_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-gray-500">Bank Transfer Sales</span>
                        <span className="font-mono text-gray-800 font-semibold">{parseFloat(plReport.summary.bank_transfer_sales || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1.5 mt-2">
                        <span className="text-gray-700">Cost of Goods / Services</span>
                        <span className="font-mono text-red-600 font-bold">{parseFloat(plReport.summary.total_cost || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between font-extrabold border-t pt-1.5 mt-2">
                        <span className="text-gray-900">Total Profit</span>
                        <span className={`font-mono text-base ${plReport.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(plReport.summary.net_profit || 0).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Credit Recovery Section */}
                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base border-b pb-1 text-gray-900 uppercase">Credit Recovery :</h3>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Cash Recovery</span>
                        <span className="font-mono text-gray-900 font-semibold">{parseFloat(plReport.summary.cash_recovery || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Card Recovery</span>
                        <span className="font-mono text-gray-900 font-semibold">{parseFloat(plReport.summary.card_recovery || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Bank Transfer</span>
                        <span className="font-mono text-gray-900 font-semibold">{parseFloat(plReport.summary.bank_recovery || 0).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Details Section */}
                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base border-b pb-1 text-gray-900 uppercase">Purchase Details:</h3>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Purchase</span>
                        <span className="font-mono text-gray-900 font-bold">{parseFloat(plReport.summary.total_purchases || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Purchase Return</span>
                        <span className="font-mono text-gray-900">0.000</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Details Section */}
                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base border-b pb-1 text-gray-900 uppercase">Expense Details:</h3>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Expense</span>
                        <span className="font-mono text-gray-900 font-bold">{parseFloat(plReport.summary.total_expenses || 0).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Other Activities Section */}
                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base border-b pb-1 text-gray-900 uppercase">Other Activities:</h3>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Free Washes Value</span>
                        <span className="font-mono text-gray-900 font-bold">{parseFloat(plReport.summary.free_wash_total || 0).toFixed(3)} ({plReport.summary.free_wash_count || 0} washes)</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Print Footer */}
                <div className="hidden print:block pt-12 text-center text-[10px] text-gray-400 border-t border-dashed">
                  Thank you for choosing Sniper Car Care POS System.
                </div>
              </div>

              {/* Categorized breakdowns displayed on screen only */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 no-print border-t">
                {/* Purchases by Category */}
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-gray-800 border-b pb-2 uppercase tracking-wide">📦 Purchases by Category</h3>
                  {plReport.purchases_by_category && plReport.purchases_by_category.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500">Category</th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500 text-center">Count</th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {plReport.purchases_by_category.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2 font-semibold text-gray-700 capitalize">{cat.category}</td>
                              <td className="px-4 py-2 text-center font-mono text-gray-600">{cat.count}</td>
                              <td className="px-4 py-2 font-bold text-right text-gray-900">
                                AED {parseFloat(cat.total).toFixed(3)}
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
                  <h3 className="text-sm font-extrabold text-gray-800 border-b pb-2 uppercase tracking-wide">💸 Expenses by Category</h3>
                  {plReport.expenses_by_category && plReport.expenses_by_category.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500">Category</th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500 text-center">Count</th>
                            <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-500 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {plReport.expenses_by_category.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2 font-semibold text-gray-700 capitalize">{cat.category}</td>
                              <td className="px-4 py-2 text-center font-mono text-gray-600">{cat.count}</td>
                              <td className="px-4 py-2 font-bold text-right text-gray-900">
                                AED {parseFloat(cat.total).toFixed(3)}
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

      {/* Stock Report */}
      {activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="flex justify-between items-center border-b pb-4 no-print">
            <h2 className="text-xl font-bold text-gray-800">Stock Inventory Report</h2>
            <div className="flex gap-2">
              <button
                onClick={handleWhatsAppShare}
                disabled={sharing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition flex items-center gap-2 text-xs disabled:opacity-50"
              >
                {sharing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>💬 Share via WhatsApp</>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition flex items-center gap-2 text-xs"
              >
                🖨️ Print Stock Report
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-end bg-gray-50 p-4 rounded-xl border no-print">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (for sales count)</label>
              <input
                type="date"
                value={stockStartDate}
                onChange={(e) => setStockStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date (for sales count)</label>
              <input
                type="date"
                value={stockEndDate}
                onChange={(e) => setStockEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white"
              />
            </div>
            <button
              onClick={fetchStockReport}
              disabled={stockLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-bold"
            >
              {stockLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {stockReport && (
            <div className="space-y-6 print-full-width">
              {/* Report Header for printing */}
              <div className="hidden print:block text-center border-b pb-4">
                <h1 className="text-2xl font-black uppercase tracking-wide">SNIPER CAR CARE</h1>
                <h2 className="text-base font-bold text-gray-650">Stock Inventory & Sales Report</h2>
                <p className="text-xs text-gray-450 mt-1">
                  Sales Period: {stockStartDate && stockEndDate ? `${stockStartDate} to ${stockEndDate}` : 'All Time'}
                </p>
                <p className="text-xs text-gray-450">Generated At: {new Date().toLocaleString()}</p>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 uppercase font-black">Total Stock Items</span>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    {stockReport.reduce((sum, item) => sum + parseInt(item.current_stock || 0), 0)}
                  </p>
                </div>
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 uppercase font-black">Out of Stock Items</span>
                  <p className="text-2xl font-black text-red-700 mt-1">
                    {stockReport.filter(item => parseInt(item.current_stock || 0) === 0).length}
                  </p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 uppercase font-black">Low Stock Items (≤5)</span>
                  <p className="text-2xl font-black text-amber-700 mt-1">
                    {stockReport.filter(item => parseInt(item.current_stock || 0) <= 5 && parseInt(item.current_stock || 0) > 0).length}
                  </p>
                </div>
                <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl text-center">
                  <span className="text-xs text-gray-500 uppercase font-black">Total Units Sold (Period)</span>
                  <p className="text-2xl font-black text-green-700 mt-1">
                    {stockReport.reduce((sum, item) => sum + parseInt(item.quantity_sold || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Table of Details */}
              <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b font-bold text-gray-700">
                      <th className="p-3">Product ID</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Cost Price (AED)</th>
                      <th className="p-3 text-right">Selling Price (AED)</th>
                      <th className="p-3 text-right">Qty Sold</th>
                      <th className="p-3 text-right">Qty Remaining (Stock)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Shortage Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockReport.length > 0 ? (
                      stockReport.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3 font-mono text-gray-500">#{item.id}</td>
                          <td className="p-3 font-bold text-gray-800">{item.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-gray-650">
                            {parseFloat(item.cost_price || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-900 font-semibold">
                            {parseFloat(item.selling_price || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-semibold text-green-600">{item.quantity_sold}</td>
                          <td className={`p-3 text-right font-extrabold ${parseInt(item.current_stock || 0) === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.current_stock}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              item.stock_status === 'Out of Stock' ? 'bg-red-100 text-red-800' :
                              item.stock_status === 'Low Stock' ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.stock_status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-red-650">
                            {item.quantity_short > 0 ? `${item.quantity_short} units` : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="p-6 text-center text-gray-400">
                          No stock items registered in the database.
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
                <div className="flex gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    💬 Share via WhatsApp
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    🖨️ Print Statement
                  </button>
                </div>
              </div>
              
              {/* Printable Cash Register Report Card */}
              <div className="print-full-width mx-auto max-w-3xl p-6 border rounded-2xl bg-white space-y-4 text-black font-mono text-[14px] shadow-sm">
                <div className="text-center pb-3 border-b border-dashed border-gray-400">
                  <h2 className="text-sm font-bold uppercase tracking-wider">Register Details</h2>
                  <p className="text-[10px] text-gray-600 mt-1">
                    ({formatRegisterDate(selectedRegisterReport.opened_at)} - {selectedRegisterReport.closed_at ? formatRegisterDate(selectedRegisterReport.closed_at) : 'Active Session'})
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span>Opening Balance</span>
                    <span className="font-semibold">{selectedRegisterReport.opening_balance.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Sale</span>
                    <span>{selectedRegisterReport.cash_payments.sale.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card Sale</span>
                    <span>{selectedRegisterReport.card_payments.sale.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Sale</span>
                    <span>{selectedRegisterReport.bank_transfer.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Sale</span>
                    <span>{selectedRegisterReport.other_payments.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Sale</span>
                    <span>{selectedRegisterReport.credit_sales.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Sale Recovery</span>
                    <span>{selectedRegisterReport.credit_sale_recovery.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Free Washes Amount</span>
                    <span>{parseFloat(selectedRegisterReport.free_wash_amount || 0).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Expense</span>
                    <span>{selectedRegisterReport.total_expense.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed pt-1.5 mt-1">
                    <span>Total Sales</span>
                    <span>{selectedRegisterReport.total_sales.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Cash In Drawer</span>
                    <span>{selectedRegisterReport.amount_in_cash_drawer.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Difference Amount</span>
                    <span>
                      {(selectedRegisterReport.closed_amount !== null
                        ? selectedRegisterReport.closed_amount - selectedRegisterReport.amount_in_cash_drawer
                        : 0.00
                      ).toFixed(3)}
                    </span>
                  </div>
                </div>

                {selectedRegisterReport.notes && (
                  <div className="border-t border-dashed pt-2 mt-2 text-[10px] text-gray-600">
                    <p className="font-bold">Notes:</p>
                    <p>{selectedRegisterReport.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Cash Register Report Card (Only visible when printing) */}
      {selectedRegisterReport && (
        <div className="hidden print:block print-card mx-auto max-w-3xl p-6 border rounded-2xl bg-white space-y-4 text-black font-mono text-[14px] shadow-sm">
          <div className="text-center pb-3 border-b border-dashed border-gray-400">
            <h2 className="text-sm font-bold uppercase tracking-wider">Register Details</h2>
            <p className="text-[10px] text-gray-655 mt-1">
              ({formatRegisterDate(selectedRegisterReport.opened_at)} - {selectedRegisterReport.closed_at ? formatRegisterDate(selectedRegisterReport.closed_at) : 'Active Session'})
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <span>Opening Balance</span>
              <span className="font-semibold">{selectedRegisterReport.opening_balance.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Sale</span>
              <span>{selectedRegisterReport.cash_payments.sale.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card Sale</span>
              <span>{selectedRegisterReport.card_payments.sale.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bank Sale</span>
              <span>{selectedRegisterReport.bank_transfer.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Sale</span>
              <span>{selectedRegisterReport.other_payments.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credit Sale</span>
              <span>{selectedRegisterReport.credit_sales.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credit Sale Recovery</span>
              <span>{selectedRegisterReport.credit_sale_recovery.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Free Washes Amount</span>
              <span>{parseFloat(selectedRegisterReport.free_wash_amount || 0).toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Expense</span>
              <span>{selectedRegisterReport.total_expense.toFixed(3)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-dashed pt-1.5 mt-1">
              <span>Total Sales</span>
              <span>{selectedRegisterReport.total_sales.toFixed(3)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Cash In Drawer</span>
              <span>{selectedRegisterReport.amount_in_cash_drawer.toFixed(3)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Difference Amount</span>
              <span>
                {(selectedRegisterReport.closed_amount !== null
                  ? selectedRegisterReport.closed_amount - selectedRegisterReport.amount_in_cash_drawer
                  : 0.00
                ).toFixed(3)}
              </span>
            </div>
          </div>

          {selectedRegisterReport.notes && (
            <div className="border-t border-dashed pt-2 mt-2 text-[10px] text-gray-600">
              <p className="font-bold">Notes:</p>
              <p>{selectedRegisterReport.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
