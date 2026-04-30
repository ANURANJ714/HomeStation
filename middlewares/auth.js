export const ensureAuthenticated = (req,res,next)=>{
    if(req.isAuthenticated()){
        return next();
    }
    return res.redirect('user/login');
};

export const forwardAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/home'); 
    }
    next();
};