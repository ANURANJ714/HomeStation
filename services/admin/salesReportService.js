import Order from '../../models/Order.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';

export const getDateRange = (filter, fromDate, toDate) => {
    const now = new Date();
    let start = null;
    let end = new Date(now.setHours(23, 59, 59, 999));

    if (filter === 'last30') {
        start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
    } else if (filter === 'last6months') {
        start = new Date();
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
    } else if (filter === 'lastyear') {
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
    } else if (filter === 'custom' && fromDate) {
        start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (toDate) {
            end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
        }
    } else {
        start = new Date(0);
    }

    return { start, end };
};

export const getSalesReportData = async ({ filter = 'last30', fromDate, toDate, page = 1, limit = 6 }) => {
    try {
        const { start, end } = getDateRange(filter, fromDate, toDate);

        const summaryAgg = await Order.aggregate([
            { 
                $match: { 
                    status: ORDER_STATUS.SUCCESS,
                    createdAt: { $gte: start, $lte: end } 
                } 
            },
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': 'none'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSalesCount: { $sum: '$orderItems.quantity' },
                    totalItemRevenue: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    },
                    totalProductDiscount: {
                        $sum: {
                            $multiply: [
                                { $subtract: ['$orderItems.originalPrice', '$orderItems.currentPrice'] },
                                '$orderItems.quantity'
                            ]
                        }
                    }
                }
            }
        ]);

        const couponAgg = await Order.aggregate([
            {
                $match: {
                    status: ORDER_STATUS.SUCCESS,
                    createdAt: { $gte: start, $lte: end },
                    orderItems: {
                        $elemMatch: {
                            itemStatus: { $ne: 'cancelled' },
                            returnStatus: 'none'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCouponDiscount: { $sum: '$couponDiscount' }
                }
            }
        ]);

        const summary = {
            totalSales: summaryAgg[0]?.totalSalesCount || 0,
            totalRevenue: summaryAgg[0]?.totalItemRevenue || 0,
            totalDiscount: summaryAgg[0]?.totalProductDiscount || 0,
            totalCouponDiscount: couponAgg[0]?.totalCouponDiscount || 0
        };

        const dailyAgg = await Order.aggregate([
            { 
                $match: { 
                    status: ORDER_STATUS.SUCCESS,
                    createdAt: { $gte: start, $lte: end } 
                } 
            },
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': 'none'
                }
            },
            {
                $group: {
                    _id: {
                        orderId: '$_id',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        couponDiscount: '$couponDiscount'
                    },
                    dailyItemsSold: { $sum: '$orderItems.quantity' },
                    dailyItemDiscount: {
                        $sum: {
                            $multiply: [
                                { $subtract: ['$orderItems.originalPrice', '$orderItems.currentPrice'] },
                                '$orderItems.quantity'
                            ]
                        }
                    },
                    dailyRevenue: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    totalItemsSold: { $sum: '$dailyItemsSold' },
                    totalDiscount: { $sum: '$dailyItemDiscount' },
                    totalCouponDiscount: { $sum: '$_id.couponDiscount' },
                    totalRevenue: { $sum: '$dailyRevenue' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const totalEntries = dailyAgg.length;
        const totalPages = Math.ceil(totalEntries / limit) || 1;
        const currentPage = Math.max(1, Math.min(Number(page), totalPages));
        const skip = (currentPage - 1) * limit;

        const paginatedRecords = dailyAgg.slice(skip, skip + limit).map((row, index) => ({
            sl: skip + index + 1,
            rawDate: row._id,
            date: new Date(row._id).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }),
            orders: row.totalItemsSold,
            totalDiscount: row.totalDiscount,
            couponDiscount: row.totalCouponDiscount,
            revenue: row.totalRevenue
        }));

        return {
            summary,
            records: paginatedRecords,
            totalEntries,
            totalPages,
            currentPage,
            filter,
            fromDate: fromDate || '',
            toDate: toDate || ''
        };
    } catch (error) {
        throw new Error(`Failed to retrieve sales report: ${error.message}`);
    }
};

export const getAllFilteredRecords = async ({ filter, fromDate, toDate }) => {
    try {
        const { start, end } = getDateRange(filter, fromDate, toDate);

        const dailyAgg = await Order.aggregate([
            { 
                $match: { 
                    status: ORDER_STATUS.SUCCESS,
                    createdAt: { $gte: start, $lte: end } 
                } 
            },
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': 'none'
                }
            },
            {
                $group: {
                    _id: {
                        orderId: '$_id',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        couponDiscount: '$couponDiscount'
                    },
                    itemsCount: { $sum: '$orderItems.quantity' },
                    discountAmount: {
                        $sum: {
                            $multiply: [
                                { $subtract: ['$orderItems.originalPrice', '$orderItems.currentPrice'] },
                                '$orderItems.quantity'
                            ]
                        }
                    },
                    revenueAmount: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    totalItemsSold: { $sum: '$itemsCount' },
                    totalDiscount: { $sum: '$discountAmount' },
                    totalCouponDiscount: { $sum: '$_id.couponDiscount' },
                    totalRevenue: { $sum: '$revenueAmount' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        return dailyAgg.map((row, index) => ({
            sl: index + 1,
            date: new Date(row._id).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }),
            orders: row.totalItemsSold,
            totalDiscount: row.totalDiscount,
            couponDiscount: row.totalCouponDiscount,
            revenue: row.totalRevenue
        }));
    } catch (error) {
        throw new Error(`Failed to generate export sales records: ${error.message}`);
    }
};

export const generatePdfReport = async (records, filterText) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            doc.fontSize(22).fillColor('#1a1a1a').text('HomeStation - Sales Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('#666666').text(`Filter Period: ${filterText} | Generated On: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
            doc.moveDown(1.5);

            const startX = 40;
            let currentY = doc.y;
            doc.rect(startX, currentY, 515, 24).fill('#f4f4f5');
            doc.fillColor('#1a1a1a').fontSize(9).font('Helvetica-Bold');

            doc.text('SL', startX + 10, currentY + 7);
            doc.text('Date', startX + 45, currentY + 7);
            doc.text('Items Sold', startX + 135, currentY + 7);
            doc.text('Product Disc (Rs)', startX + 225, currentY + 7);
            doc.text('Coupon Disc (Rs)', startX + 335, currentY + 7);
            doc.text('Total Revenue (Rs)', startX + 430, currentY + 7);

            currentY += 28;
            doc.font('Helvetica').fontSize(9);

            records.forEach((row, idx) => {
                if (currentY > 740) {
                    doc.addPage();
                    currentY = 40;
                }

                if (idx % 2 === 1) {
                    doc.rect(startX, currentY - 4, 515, 20).fill('#fafafa');
                }

                doc.fillColor('#222222');
                doc.text(String(row.sl), startX + 10, currentY);
                doc.text(row.date, startX + 45, currentY);
                doc.text(String(row.orders), startX + 135, currentY);

                doc.fillColor('#d93025');
                doc.text(`-${row.totalDiscount.toLocaleString('en-IN')}`, startX + 225, currentY);
                doc.text(`-${row.couponDiscount.toLocaleString('en-IN')}`, startX + 335, currentY);

                doc.fillColor('#1e8e3e');
                doc.text(`${row.revenue.toLocaleString('en-IN')}`, startX + 430, currentY);

                currentY += 20;
            });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

export const generateExcelReport = async (records, filterText) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'SL No', key: 'sl', width: 10 },
            { header: 'Date', key: 'date', width: 18 },
            { header: 'Total Items Sold', key: 'orders', width: 18 },
            { header: 'Product Discount (INR)', key: 'totalDiscount', width: 24 },
            { header: 'Coupon Discount (INR)', key: 'couponDiscount', width: 24 },
            { header: 'Total Revenue (INR)', key: 'revenue', width: 22 }
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1A1A1A' }
        };

        records.forEach((row) => {
            worksheet.addRow({
                sl: row.sl,
                date: row.date,
                orders: row.orders,
                totalDiscount: -row.totalDiscount,
                couponDiscount: -row.couponDiscount,
                revenue: row.revenue
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    } catch (err) {
        throw new Error(`Excel generation failure: ${err.message}`);
    }
};