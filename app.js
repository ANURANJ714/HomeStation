import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';

import { connectDB } from './config/db.js';
import configurePassport from './config/passport.js';
import { noCache } from './middlewares/cache.js';
import MongoStore from 'connect-mongo';

import userRoutes from './routes/user/authRoutes.js';
import profileRoutes from './routes/user/profileRoutes.js';
import pageRoutes from './routes/user/pageRoutes.js';

configurePassport(passport);
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI
    }),
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(noCache);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', userRoutes);
app.use('/user', profileRoutes);
app.use('/', pageRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});