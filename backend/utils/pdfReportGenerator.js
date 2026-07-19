const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF report based on the tab type and data provided.
 * @param {string} tab - The tab type (daily, business_summary, stock, etc.)
 * @param {object} data - The query data returned from the database
 * @param {object} params - Date ranges or register IDs
 * @param {string} outputPath - The path where the PDF should be written
 */
function generatePDFReport(tab, data, params, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = '#1e3a8a'; // Deep blue
      const secondaryColor = '#eab308'; // Amber/Gold
      const darkColor = '#1f2937'; // Dark charcoal
      const lightBg = '#f3f4f6'; // Light gray
      const white = '#ffffff';

      // Header Banner
      doc.rect(0, 0, 595.28, 80).fill(darkColor);
      
      doc.fillColor(secondaryColor)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('SNIPER CAR CARE', 40, 20);
         
      doc.fillColor(white)
         .fontSize(10)
         .font('Helvetica')
         .text('ANPR POS & SALOON MANAGEMENT SYSTEM', 40, 45);

      doc.fillColor(white)
         .fontSize(8)
         .font('Helvetica-Oblique')
         .text(`Generated: ${new Date().toLocaleString()}`, 400, 45, { align: 'right', width: 155 });

      let currentY = 100;

      // Report Title
      let title = 'Report';
      let dateRange = 'All Time';
      if (params.start_date && params.end_date) {
        dateRange = `${params.start_date.split('-').reverse().join('-')} to ${params.end_date.split('-').reverse().join('-')}`;
      } else if (params.date) {
        dateRange = params.date.split('-').reverse().join('-');
      }

      switch (tab) {
        case 'daily':
          title = 'Daily Business Summary';
          break;
        case 'business_summary':
          title = 'Business Summary Report (P&L)';
          break;
        case 'stock':
          title = 'Stock Inventory Report';
          break;
        case 'payment':
          title = 'Payment Type Report';
          break;
        case 'customer':
          title = 'Customer Wise Report';
          break;
        case 'supplier':
          title = 'Supplier Payment Report';
          break;
        case 'purchases':
          title = 'Purchase of Items Report';
          break;
        case 'credit':
          title = 'Credit Report';
          break;
        case 'commission':
          title = 'Commission Report';
          break;
        case 'service_sales':
          title = 'Service Sales Report';
          break;
        case 'registers':
          title = `Cash Register Session Report (#${params.register_id || 'Active'})`;
          dateRange = '';
          break;
      }

      doc.fillColor(darkColor)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(title.toUpperCase(), 40, currentY);

      if (dateRange) {
        doc.fillColor('#6b7280')
           .fontSize(10)
           .font('Helvetica')
           .text(`Period: ${dateRange}`, 40, currentY + 20);
        currentY += 45;
      } else {
        currentY += 30;
      }

      // Divider Line
      doc.strokeColor('#d1d5db')
         .lineWidth(1)
         .moveTo(40, currentY)
         .lineTo(555, currentY)
         .stroke();
         
      currentY += 20;

      // Helper to draw a key-value row
      const drawRow = (label, val, y, isBold = false) => {
        doc.fillColor(darkColor)
           .fontSize(10)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .text(label, 50, y);
        doc.text(val, 350, y, { align: 'right', width: 195 });
        return y + 18;
      };

      // Helper to draw table headers
      const drawTableHeaders = (headers, cols, y) => {
        doc.rect(40, y, 515, 20).fill(primaryColor);
        doc.fillColor(white).font('Helvetica-Bold').fontSize(9);
        headers.forEach((h, idx) => {
          doc.text(h, cols[idx].x, y + 5, { width: cols[idx].w, align: cols[idx].align || 'left' });
        });
        return y + 20;
      };

      // Helper to draw table rows
      const drawTableRows = (rows, cols, startY) => {
        let y = startY;
        doc.font('Helvetica').fontSize(8.5).fillColor(darkColor);
        rows.forEach((row, rowIdx) => {
          // Page overflow check
          if (y > 750) {
            doc.addPage();
            // Redraw Header
            doc.rect(0, 0, 595.28, 50).fill(darkColor);
            doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('SNIPER CAR CARE', 40, 15);
            doc.fillColor(white).fontSize(8).font('Helvetica').text(title.toUpperCase(), 40, 32);
            y = 70;
            // Redraw headers
            y = drawTableHeaders(cols.map(c => c.name), cols, y);
            doc.font('Helvetica').fontSize(8.5).fillColor(darkColor);
          }

          // Zebra striping
          if (rowIdx % 2 === 1) {
            doc.rect(40, y, 515, 18).fill(lightBg);
            doc.fillColor(darkColor);
          }

          cols.forEach((col, colIdx) => {
            const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key].toString() : '';
            doc.text(val, col.x, y + 4, { width: col.w, align: col.align || 'left' });
          });

          y += 18;
        });
        return y;
      };

      // Layout rendering per tab
      if (tab === 'daily') {
        const { orders, services, payment_methods, top_products } = data;
        
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Summary Statistics', 40, currentY);
        currentY += 20;
        
        currentY = drawRow('Total Orders', (orders.total_orders || 0).toString(), currentY);
        currentY = drawRow('Total Sales', `AED ${parseFloat(orders.total_sales !== undefined ? orders.total_sales : orders.total_revenue || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Discounts', `AED ${parseFloat(orders.total_discounts || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Paid Orders', (orders.paid_orders || 0).toString(), currentY);
        currentY = drawRow('Pending Orders', (orders.pending_orders || 0).toString(), currentY);
        currentY = drawRow('Total Services Added', (services.total_services || 0).toString(), currentY);
        currentY = drawRow('Completed Services', (services.completed_services || 0).toString(), currentY);
        currentY = drawRow('Services Sales', `AED ${parseFloat(services.services_revenue || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Saloon Free Washes', `AED ${parseFloat(orders.saloon_free_washes_value || 0).toFixed(2)}`, currentY);
        currentY = drawRow('4x4 Free Washes', `AED ${parseFloat(orders.four_wheel_free_washes_value || 0).toFixed(2)}`, currentY);
        
        currentY += 20;

        if (payment_methods && payment_methods.length > 0) {
          doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Payment Methods Breakdown', 40, currentY);
          currentY += 15;
          const headers = ['Method', 'Transactions', 'Total Amount'];
          const cols = [
            { name: 'Method', key: 'method', x: 50, w: 150 },
            { name: 'Transactions', key: 'count', x: 210, w: 100, align: 'right' },
            { name: 'Total Amount', key: 'amount_str', x: 320, w: 200, align: 'right' }
          ];
          const rows = payment_methods.map(pm => ({
            method: pm.method.toUpperCase(),
            count: pm.count,
            amount_str: `AED ${parseFloat(pm.total_amount).toFixed(2)}`
          }));
          currentY = drawTableHeaders(headers, cols, currentY);
          currentY = drawTableRows(rows, cols, currentY) + 20;
        }

        if (top_products && top_products.length > 0) {
          doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Top Products Sold', 40, currentY);
          currentY += 15;
          const headers = ['Product Name', 'Category', 'Qty Sold', 'Revenue'];
          const cols = [
            { name: 'Product Name', key: 'name', x: 50, w: 200 },
            { name: 'Category', key: 'category', x: 260, w: 100 },
            { name: 'Qty Sold', key: 'qty', x: 370, w: 60, align: 'right' },
            { name: 'Revenue', key: 'rev', x: 440, w: 100, align: 'right' }
          ];
          const rows = top_products.map(tp => ({
            name: tp.name,
            category: tp.category,
            qty: tp.quantity_sold,
            rev: `AED ${parseFloat(tp.revenue).toFixed(2)}`
          }));
          currentY = drawTableHeaders(headers, cols, currentY);
          currentY = drawTableRows(rows, cols, currentY);
        }
      } 
      else if (tab === 'business_summary') {
        const { summary, purchases_by_category, expenses_by_category } = data;
        
        // Summary Cards Layout
        doc.rect(40, currentY, 160, 50).fill(lightBg);
        doc.fillColor(darkColor).font('Helvetica').fontSize(8).text('NET SALES', 50, currentY + 10);
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text(`AED ${parseFloat(summary.net_sales || 0).toFixed(2)}`, 50, currentY + 25);

        doc.rect(215, currentY, 160, 50).fill(lightBg);
        doc.fillColor(darkColor).font('Helvetica').fontSize(8).text('COST OF SALES', 225, currentY + 10);
        doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(11).text(`AED ${parseFloat(summary.total_cost || 0).toFixed(2)}`, 225, currentY + 25);

        doc.rect(390, currentY, 165, 50).fill(summary.net_profit >= 0 ? '#dcfce7' : '#fee2e2');
        doc.fillColor(darkColor).font('Helvetica').fontSize(8).text('TOTAL PROFIT', 400, currentY + 10);
        doc.fillColor(summary.net_profit >= 0 ? '#15803d' : '#b91c1c').font('Helvetica-Bold').fontSize(11).text(`AED ${parseFloat(summary.net_profit || 0).toFixed(2)}`, 400, currentY + 25);

        currentY += 70;

        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Financial Details', 40, currentY);
        currentY += 15;
        
        currentY = drawRow('Total Sales (Gross)', `AED ${parseFloat(summary.total_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Discounts Given', `AED ${parseFloat(summary.total_discounts || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Net Sales', `AED ${parseFloat(summary.net_sales || 0).toFixed(2)}`, currentY, true);
        currentY = drawRow('  - Cash Sales', `AED ${parseFloat(summary.cash_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - Card Sales', `AED ${parseFloat(summary.card_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - TAP Sales', `AED ${parseFloat(summary.tap_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - Credit Sales', `AED ${parseFloat(summary.credit_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - Bank Transfer Sales', `AED ${parseFloat(summary.bank_transfer_sales || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Cost of Goods/Services Sold', `AED ${parseFloat(summary.total_cost || 0).toFixed(2)}`, currentY, true);
        currentY = drawRow('Net Profit', `AED ${parseFloat(summary.net_profit || 0).toFixed(2)}`, currentY, true);
        
        currentY += 15;
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
        currentY += 15;

        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Other Activities (Shown Separately)', 40, currentY);
        currentY += 15;
        
        const recoveries = (summary.cash_recovery || 0) + (summary.card_recovery || 0) + (summary.bank_recovery || 0);
        currentY = drawRow('Credit Recoveries Total', `AED ${parseFloat(recoveries).toFixed(2)}`, currentY);
        currentY = drawRow('  - Cash Recoveries', `AED ${parseFloat(summary.cash_recovery || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - Card Recoveries', `AED ${parseFloat(summary.card_recovery || 0).toFixed(2)}`, currentY);
        currentY = drawRow('  - Bank Recoveries', `AED ${parseFloat(summary.bank_recovery || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Inventory Purchases', `AED ${parseFloat(summary.total_purchases || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Business Expenses', `AED ${parseFloat(summary.total_expenses || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Saloon Free Wash', `AED ${parseFloat(summary.saloon_free_wash_total || 0).toFixed(2)} (${summary.saloon_free_wash_count || 0} washes)`, currentY);
        currentY = drawRow('4*4 Free Wash', `AED ${parseFloat(summary.fourx4_free_wash_total || 0).toFixed(2)} (${summary.fourx4_free_wash_count || 0} washes)`, currentY);

        currentY += 20;

        if (purchases_by_category && purchases_by_category.length > 0) {
          doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Purchases by Category', 40, currentY);
          currentY += 15;
          const headers = ['Category', 'Items Count', 'Total Spent'];
          const cols = [
            { name: 'Category', key: 'cat', x: 50, w: 200 },
            { name: 'Items Count', key: 'cnt', x: 260, w: 100, align: 'center' },
            { name: 'Total Spent', key: 'tot', x: 370, w: 170, align: 'right' }
          ];
          const rows = purchases_by_category.map(c => ({
            cat: c.category.toUpperCase(),
            cnt: c.count,
            tot: `AED ${parseFloat(c.total).toFixed(2)}`
          }));
          currentY = drawTableHeaders(headers, cols, currentY);
          currentY = drawTableRows(rows, cols, currentY) + 20;
        }

        if (expenses_by_category && expenses_by_category.length > 0) {
          doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Expenses by Category', 40, currentY);
          currentY += 15;
          const headers = ['Category', 'Expenses Count', 'Total Spent'];
          const cols = [
            { name: 'Category', key: 'cat', x: 50, w: 200 },
            { name: 'Expenses Count', key: 'cnt', x: 260, w: 100, align: 'center' },
            { name: 'Total Spent', key: 'tot', x: 370, w: 170, align: 'right' }
          ];
          const rows = expenses_by_category.map(c => ({
            cat: c.category.toUpperCase(),
            cnt: c.count,
            tot: `AED ${parseFloat(c.total).toFixed(2)}`
          }));
          currentY = drawTableHeaders(headers, cols, currentY);
          currentY = drawTableRows(rows, cols, currentY);
        }
      }
      else if (tab === 'stock') {
        const headers = ['Product Name', 'Category', 'Stock', 'Cost Price', 'Selling Price', 'Status'];
        const cols = [
          { name: 'Product Name', key: 'name', x: 50, w: 160 },
          { name: 'Category', key: 'cat', x: 220, w: 90 },
          { name: 'Stock', key: 'stock', x: 320, w: 40, align: 'center' },
          { name: 'Cost Price', key: 'cost', x: 370, w: 60, align: 'right' },
          { name: 'Selling Price', key: 'sell', x: 440, w: 60, align: 'right' },
          { name: 'Status', key: 'status', x: 510, w: 45 }
        ];
        const rows = data.map(item => ({
          name: item.name,
          cat: item.category,
          stock: item.current_stock,
          cost: `AED ${parseFloat(item.cost_price || 0).toFixed(2)}`,
          sell: `AED ${parseFloat(item.selling_price || 0).toFixed(2)}`,
          status: item.current_stock === 0 ? 'Out' : (item.current_stock <= 5 ? 'Low' : 'Good')
        }));
        currentY = drawTableHeaders(headers, cols, currentY);
        currentY = drawTableRows(rows, cols, currentY);
      }
      else if (tab === 'payment') {
        const headers = ['Method', 'Transactions', 'Completed', 'Pending', 'Failed', 'Total Amount'];
        const cols = [
          { name: 'Method', key: 'method', x: 50, w: 120 },
          { name: 'Transactions', key: 'txs', x: 180, w: 70, align: 'center' },
          { name: 'Completed', key: 'comp', x: 260, w: 60, align: 'center' },
          { name: 'Pending', key: 'pend', x: 330, w: 50, align: 'center' },
          { name: 'Failed', key: 'fail', x: 390, w: 40, align: 'center' },
          { name: 'Total Amount', key: 'tot', x: 440, w: 100, align: 'right' }
        ];
        const rows = data.payment_methods.map(pm => ({
          method: pm.method.toUpperCase(),
          txs: pm.transaction_count,
          comp: pm.completed_count,
          pend: pm.pending_count,
          fail: pm.failed_count,
          tot: `AED ${parseFloat(pm.total_amount).toFixed(2)}`
        }));
        currentY = drawTableHeaders(headers, cols, currentY);
        currentY = drawTableRows(rows, cols, currentY);
      }
      else if (tab === 'customer') {
        const headers = ['Customer Name', 'Phone', 'Vehicle', 'Visits', 'Spent', 'Paid', 'Pending'];
        const cols = [
          { name: 'Customer Name', key: 'name', x: 50, w: 120 },
          { name: 'Phone', key: 'phone', x: 180, w: 80 },
          { name: 'Vehicle', key: 'plate', x: 270, w: 80 },
          { name: 'Visits', key: 'visits', x: 360, w: 30, align: 'center' },
          { name: 'Spent', key: 'spent', x: 400, w: 50, align: 'right' },
          { name: 'Paid', key: 'paid', x: 460, w: 45, align: 'right' },
          { name: 'Pending', key: 'pend', x: 510, w: 45, align: 'right' }
        ];
        const rows = data.customers.map(c => ({
          name: c.name,
          phone: c.phone || 'N/A',
          plate: c.vehicle_plate || 'N/A',
          visits: c.total_orders,
          spent: `${parseFloat(c.total_spent || 0).toFixed(0)}`,
          paid: `${parseFloat(c.paid_amount || 0).toFixed(0)}`,
          pend: `${parseFloat(c.pending_amount || 0).toFixed(0)}`
        }));
        currentY = drawTableHeaders(headers, cols, currentY);
        currentY = drawTableRows(rows, cols, currentY);
      }
      else if (tab === 'supplier') {
        const headers = ['Supplier Name', 'Contact Person', 'Phone', 'Products', 'Orders', 'Revenue'];
        const cols = [
          { name: 'Supplier Name', key: 'name', x: 50, w: 130 },
          { name: 'Contact Person', key: 'contact', x: 190, w: 100 },
          { name: 'Phone', key: 'phone', x: 300, w: 80 },
          { name: 'Products', key: 'prod', x: 390, w: 50, align: 'center' },
          { name: 'Orders', key: 'orders', x: 450, w: 40, align: 'center' },
          { name: 'Revenue', key: 'rev', x: 500, w: 55, align: 'right' }
        ];
        const rows = data.suppliers.map(s => ({
          name: s.supplier_name,
          contact: s.contact_person || 'N/A',
          phone: s.phone || 'N/A',
          prod: s.products_count,
          orders: s.orders_involved,
          rev: `${parseFloat(s.total_revenue_from_products || 0).toFixed(0)}`
        }));
        currentY = drawTableHeaders(headers, cols, currentY);
        currentY = drawTableRows(rows, cols, currentY);
      }
      else if (tab === 'purchases') {
        const headers = ['Product', 'Category', 'Supplier', 'Quantity', 'Orders', 'Total Revenue'];
        const cols = [
          { name: 'Product', key: 'name', x: 50, w: 140 },
          { name: 'Category', key: 'cat', x: 200, w: 90 },
          { name: 'Supplier', key: 'sup', x: 300, w: 90 },
          { name: 'Quantity', key: 'qty', x: 400, w: 40, align: 'center' },
          { name: 'Orders', key: 'ord', x: 450, w: 30, align: 'center' },
          { name: 'Total Revenue', key: 'tot', x: 490, w: 65, align: 'right' }
        ];
        const rows = data.items.map(i => ({
          name: i.name,
          cat: i.category,
          sup: i.supplier_name || 'N/A',
          qty: i.quantity_sold,
          ord: i.order_count,
          tot: `${parseFloat(i.total_revenue || 0).toFixed(0)}`
        }));
        currentY = drawTableHeaders(headers, cols, currentY);
        currentY = drawTableRows(rows, cols, currentY);
      }
      else if (tab === 'credit') {
        const { credits, total_credit_granted, total_outstanding, total_recovered } = data;
        
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Credit Performance Summary', 40, currentY);
        currentY += 20;

        currentY = drawRow('Total Credit Granted', `AED ${parseFloat(total_credit_granted || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Credit Recovered', `AED ${parseFloat(total_recovered || 0).toFixed(2)}`, currentY);
        currentY = drawRow('Total Credit Outstanding', `AED ${parseFloat(total_outstanding || 0).toFixed(2)}`, currentY, true);

        currentY += 20;

        if (credits && credits.length > 0) {
          doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Customer Debtors List', 40, currentY);
          currentY += 15;
          const headers = ['Debtor Customer', 'Phone', 'Plate', 'Total Credit', 'Remaining', 'Status'];
          const cols = [
            { name: 'Debtor Customer', key: 'name', x: 50, w: 130 },
            { name: 'Phone', key: 'phone', x: 190, w: 80 },
            { name: 'Plate', key: 'plate', x: 280, w: 80 },
            { name: 'Total Credit', key: 'credit', x: 370, w: 60, align: 'right' },
            { name: 'Remaining', key: 'rem', x: 440, w: 60, align: 'right' },
            { name: 'Status', key: 'status', x: 510, w: 45 }
          ];
          const rows = credits.map(c => ({
            name: c.customer_name,
            phone: c.customer_phone || 'N/A',
            plate: c.vehicle_plate || 'N/A',
            credit: parseFloat(c.amount).toFixed(0),
            rem: parseFloat(c.remaining_amount).toFixed(0),
            status: c.status.toUpperCase()
          }));
          currentY = drawTableHeaders(headers, cols, currentY);
          currentY = drawTableRows(rows, cols, currentY);
        }
      }
      else if (tab === 'commission') {
        const drawSection = (title, items, y) => {
          if (!items || items.length === 0) return y;
          doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(title, 40, y);
          let newY = y + 15;
          const headers = ['Service Name', 'Quantity', 'Commission (AED)'];
          const cols = [
            { name: 'Service Name', key: 'name', x: 50, w: 250 },
            { name: 'Quantity', key: 'quantity', x: 310, w: 100, align: 'right' },
            { name: 'Commission', key: 'commission', x: 420, w: 100, align: 'right' }
          ];
          const rows = items.map(item => ({
            name: item.service_name || item.vehicle_type,
            quantity: item.quantity,
            commission: parseFloat(item.commission).toFixed(2)
          }));
          // Add total row
          const totalQty = items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
          const totalComm = items.reduce((sum, item) => sum + parseFloat(item.commission || 0), 0);
          rows.push({ name: 'TOTAL', quantity: totalQty.toString(), commission: totalComm.toFixed(2) });

          newY = drawTableHeaders(headers, cols, newY);
          return drawTableRows(rows, cols, newY) + 20;
        };

        currentY = drawSection('Saloon Services', data.saloon, currentY);
        currentY = drawSection('4x4 Services', data.fourx4, currentY);
        currentY = drawSection('VIP Services', data.vip, currentY);
      }
      else if (tab === 'service_sales') {
        const drawSection = (title, items, y) => {
          if (!items || items.length === 0) return y;
          doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(title, 40, y);
          let newY = y + 15;
          const headers = ['Service Name', 'Qty', 'Selling (AED)', 'Net (AED)', 'Cost (AED)', 'Profit (AED)'];
          const cols = [
            { name: 'Service Name', key: 'name', x: 45, w: 150 },
            { name: 'Qty', key: 'quantity', x: 200, w: 40, align: 'right' },
            { name: 'Selling', key: 'selling', x: 250, w: 70, align: 'right' },
            { name: 'Net', key: 'net', x: 330, w: 70, align: 'right' },
            { name: 'Cost', key: 'cost', x: 410, w: 60, align: 'right' },
            { name: 'Profit', key: 'profit', x: 480, w: 70, align: 'right' }
          ];
          const rows = items.map(item => ({
            name: item.service_name,
            quantity: item.quantity,
            selling: parseFloat(item.selling_price).toFixed(2),
            net: parseFloat(item.net_price).toFixed(2),
            cost: parseFloat(item.cost_price).toFixed(2),
            profit: parseFloat(item.profit).toFixed(2)
          }));

          // Add summary totals row
          const totalQty = items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
          const totalSelling = items.reduce((sum, item) => sum + parseFloat(item.selling_price || 0), 0);
          const totalNet = items.reduce((sum, item) => sum + parseFloat(item.net_price || 0), 0);
          const totalCost = items.reduce((sum, item) => sum + parseFloat(item.cost_price || 0), 0);
          const totalProfit = items.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0);

          rows.push({
            name: 'TOTAL',
            quantity: totalQty.toString(),
            selling: totalSelling.toFixed(2),
            net: totalNet.toFixed(2),
            cost: totalCost.toFixed(2),
            profit: totalProfit.toFixed(2)
          });

          newY = drawTableHeaders(headers, cols, newY);
          return drawTableRows(rows, cols, newY) + 20;
        };

        currentY = drawSection('Saloon Services', data.saloon, currentY);
        currentY = drawSection('4x4 Services', data.fourx4, currentY);
        currentY = drawSection('VIP Services', data.vip, currentY);
      }
      else if (tab === 'registers') {
        const report = data;
        
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Cash Register Summary', 40, currentY);
        currentY += 20;

        const formatDate = (dateStr) => {
          if (!dateStr) return 'Active Session';
          return new Date(dateStr).toLocaleString();
        };

        currentY = drawRow('Session ID', `#${report.register_id}`, currentY);
        currentY = drawRow('Status', report.status.toUpperCase(), currentY, true);
        currentY = drawRow('Opened At', formatDate(report.opened_at), currentY);
        currentY = drawRow('Closed At', formatDate(report.closed_at), currentY);
        currentY = drawRow('Opening Balance', `AED ${parseFloat(report.opening_balance).toFixed(3)}`, currentY);
        currentY = drawRow('Closing Balance (System)', report.closing_balance ? `AED ${parseFloat(report.closing_balance).toFixed(3)}` : 'N/A', currentY);
        currentY = drawRow('Closed Amount (Actual)', report.closed_amount ? `AED ${parseFloat(report.closed_amount).toFixed(3)}` : 'N/A', currentY);
        if (report.closed_amount !== null && report.closing_balance !== null) {
          const diff = report.closed_amount - report.closing_balance;
          currentY = drawRow('Difference', `AED ${parseFloat(diff).toFixed(3)}`, currentY, true);
        }
        
        currentY += 15;
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, currentY).lineTo(555, currentY).stroke();
        currentY += 15;

        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Payments & Sales details', 40, currentY);
        currentY += 15;

        currentY = drawRow('Total Cash Payments', `AED ${parseFloat(report.cash_payments.total).toFixed(3)}`, currentY);
        currentY = drawRow('  - Cash Sales', `AED ${parseFloat(report.cash_payments.sale).toFixed(3)}`, currentY);
        currentY = drawRow('  - Cash Credit Recoveries', `AED ${parseFloat(report.cash_payments.recovery).toFixed(3)}`, currentY);
        currentY = drawRow('Total Card Payments', `AED ${parseFloat(report.card_payments.total).toFixed(3)}`, currentY);
        currentY = drawRow('  - Card Sales', `AED ${parseFloat(report.card_payments.sale).toFixed(3)}`, currentY);
        currentY = drawRow('  - Card Credit Recoveries', `AED ${parseFloat(report.card_payments.recovery).toFixed(3)}`, currentY);
        currentY = drawRow('Cheque Sales', `AED ${parseFloat(report.cheque_payments).toFixed(3)}`, currentY);
        currentY = drawRow('Bank Transfer Sales', `AED ${parseFloat(report.bank_transfer).toFixed(3)}`, currentY);
        currentY = drawRow('TAP Sales', `AED ${parseFloat(report.other_payments).toFixed(3)}`, currentY);
        currentY = drawRow('Credit Sales', `AED ${parseFloat(report.credit_sales).toFixed(3)}`, currentY);
        currentY = drawRow('Free Washes Amount', `AED ${parseFloat(report.free_wash_amount || 0).toFixed(3)}`, currentY);
        currentY = drawRow('Total Register Sales', `AED ${parseFloat(report.total_sales).toFixed(3)}`, currentY, true);
        currentY = drawRow('Total Expenses', `AED ${parseFloat(report.total_expense).toFixed(3)}`, currentY);
        currentY = drawRow('  - Paid in Cash', `AED ${parseFloat(report.cash_expense).toFixed(3)}`, currentY);
        currentY = drawRow('Actual Cash In Drawer', `AED ${parseFloat(report.amount_in_cash_drawer).toFixed(3)}`, currentY, true);
        if (report.notes) {
          currentY = drawRow('Notes', report.notes, currentY);
        }
      }

      doc.end();
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', err => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePDFReport
};
