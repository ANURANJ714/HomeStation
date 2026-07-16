import Product from '../../models/Products.js'; 
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';
import EnquirySubject from '../../models/EnquirySubject.js';
import EnquiryMessage from '../../models/EnquiryMessage.js';


export const getHomePageData = async () => {
    try {
        const categories = await Category.find({ isDeleted: false });

        const bestSellers = await Product.aggregate([
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
                            cond: { $gt: ['$$v.stock', 0] }
                        }
                    }
                }
            },
            { $match: { $expr: { $gt: [{ $size: '$inStockVariants' }, 0] } } },
            { $sample: { size: 4 } },
            {
                $addFields: {
                    firstVariant: { $arrayElemAt: ['$inStockVariants', 0] }
                }
            }
        ]);

        const topDeals = await ProductVariant.aggregate([
            { $match: { stock: { $gt: 0 } } },
            { $sort: { discount: -1 } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.isDeleted': false } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $match: { 'category.isDeleted': false } },
            {
                $group: {
                    _id: '$productId',
                    variant: { $first: '$$ROOT' },
                    product: { $first: '$product' }
                }
            },
            { $sort: { 'variant.discount': -1 } },
            { $limit: 4 },
            {
                $project: {
                    _id: 0,
                    product: 1,
                    variant: '$variant'
                }
            }
        ]);

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