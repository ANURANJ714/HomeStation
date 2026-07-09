import Banner from '../../models/Banner.js';

export const getActivePromoBanner = async () => {
    try {
        const banner = await Banner.findOne(); 

        if (!banner || !banner.bannerText || banner.bannerText.trim() === "") {
            return null;
        }

        return banner.bannerText;

    } catch (error) {
        throw new Error(`Database error while fetching promo banner: ${error.message}`);
    }
};