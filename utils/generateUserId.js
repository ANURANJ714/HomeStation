import User from '../models/User.js';

export const generateNextUserId = async () => {
    const lastUser = await User.findOne().sort({ createdAt: -1 });
    let nextIdNum = 1;
    
    if (lastUser && lastUser.userId && lastUser.userId.startsWith('USR-')) {
        const lastNum = parseInt(lastUser.userId.split('-')[1], 10);
        if (!isNaN(lastNum)) {
            nextIdNum = lastNum + 1;
        }
    }

    return `USR-${String(nextIdNum).padStart(4, '0')}`;
};