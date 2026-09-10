import helmet from "helmet";

const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],

            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://checkout.razorpay.com",
                "https://*.razorpay.com"
            ],

            frameSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://checkout.razorpay.com",
                "https://*.razorpay.com"
            ],

            childSrc: [
                "'self'",
                "blob:",
                "https://*.razorpay.com"
            ],

            workerSrc: [
                "'self'",
                "blob:"
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
                "https://cdn.pixabay.com",
                "https://www.gravatar.com",
                "https://placehold.co",
                "https://upload.wikimedia.org",
                "https://*.razorpay.com"
            ],

            connectSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://lumberjack.razorpay.com",
                "https://lumberjack-cx.razorpay.com",
                "https://*.razorpay.com"
            ],

            objectSrc: ["'none'"],

            baseUri: ["'self'"],

            frameAncestors: ["'none'"],

            formAction: ["'self'", "https://*.razorpay.com", "https://api.razorpay.com"],

            upgradeInsecureRequests: []
        }
    },

    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
});

export default helmetMiddleware;