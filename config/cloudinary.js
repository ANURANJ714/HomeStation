import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const userStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homestation/users', 
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }] 
    }
});

const categoryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homestation/categories', 
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 600, height: 400, crop: 'fill' }] 
    }
});

const productStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'homestation/products', 
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }] 
    }
});


export const upload = multer({ storage: userStorage });
export const uploadCategory = multer({ storage: categoryStorage });
export const uploadProduct = multer({ storage: productStorage });