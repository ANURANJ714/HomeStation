import helmet from "helmet";

const helmetMiddleware = helmet({

    contentSecurityPolicy: {

        directives: {

            defaultSrc: ["'self'"],

            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net"
            ],

            styleSrc: [
                "'self'",
                "'unsafe-inline'", 
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],

            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],

            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://res.cloudinary.com",
                "https://images.unsplash.com",
                "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
                "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
                "https://placehold.co/",
                "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            ],

            connectSrc: [
                "'self'"
            ],

            objectSrc: ["'none'"],

            baseUri: ["'self'"],

            frameAncestors: ["'none'"],

            formAction: ["'self'"],

            upgradeInsecureRequests: []
        }
    },

    crossOriginEmbedderPolicy: false
});

export default helmetMiddleware;