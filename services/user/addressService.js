import Address from '../../models/Address.js';

export const getUserAddressesPaginated = async (userId, page = 1, limit = 6) => {
    try {
        const skip = (page - 1) * limit;

        const [addresses, totalAddresses] = await Promise.all([
            Address.find({ userId: userId })
                .sort({ isDefault: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Address.countDocuments({ userId: userId })
        ]);

        const totalPages = Math.ceil(totalAddresses / limit) || 1;

        return {
            addresses,
            currentPage: page,
            totalPages,
            totalAddresses
        };

    } catch (error) {
        throw new Error(`Database error while fetching paginated addresses: ${error.message}`);
    }
};

export const createUserAddress = async (userId, addressData) => {
    try {
        let { addressType, name, phone, fullAddress, city, state, pincode, isDefault } = addressData;

        const addressCount = await Address.countDocuments({ userId: userId });
        if (addressCount === 0) {
            isDefault = true; 
        }

        if (isDefault) {
            await Address.updateMany(
                { userId: userId }, 
                { $set: { isDefault: false } }
            );
        }

        const newAddress = new Address({
            userId: userId,
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
        return newAddress;

    } catch (error) {
        throw new Error(`Database error while adding user address: ${error.message}`);
    }
};

export const updateUserAddress = async (userId, addressId, addressData) => {
    try {
        let { addressType, name, phone, fullAddress, city, state, pincode, isDefault } = addressData;

        const existingAddress = await Address.findOne({ _id: addressId, userId: userId });
        if (!existingAddress) {
            return { isFound: false };
        }

        if (isDefault) {
            await Address.updateMany(
                { userId: userId }, 
                { $set: { isDefault: false } }
            );
        }

        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            {
                addressType, 
                name: name.trim(), 
                phone, 
                fullAddress: fullAddress.trim(), 
                city: city.trim(), 
                state: state.trim(), 
                pincode, 
                isDefault
            },
            { returnDocument: 'after', runValidators: true }
        );

        return { isFound: true, address: updatedAddress };

    } catch (error) {
        throw new Error(`Database error while updating user address: ${error.message}`);
    }
};

export const removeUserAddress = async (userId, addressId) => {
    try {
        const deletedAddress = await Address.findOneAndDelete({ _id: addressId, userId: userId });
        
        if (!deletedAddress) {
            return { isDeleted: false };
        }

        if (deletedAddress.isDefault) {
            const nextAddress = await Address.findOne({ userId: userId });
            
            if (nextAddress) {
                nextAddress.isDefault = true;
                await nextAddress.save();
            }
        }

        return { isDeleted: true };

    } catch (error) {
        throw new Error(`Database error while deleting user address: ${error.message}`);
    }
};