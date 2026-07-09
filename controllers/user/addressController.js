import Address from '../../models/Address.js';
import * as addressService from '../../services/user/addressService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import logger from '../../utils/logger.js';

export const getAddresses = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 6; 

        const [addressData, bannerText] = await Promise.all([
            addressService.getUserAddressesPaginated(userId, page, limit),
            getActivePromoBanner()
        ]);

        logger.info(`User (${userEmail}) accessed addresses page (Page: ${page}). IP: ${clientIp}`);

        res.render('user/addresses', { 
            user: req.user, 
            addresses: addressData.addresses,
            currentPage: addressData.currentPage,
            totalPages: addressData.totalPages,
            bannerText: bannerText
        });

    } catch (error) {
        logger.error(`Error loading addresses page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading your addresses."
        });
    }
};

export const addAddress = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';

        const { addressType, name, phone, fullAddress, city, state, pincode } = req.body;
        
        const isDefault = req.body.isDefault === true || req.body.isDefault === 'true';

        const addressData = {
            addressType,
            name,
            phone,
            fullAddress,
            city,
            state,
            pincode,
            isDefault
        };

        const newAddress = await addressService.createUserAddress(userId, addressData);

        logger.info(`User (${userEmail}) successfully added a new address. IP: ${clientIp}`);

        return res.status(201).json({ 
            success: true, 
            message: "Address added successfully!",
            address: newAddress
        });

    } catch (error) {
        logger.error(`Add Address Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Failed to add address." 
        });
    }
};

export const editAddress = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const { address_id } = req.params;

        const { addressType, name, phone, fullAddress, city, state, pincode } = req.body;
        
        const isDefault = req.body.isDefault === true || req.body.isDefault === 'true';

        const addressData = {
            addressType,
            name,
            phone,
            fullAddress,
            city,
            state,
            pincode,
            isDefault
        };

        const result = await addressService.updateUserAddress(userId, address_id, addressData);

        if (!result.isFound) {
            logger.warn(`Edit Address blocked: Address not found or unauthorized for ${userEmail}. IP: ${clientIp}`);
            return res.status(404).json({ 
                success: false, 
                message: "Address not found." 
            });
        }

        logger.info(`User (${userEmail}) successfully updated address ID ${address_id}. IP: ${clientIp}`);

        return res.status(200).json({ 
            success: true, 
            message: "Address updated successfully!",
            address: result.address
        });

    } catch (error) {
        logger.error(`Edit Address Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Failed to update address." 
        });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const { address_id } = req.params;

        const result = await addressService.removeUserAddress(userId, address_id);

        if (!result.isDeleted) {
            logger.warn(`Delete Address blocked: Address not found or unauthorized for ${userEmail}. IP: ${clientIp}`);
            return res.status(404).json({ 
                success: false, 
                message: "Address not found." 
            });
        }

        logger.info(`User (${userEmail}) successfully deleted address ID ${address_id}. IP: ${clientIp}`);

        return res.status(200).json({ 
            success: true, 
            message: "Address deleted successfully!" 
        });

    } catch (error) {
        logger.error(`Delete Address Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Failed to delete address." 
        });
    }
};