import crypto from 'crypto';
import User from '../models/User.js';

export const generateUniqueReferralCode = async () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '@#$&*';
    const allCharacters = uppercase + lowercase + numbers + specials;

    let isUnique = false;
    let generatedCode = '';

    while (!isUnique) {
        const guaranteed = [
            uppercase[crypto.randomInt(0, uppercase.length)],
            lowercase[crypto.randomInt(0, lowercase.length)],
            numbers[crypto.randomInt(0, numbers.length)],
            specials[crypto.randomInt(0, specials.length)]
        ];

        for (let i = 0; i < 6; i++) {
            guaranteed.push(allCharacters[crypto.randomInt(0, allCharacters.length)]);
        }

        for (let i = guaranteed.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
        }

        generatedCode = guaranteed.join('');

        const existingUser = await User.findOne({ referralCode: generatedCode }).lean();
        if (!existingUser) {
            isUnique = true;
        }
    }

    return generatedCode;
};