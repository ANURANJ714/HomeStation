import fetch from 'node-fetch';

export const validateAddressWithGoogle = async ({ fullAddress, city, state, pincode }) => {
    try {
        const cleanPincode = pincode ? pincode.toString().trim() : '';

        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(cleanPincode)) {
            return {
                isValid: false,
                message: `Pincode ${cleanPincode} is not a valid 6-digit Indian postal code.`
            };
        }

        try {
            const postalResponse = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`);
            const postalData = await postalResponse.json();

            if (
                !Array.isArray(postalData) || 
                postalData[0].Status !== "Success" || 
                !postalData[0].PostOffice || 
                postalData[0].PostOffice.length === 0
            ) {
                return {
                    isValid: false,
                    message: `Pincode ${cleanPincode} does not exist in the official postal directory.`
                };
            }
        } catch (postalErr) {
            console.warn(`India Postal API fallback trigger: ${postalErr.message}`);
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (apiKey) {
            const fullSearchAddress = `${fullAddress}, ${city}, ${state}, ${cleanPincode}, India`;
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullSearchAddress)}&key=${apiKey}`;

            const addressResponse = await fetch(geocodeUrl);
            const addressData = await addressResponse.json();

            if (addressData.status === "ZERO_RESULTS") {
                return { 
                    isValid: false, 
                    message: "Could not locate the provided address. Please verify your address details." 
                };
            }
        }

        return { isValid: true };

    } catch (error) {
        console.error(`Address Validator Exception: ${error.message}`);
        return { isValid: true };
    }
};