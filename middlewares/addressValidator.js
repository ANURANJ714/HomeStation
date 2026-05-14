export const validateAddressData = (req, res, next) => {
    const { name, phone, pincode, city, state, fullAddress, addressType } = req.body;
    
    if (!name || name.trim() === '') return res.status(400).json({ success: false, message: "Full Name is required." });
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone || !phoneRegex.test(phone)) return res.status(400).json({ success: false, message: "A valid 10-digit phone number is required." });
    
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincode || !pincodeRegex.test(pincode)) return res.status(400).json({ success: false, message: "A valid 6-digit pincode is required." });
    
    if (!city || city.trim() === '') return res.status(400).json({ success: false, message: "City is required." });
    if (!state || state.trim() === '') return res.status(400).json({ success: false, message: "State is required." });
    if (!fullAddress || fullAddress.trim() === '') return res.status(400).json({ success: false, message: "Full address is required." });
    
    const validTypes = ['Home', 'Work', 'Other'];
    if (!addressType || !validTypes.includes(addressType)) return res.status(400).json({ success: false, message: "Invalid address type." });

    next(); 
};