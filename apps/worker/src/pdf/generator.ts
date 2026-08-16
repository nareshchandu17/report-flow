import PDFDocument from 'pdfkit';

export interface ReportData {
  title: string;
  dateRange: string;
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    completedOrders: number;
  };
  tableData: any[]; // e.g. [{ Date: '...', Orders: 10, Revenue: 100 }]
}

export const generatePDF = (data: ReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER', bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      const brandColor = '#2563EB'; // Blue-600
      const textDark = '#111827';
      const textMuted = '#6B7280';
      const bgLight = '#F3F4F6';
      
      const contentWidth = 512; // 612 (LETTER width) - 100 (margins)

      // --- Header ---
      // Logo Icon
      doc.roundedRect(50, 45, 36, 36, 8).fill(brandColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('RF', 50, 55, { width: 36, align: 'center' });
      
      // Company Name
      doc.fillColor(textDark).fontSize(20).text('ReportFlow', 100, 52);

      // Report Title & Dates (Right Aligned)
      doc.font('Helvetica-Bold').fontSize(16).text(data.title, 50, 45, { align: 'right', width: contentWidth });
      doc.font('Helvetica').fontSize(10).fillColor(textMuted).text(data.dateRange, 50, 65, { align: 'right', width: contentWidth });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 80, { align: 'right', width: contentWidth });
      
      doc.moveDown(3);

      // --- KPI Section ---
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(14).text('Key Performance Indicators', 50, doc.y);
      doc.moveDown(1);

      const kpiY = doc.y;
      const kpiWidth = (contentWidth - 45) / 4; // 4 boxes, 15px gap
      const kpiHeight = 65;

      const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      const kpis = [
        { label: 'Total Revenue', value: formatCurrency(data.metrics.totalRevenue) },
        { label: 'Total Orders', value: data.metrics.totalOrders.toLocaleString() },
        { label: 'Completed', value: data.metrics.completedOrders.toLocaleString() },
        { label: 'Avg Order Val', value: formatCurrency(data.metrics.avgOrderValue) },
      ];

      kpis.forEach((kpi, i) => {
        const x = 50 + i * (kpiWidth + 15);
        
        // KPI Box
        doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 6).fill(bgLight);
        
        // KPI Label
        doc.fillColor(textMuted).font('Helvetica').fontSize(10).text(kpi.label, x + 10, kpiY + 12, { width: kpiWidth - 20 });
        
        // KPI Value
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(14).text(kpi.value, x + 10, kpiY + 35, { width: kpiWidth - 20 });
      });

      doc.y = kpiY + kpiHeight + 40;

      // --- Revenue Analysis Table ---
      doc.fillColor(textDark).font('Helvetica-Bold').fontSize(14).text('Revenue Analysis', 50, doc.y);
      doc.moveDown(1);
      
      let y = doc.y;

      // Table Header
      doc.rect(50, y, contentWidth, 30).fill(brandColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
      
      // Columns (Date/Status, Orders, Revenue)
      const col1X = 65;
      const col2X = 250;
      const col3X = 400;

      doc.text('DATE / STATUS', col1X, y + 10);
      doc.text('ORDERS', col2X, y + 10, { width: 100, align: 'right' });
      doc.text('REVENUE', col3X, y + 10, { width: 150, align: 'right' });
      
      y += 30;
      doc.font('Helvetica').fontSize(10);

      // Table Rows
      let isAltRow = false;
      for (const row of data.tableData) {
        if (y > 700) {
          doc.addPage();
          y = 50;
          
          // Re-draw header on new page
          doc.rect(50, y, contentWidth, 30).fill(brandColor);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
          doc.text('DATE / STATUS', col1X, y + 10);
          doc.text('ORDERS', col2X, y + 10, { width: 100, align: 'right' });
          doc.text('REVENUE', col3X, y + 10, { width: 150, align: 'right' });
          y += 30;
          doc.font('Helvetica').fontSize(10);
        }

        if (isAltRow) {
          doc.rect(50, y, contentWidth, 25).fill('#F9FAFB'); // Very light grey
        }
        isAltRow = !isAltRow;

        const rowLabel = row.Date || row.customerName || row.status || 'N/A';
        const rowOrders = row.Orders?.toLocaleString() || row.count?.toLocaleString() || '0';
        const rowRev = row.Revenue ? formatCurrency(row.Revenue) : (row.amount ? formatCurrency(row.amount) : '$0.00');

        doc.fillColor(textDark);
        doc.text(rowLabel, col1X, y + 8);
        doc.text(rowOrders, col2X, y + 8, { width: 100, align: 'right' });
        doc.text(rowRev, col3X, y + 8, { width: 150, align: 'right' });
        
        // Subtle bottom border for row
        doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, y + 25).lineTo(50 + contentWidth, y + 25).stroke();

        y += 25;
      }

      // --- Footer ---
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fillColor(textMuted).fontSize(9).text(
          `Page ${i + 1} of ${pageCount}  •  ReportFlow Inc.`,
          50,
          750,
          { align: 'center', width: contentWidth }
        );
        // Top line for footer
        doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, 740).lineTo(50 + contentWidth, 740).stroke();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

