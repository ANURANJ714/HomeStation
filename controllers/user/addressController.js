import Address from '../../models/Address.js';

export const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
        res.render('user/addresses', { user: req.user, addresses });
    } catch (error) {
        console.error("Get Addresses Error:", error);
        res.status(500).send('Server Error');
    }
};

export const addAddress = async (req, res) => {
    try {
        const { addressType, name, phone, fullAddress, city, state, pincode } = req.body;
        let { isDefault } = req.body;

        const addressCount = await Address.countDocuments({ userId: req.user._id });
        if (addressCount === 0) {
            isDefault = true; 
        }

        if (isDefault) {
            await Address.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
        }

        const newAddress = new Address({
            userId: req.user._id,
            addressType, 
            name: name.trim(), 
            phone, 
            fullAddress: fullAddress.trim(), 
            city: city.trim(), 
            state: state.trim(), 
            pincode, 
            isDefault
        });

        await newAddress.save();
        res.status(201).json({ success: true, message: "Address added successfully!" });
    } catch (error) {
        console.error("Add Address Error:", error);
        res.status(500).json({ success: false, message: "Failed to add address." });
    }
};

export const editAddress = async (req, res) => {
    try {
        const { address_id } = req.params;
        const { addressType, name, phone, fullAddress, city, state, pincode, isDefault } = req.body;

        const address = await Address.findOne({ _id: address_id, userId: req.user._id });
        if (!address) return res.status(404).json({ success: false, message: "Address not found." });

        if (isDefault) {
            await Address.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
        }

        await Address.findByIdAndUpdate(address_id, {
            addressType, 
            name: name.trim(), 
            phone, 
            fullAddress: fullAddress.trim(), 
            city: city.trim(), 
            state: state.trim(), 
            pincode, 
            isDefault
        });

        res.status(200).json({ success: true, message: "Address updated successfully!" });
    } catch (error) {
        console.error("Edit Address Error:", error);
        res.status(500).json({ success: false, message: "Failed to update address." });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { address_id } = req.params;

        const address = await Address.findOneAndDelete({ _id: address_id, userId: req.user._id });
        if (!address) return res.status(404).json({ success: false, message: "Address not found." });

        if (address.isDefault) {
            const nextAddress = await Address.findOne({ userId: req.user._id });
            if (nextAddress) {
                nextAddress.isDefault = true;
                await nextAddress.save();
            }
        }

        res.status(200).json({ success: true, message: "Address deleted successfully!" });
    } catch (error) {
        console.error("Delete Address Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete address." });
    }
};