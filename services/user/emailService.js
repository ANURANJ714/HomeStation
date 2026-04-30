import nodemailer from 'nodemailer';

export const sendOtpEmail = async (userEmail, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: 'HomeStation - Your OTP Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to HomeStation!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 40px; letter-spacing: 5px; color: #222;">${otp}</h1>
                    <p>This code will expire in 1 minute.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${userEmail}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Could not send email");
    }
};