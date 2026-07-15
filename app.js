import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';

import { connectDB } from './config/db.js';
import configurePassport from './config/passport.js';

import { requestLogger } from './middlewares/loggerMiddleware.js';
import helmetMiddleware from "./middlewares/helmetConfig.js";
import mongoSanitizeMiddleware from "./middlewares/mongoSanitizeMiddleware.js";
import { noCache } from './middlewares/cache.js';
import { sessionMiddleware } from './middlewares/session.js';
import { csrfProtection, injectCsrfToken } from './middlewares/csrf.js';

import userRoutes from './routes/user/authRoutes.js';
import profileRoutes from './routes/user/profileRoutes.js';
import pageRoutes from './routes/user/pageRoutes.js';
import addressRoutes from './routes/user/addressRoutes.js';
import pageAuthRoutes from './routes/user/pageAuthRoutes.js';

import adminAuthRoutes from './routes/admin/adminAuthRoutes.js';
import adminCategoryRoutes from './routes/admin/adminCategoryRoutes.js';
import adminProductRoutes from './routes/admin/adminProductRoutes.js';
import adminDashboardRoutes from './routes/admin/adminDashboardRoutes.js';
import enquiryRoutes from './routes/admin/enquiryRoutes.js';

configurePassport(passport);
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); 
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(requestLogger);
app.use(express.static(path.join(__dirname, 'public')));

app.use(helmetMiddleware);
app.use(mongoSanitizeMiddleware);

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use(csrfProtection);
app.use(injectCsrfToken);
app.use(noCache);

app.use('/user', userRoutes);
app.use('/user', profileRoutes);
app.use('/user/addresses', addressRoutes);
app.use('/user', pageAuthRoutes);

app.use('/admin', adminAuthRoutes);
app.use('/admin', adminCategoryRoutes);
app.use('/admin', adminProductRoutes);
app.use('/admin', adminDashboardRoutes);
app.use('/admin', enquiryRoutes);

app.use('/', pageRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});