import Product from '../../models/Products.js'; 
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';
import EnquirySubject from '../../models/EnquirySubject.js';
import EnquiryMessage from '../../models/EnquiryMessage.js';
import Offer from '../../models/Offer.js';

export const getHomePageData = async () => {
    try {
        const currentDate = new Date();

        const categories = await Category.find({ isDeleted: false }).lean();

        const activeOffers = await Offer.find({
            isDeleted: false,
            status: 'active',
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).lean();

        const productOffersMap = {};
        const categoryOffersMap = {};

        activeOffers.forEach((offer) => {
            const targetIdStr = offer.targetId ? offer.targetId.toString() : null;
            if (!targetIdStr) return;

            if (offer.offerType === 'product') {
                if (!productOffersMap[targetIdStr] || offer.discount > productOffersMap[targetIdStr]) {
                    productOffersMap[targetIdStr] = offer.discount;
                }
            } else if (offer.offerType === 'category') {
                if (!categoryOffersMap[targetIdStr] || offer.discount > categoryOffersMap[targetIdStr]) {
                    categoryOffersMap[targetIdStr] = offer.discount;
                }
            }
        });

        const calculateBestDiscount = (variantDiscount = 0, productId, categoryId) => {
            const pIdStr = productId ? productId.toString() : '';
            const cIdStr = categoryId ? categoryId.toString() : '';

            const productOfferDiscount = productOffersMap[pIdStr] || 0;
            const categoryOfferDiscount = categoryOffersMap[cIdStr] || 0;

            const baseDiscount = Number(variantDiscount) || 0;

            return Math.max(baseDiscount, productOfferDiscount, categoryOfferDiscount);
        };

        const rawBestSellers = await Product.aggregate([
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $match: { 'category.isDeleted': false } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variants'
                }
            },
            {
                $addFields: {
                    inStockVariants: {
                        $filter: {
                            input: '$variants',
                            as: 'v',
                            cond: { $gt: ['$$v.stock', 0] }   }    }   }    },    {$match: { $expr: {$gt: [{ $size: '$inStockVariants' }, 0] } } },
            { $sample: { size: 4 } },             {$addFields: {
                    firstVariant: { $arrayElemAt: ['$inStockVariants', 0] }
                }
            }
        ]);

        const bestSellers = rawBestSellers.map((product) => {
            if (product.firstVariant) {
                const effectiveDiscount = calculateBestDiscount(
                    product.firstVariant.discount,
                    product._id,
                    product.categoryId
                );

                const originalPrice = product.firstVariant.originalPrice;
                const currentPrice = Math.round(originalPrice * (1 - effectiveDiscount / 100));

                product.firstVariant.effectiveDiscount = effectiveDiscount;
                product.firstVariant.calculatedCurrentPrice = currentPrice;
            }
            return product;
        });

        const inStockVariants = await ProductVariant.find({ stock: { $gt: 0 } })
            .populate({
                path: 'productId',
                populate: { path: 'categoryId' }
            })
            .lean();

        const processedVariants = inStockVariants
            .filter(v => v.productId && !v.productId.isDeleted && v.productId.categoryId && !v.productId.categoryId.isDeleted)
            .map(variant => {
                const product = variant.productId;
                const categoryId = product.categoryId._id || product.categoryId;

                const effectiveDiscount = calculateBestDiscount(
                    variant.discount,
                    product._id,
                    categoryId
                );

                const originalPrice = variant.originalPrice;
                const currentPrice = Math.round(originalPrice * (1 - effectiveDiscount / 100));

                return {
                    product,
                    variant: {
                        ...variant,
                        effectiveDiscount,
                        calculatedCurrentPrice: currentPrice
                    }
                };
            });

        const uniqueProductDealsMap = {};
        processedVariants.forEach(item => {
            const pIdStr = item.product._id.toString();
            if (!uniqueProductDealsMap[pIdStr] || item.variant.effectiveDiscount > uniqueProductDealsMap[pIdStr].variant.effectiveDiscount) {
                uniqueProductDealsMap[pIdStr] = item;
            }
        });

        const topDeals = Object.values(uniqueProductDealsMap)
            .sort((a, b) => b.variant.effectiveDiscount - a.variant.effectiveDiscount)
            .slice(0, 4);

        return { categories, bestSellers, topDeals };

    } catch (error) {
        throw new Error(`Database error while fetching home page data: ${error.message}`);
    }
};

export const getFilteredContactSubjects = async (isAuthenticated) => {
    try {
        const queryFilter = { isDeleted: false };
        
        if (!isAuthenticated) {
            queryFilter.needAuth = false;
        }

        return await EnquirySubject.find(queryFilter).sort({ name: 1 }).lean();
    } catch (error) {
        throw new Error(`Service Layer breakdown pulling contact subjects context: ${error.message}`);
    }
};

export const createEnquiryTicket = async (inquiryData) => {
    try {
        const { name, email, subjectId, message } = inquiryData;

        if (!name || !name.trim() || !email || !email.trim() || !subjectId || !message || !message.trim()) {
            return { success: false, status: 400, message: "All input fields are mandatory parameters." };
        }

        const emailRegexCheck = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegexCheck.test(email.trim())) {
            return { success: false, status: 400, message: "Please supply a structurally valid email reference." };
        }

        const targetSubject = await EnquirySubject.findOne({ _id: subjectId, isDeleted: false });
        if (!targetSubject) {
            return { success: false, status: 200, message: "The selected enquiry subject is invalid or has been discontinued." };
        }

        const lastTicket = await EnquiryMessage.findOne({}, { ticketId: 1 })
            .sort({ createdAt: -1 })
            .lean();

        let nextSequenceNumber = 1; 
        if (lastTicket && lastTicket.ticketId) {
            const lastSequence = parseInt(lastTicket.ticketId.replace(/\D/g, ""), 10);
            if (!isNaN(lastSequence)) {
                nextSequenceNumber = lastSequence + 1;
            }
        }

        const paddedSequenceStr = String(nextSequenceNumber).padStart(5, '0');
        const generatedTicketStr = `#TCK-${paddedSequenceStr}`;

        const newEnquiryTicket = new EnquiryMessage({
            ticketId: generatedTicketStr,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subjectId,
            message: message.trim(),
            ticketStatus: 'Ticket Raised'
        });

        await newEnquiryTicket.save();

        return { 
            success: true, 
            status: 200,
            message: `Your inquiry has been successfully raised. Ticket reference: ${generatedTicketStr}` 
        };

    } catch (error) {
        throw new Error(`Enquiry mapping transaction failed inside Service Layer: ${error.message}`);
    }
};