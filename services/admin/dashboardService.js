import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Category from '../../models/Category.js';
import Product from '../../models/Products.js';

const calculateRevenueChartData = async (filter = 'monthly') => {
    try {
        const now = new Date();
        let startDate = new Date();
        let groupByFormat = {};
        let labelGenerator = [];

        if (filter === 'daily') {
            startDate.setDate(now.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);

            groupByFormat = {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            };

            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const key = d.toISOString().split('T')[0];
                const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                labelGenerator.push({ key, label });
            }
        } else if (filter === 'yearly') {
            const currentYear = now.getFullYear();
            startDate = new Date(currentYear - 4, 0, 1);

            groupByFormat = {
                $dateToString: { format: '%Y', date: '$createdAt' }
            };

            for (let y = currentYear - 4; y <= currentYear; y++) {
                const key = y.toString();
                labelGenerator.push({ key, label: key });
            }
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

            groupByFormat = {
                $dateToString: { format: '%Y-%m', date: '$createdAt' }
            };

            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const key = `${year}-${month}`;
                const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                labelGenerator.push({ key, label });
            }
        }

        const revenueAgg = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $match: {
                    createdAt: { $gte: startDate },
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': { $ne: 'item reached' }
                }
            },
            {
                $group: {
                    _id: groupByFormat,
                    revenue: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    }
                }
            }
        ]);

        const revenueMap = {};
        revenueAgg.forEach((item) => {
            if (item._id) {
                revenueMap[item._id] = item.revenue;
            }
        });

        const labels = [];
        const data = [];

        labelGenerator.forEach((entry) => {
            labels.push(entry.label);
            data.push(revenueMap[entry.key] || 0);
        });

        return { labels, data };
    } catch (error) {
        throw new Error(`Failed to calculate revenue chart data for ${filter}: ${error.message}`);
    }
};

export const getDashboardAnalytics = async () => {
    try {
        const lifetimeUsers = await User.countDocuments({ role: { $ne: 'Admin' } });

        const lifetimeAggregation = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': { $ne: 'item reached' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    },
                    totalItemsSold: { $sum: '$orderItems.quantity' }
                }
            }
        ]);

        const lifetimeStats = lifetimeAggregation[0] || { totalRevenue: 0, totalItemsSold: 0 };

        const [allCategories, categorySalesAgg] = await Promise.all([
            Category.find({ isDeleted: false }).select('_id name').lean(),
            Order.aggregate([
                { $unwind: '$orderItems' },
                {
                    $match: {
                        'orderItems.itemStatus': { $ne: 'cancelled' },
                        'orderItems.returnStatus': { $ne: 'item reached' }
                    }
                },
                {
                    $lookup: {
                        from: 'productvariants',
                        localField: 'orderItems.productVariantId',
                        foreignField: '_id',
                        as: 'variant'
                    }
                },
                { $unwind: '$variant' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'variant.productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $group: {
                        _id: '$product.categoryId',
                        totalSalesAmount: {
                            $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                        }
                    }
                }
            ])
        ]);

        const catSalesMap = {};
        let totalCategorySales = 0;

        categorySalesAgg.forEach((item) => {
            if (item._id) {
                const idStr = item._id.toString();
                catSalesMap[idStr] = item.totalSalesAmount;
                totalCategorySales += item.totalSalesAmount;
            }
        });

        const colorClasses = ['progress-green', 'progress-blue', 'progress-orange', 'progress-purple', 'progress-gray'];

        const categoryPerformance = allCategories.map((cat, index) => {
            const catIdStr = cat._id.toString();
            const salesAmount = catSalesMap[catIdStr] || 0;
            const percentage = totalCategorySales > 0 ? Math.round((salesAmount / totalCategorySales) * 100) : 0;

            return {
                id: catIdStr,
                name: cat.name,
                salesAmount,
                percentage,
                colorClass: colorClasses[index % colorClasses.length]
            };
        });

        categoryPerformance.sort((a, b) => b.salesAmount - a.salesAmount);

        const topProductsAgg = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': { $ne: 'item reached' }
                }
            },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: 'orderItems.productVariantId',
                    foreignField: '_id',
                    as: 'variant'
                }
            },
            { $unwind: '$variant' },
            {
                $group: {
                    _id: '$variant.productId',
                    totalSold: { $sum: '$orderItems.quantity' },
                    totalRevenue: {
                        $sum: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    productCustomId: '$product.productId',
                    name: '$product.name',
                    categoryName: { $ifNull: ['$category.name', 'General'] },
                    totalSold: 1,
                    totalRevenue: 1
                }
            }
        ]);

        const topProducts = topProductsAgg.map((item) => ({
            productId: item.productCustomId || item._id.toString(),
            name: item.name,
            categoryName: item.categoryName,
            totalSold: item.totalSold,
            totalRevenue: item.totalRevenue
        }));

        const distinctBrands = await Product.distinct('brand', { isDeleted: false });
        const validBrands = distinctBrands.filter((b) => b && b.trim() !== '');

        const brandSalesAgg = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': { $ne: 'item reached' }
                }
            },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: 'orderItems.productVariantId',
                    foreignField: '_id',
                    as: 'variant'
                }
            },
            { $unwind: '$variant' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'variant.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.brand',
                    totalSalesAmount: {
                        $sum: {$multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                    }
                }
            }
        ]);

        const brandSalesMap = {};
        let totalBrandSales = 0;

        brandSalesAgg.forEach((item) => {
            if (item._id) {
                brandSalesMap[item._id] = item.totalSalesAmount;
                totalBrandSales += item.totalSalesAmount;
            }
        });

        const brandPerformance = validBrands.map((brandName, index) => {
            const salesAmount = brandSalesMap[brandName] || 0;
            const percentage = totalBrandSales > 0 ? Math.round((salesAmount / totalBrandSales) * 100) : 0;

            return {
                name: brandName,
                salesAmount,
                percentage,
                colorClass: colorClasses[index % colorClasses.length]
            };
        });

        brandPerformance.sort((a, b) => b.salesAmount - a.salesAmount);

        const [monthlyChart, dailyChart, yearlyChart] = await Promise.all([
            calculateRevenueChartData('monthly'),
            calculateRevenueChartData('daily'),
            calculateRevenueChartData('yearly')
        ]);

        return {
            lifetime: {
                totalRevenue: lifetimeStats.totalRevenue,
                totalItemsSold: lifetimeStats.totalItemsSold,
                totalUsers: lifetimeUsers
            },
            categoryPerformance,
            topProducts,
            brandPerformance,
            chartDataCollection: {
                monthly: monthlyChart,
                daily: dailyChart,
                yearly: yearlyChart
            }
        };
    } catch (error) {
        throw new Error(`Failed to load dashboard analytics: ${error.message}`);
    }
};