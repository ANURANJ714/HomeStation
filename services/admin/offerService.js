import Offer from '../../models/Offer.js';
import Product from '../../models/Products.js'
import Category from '../../models/Category.js';

export const getOffersPaginated = async ({ page = 1, limit = 6, search = '', type = 'all', status = 'all' }) => {
    try {
        const query = { isDeleted: false };

        if (status && status !== 'all') {
            query.status = status.toLowerCase();
        }

        if (type && type !== 'all') {
            query.offerType = type.toLowerCase();
        }

        if (search && search.trim() !== '') {
            const regex = new RegExp(search.trim(), 'i');
            query.name = regex;
        }

        const skip = (page - 1) * limit;

        const [
            offers, 
            totalItems, 
            totalOffers, 
            activeOffers, 
            inactiveOffers, 
            productOffers,
            categoryOffers
        ] = await Promise.all([
            Offer.find(query)
                .populate('targetId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Offer.countDocuments(query),
            Offer.countDocuments({ isDeleted: false }),
            Offer.countDocuments({ isDeleted: false, status: 'active' }),
            Offer.countDocuments({ isDeleted: false, status: 'inactive' }),
            Offer.countDocuments({ isDeleted: false, offerType: 'product' }),
            Offer.countDocuments({ isDeleted: false, offerType: 'category' })
        ]);

        const formattedOffers = offers.map((offer) => {
            let targetDisplayName = 'N/A';
            let targetIdentifier = '';

            if (offer.offerType === 'product' && offer.targetId) {
                targetDisplayName = `${offer.targetId.name} (${offer.targetId.productId})`;
                targetIdentifier = offer.targetId.productId;
            } else if (offer.offerType === 'category' && offer.targetId) {
                targetDisplayName = offer.targetId.name;
                targetIdentifier = offer.targetId.name;
            }

            return {
                ...offer,
                targetDisplayName,
                targetIdentifier
            };
        });

        const totalPages = Math.ceil(totalItems / limit) || 1;

        return {
            offers: formattedOffers,
            totalItems,
            totalPages,
            currentPage: page,
            stats: {
                totalOffers,
                activeOffers,
                inactiveOffers,
                productOffers,
                categoryOffers
            }
        };
    } catch (error) {
        throw new Error(`Service error fetching offers: ${error.message}`);
    }
};

export const createNewOffer = async (payload) => {
    try {
        const { name, offerType, discount, target, startDate, endDate, status } = payload;

        const cleanName = name ? name.trim().toUpperCase() : '';
        const cleanType = offerType ? offerType.trim().toLowerCase() : '';
        const numDiscount = Number(discount);
        const cleanTarget = target ? target.trim() : '';

        if (!cleanName) {
            const err = new Error('Offer name is required.');
            err.statusCode = 400;
            throw err;
        }

        const existingOffer = await Offer.findOne({
            name : { $regex : new RegExp(`^${cleanName}$`, 'i') }
        });

        if(existingOffer){
            const err = new Error('Offer name already exists.');
            err.statusCode = 409;
            throw err;
        }

        if (!['product', 'category'].includes(cleanType)) {
            const err = new Error('Offer type must be product or category.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 90) {
            const err = new Error('Discount must be between 1% and 90%.');
            err.statusCode = 400;
            throw err;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            const err = new Error('Valid start and end dates are required.');
            err.statusCode = 400;
            throw err;
        }

        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);

        if (startDay < today) {
            const err = new Error('Start date cannot be in the past.');
            err.statusCode = 400;
            throw err;
        }

        if (end <= start) {
            const err = new Error('End date must be greater than start date.');
            err.statusCode = 400;
            throw err;
        }

        let targetId = null;
        let targetModel = '';

        if (cleanType === 'product') {
            const product = await Product.findOne({ productId: cleanTarget, isDeleted: false });
            if (!product) {
                const err = new Error(`Product with ID "${cleanTarget}" was not found.`);
                err.statusCode = 404;
                throw err;
            }
            targetId = product._id;
            targetModel = 'Product';
        } else {
            const category = await Category.findOne({ 
                name: new RegExp(`^${cleanTarget}$`, 'i'), 
                isDeleted: false 
            });
            if (!category) {
                const err = new Error(`Category "${cleanTarget}" was not found.`);
                err.statusCode = 404;
                throw err;
            }
            targetId = category._id;
            targetModel = 'Category';
        }

        const newOffer = new Offer({
            name: cleanName,
            offerType: cleanType,
            discount: numDiscount,
            targetId,
            targetModel,
            startDate: start,
            endDate: end,
            status: status ? status.toLowerCase() : 'active'
        });

        await newOffer.save();
        return newOffer;
    } catch (error) {
        throw error;
    }
};

export const updateOfferDetails = async (offerId, payload) => {
    try {
        const offer = await Offer.findOne({ _id: offerId, isDeleted: false });
        if (!offer) {
            const err = new Error('Offer not found.');
            err.statusCode = 404;
            throw err;
        }

        const { name, offerType, discount, target, startDate, endDate, status } = payload;
        const cleanName = name ? name.trim().toUpperCase() : '';
        const cleanType = offerType ? offerType.trim().toLowerCase() : '';
        const numDiscount = Number(discount);
        const cleanTarget = target ? target.trim() : '';

        if (!cleanName) {
            const err = new Error('Offer name is required.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numDiscount) || numDiscount < 1 || numDiscount > 90) {
            const err = new Error('Discount must be between 1% and 90%.');
            err.statusCode = 400;
            throw err;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            const err = new Error('Valid start and end dates are required.');
            err.statusCode = 400;
            throw err;
        }

        if (end <= start) {
            const err = new Error('End date must be greater than start date.');
            err.statusCode = 400;
            throw err;
        }

        let targetId = null;
        let targetModel = '';

        if (cleanType === 'product') {
            const product = await Product.findOne({ productId: cleanTarget, isDeleted: false });
            if (!product) {
                const err = new Error(`Product with ID "${cleanTarget}" was not found.`);
                err.statusCode = 404;
                throw err;
            }
            targetId = product._id;
            targetModel = 'Product';
        } else {
            const category = await Category.findOne({ 
                name: new RegExp(`^${cleanTarget}$`, 'i'), 
                isDeleted: false 
            });
            if (!category) {
                const err = new Error(`Category "${cleanTarget}" was not found.`);
                err.statusCode = 404;
                throw err;
            }
            targetId = category._id;
            targetModel = 'Category';
        }

        offer.name = cleanName;
        offer.offerType = cleanType;
        offer.discount = numDiscount;
        offer.targetId = targetId;
        offer.targetModel = targetModel;
        offer.startDate = start;
        offer.endDate = end;
        if (status) offer.status = status.toLowerCase();

        await offer.save();
        return offer;
    } catch (error) {
        throw error;
    }
};

export const toggleOfferStatus = async (offerId) => {
    try {
        const offer = await Offer.findOne({ _id: offerId, isDeleted: false });
        if (!offer) {
            const err = new Error('Offer not found.');
            err.statusCode = 404;
            throw err;
        }

        offer.status = offer.status === 'active' ? 'inactive' : 'active';
        await offer.save();

        return {
            status: offer.status,
            name: offer.name
        };
    } catch (error) {
        throw error;
    }
};