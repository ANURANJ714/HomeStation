import Banner from '../../models/Banner.js';

export const getActiveBanner = async () => {
    try {
        return await Banner.findOne({});
    } catch (error) {
        throw new Error(`Failed to fetch the active banner: ${error.message}`);
    }
};

export const updateBannerText = async (text) => {
    try {
        return await Banner.findOneAndUpdate(
            {}, 
            { bannerText: text }, 
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
    } catch (error) {
        throw new Error(`Failed to update the banner text: ${error.message}`);
    }
};