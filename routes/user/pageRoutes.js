import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(noCache);

router.get('/home', (req,res)=>{
    res.render('user/home', {user: req.user || null});
});

export default router;