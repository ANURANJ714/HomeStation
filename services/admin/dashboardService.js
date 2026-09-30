import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Category from '../../models/Category.js';

export const getDashboardAnalytics = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [lifetimeUsers, recentUsers] = await Promise.all([
            User.countDocuments({ role: { $ne: 'Admin' } }),
            User.countDocuments({ role: { $ne: 'Admin' }, createdAt: {$gte: thirtyDaysAgo } })
        ]);

        const metricsAggregation = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $match: {
                    'orderItems.itemStatus': { $ne: 'cancelled' },
                    'orderItems.returnStatus': { $ne: 'item reached' }
                }
            },
            {
                $project: {
                    createdAt: 1,
                    quantity: '$orderItems.quantity',
                    itemTotal: { $multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                }
            },
            {
                $facet: {
                    lifetime: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: '$itemTotal' },
                                totalItemsSold: { $sum: '$quantity' }
                            }
                        }
                    ],
                    recent30Days: [
                        { $match: { createdAt: {$gte: thirtyDaysAgo } } },
                        {
                            $group: {
                                _id: null,
                                revenue: { $sum: '$itemTotal' },
                                itemsSold: { $sum: '$quantity' }
                            }
                        }
                    ]
                }
            }
        ]);

        const lifetimeStats = metricsAggregation[0]?.lifetime[0] || { totalRevenue: 0, totalItemsSold: 0 };
        const recentStats = metricsAggregation[0]?.recent30Days[0] || { revenue: 0, itemsSold: 0 };

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
                            $sum: {$multiply: ['$orderItems.currentPrice', '$orderItems.quantity'] }
                        }
                    }
                }
            ])
        ]);

        const salesMap = {};
        let totalSalesAcrossCategories = 0;

        categorySalesAgg.forEach(item => {
            if (item._id) {
                const catIdStr = item._id.toString();
                salesMap[catIdStr] = item.totalSalesAmount;
                totalSalesAcrossCategories += item.totalSalesAmount;
            }
        });

        const colorClasses = ['progress-green', 'progress-blue', 'progress-orange', 'progress-purple', 'progress-gray'];

        const categoryPerformance = allCategories.map((cat, index) => {
            const catIdStr = cat._id.toString();
            const salesAmount = salesMap[catIdStr] || 0;
            const percentage = totalSalesAcrossCategories > 0 
                ? Math.round((salesAmount / totalSalesAcrossCategories) * 100) 
                : 0;

            return {
                id: catIdStr,
                name: cat.name,
                salesAmount,
                percentage,
                colorClass: colorClasses[index % colorClasses.length]
            };
        });

        categoryPerformance.sort((a, b) => b.salesAmount - a.salesAmount);

        return {
            lifetime: {
                totalRevenue: lifetimeStats.totalRevenue,
                totalItemsSold: lifetimeStats.totalItemsSold,
                totalUsers: lifetimeUsers
            },
            recent: {
                revenue: recentStats.revenue,
                itemsSold: recentStats.itemsSold,
                newUsers: recentUsers
            },
            categoryPerformance
        };
    } catch (error) {
        throw new Error(`Failed to load dashboard analytics: ${error.message}`);
    }
};