# 🏡 HomeStation - E-Commerce Platform

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white)](https://aws.amazon.com/ec2/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)

> **Live Demo:** [https://homestation.anuranjsm.co.in](https://homestation.anuranjsm.co.in)

HomeStation is a full-featured, multi-tier e-commerce web platform engineered with Node.js, Express.js, and MongoDB. Designed with the Model-View-Controller (MVC) architectural pattern, the system provides automated order life-cycle tracking, role-based authorization, high-volume inventory management, dynamic promotional engines, and multi-channel payment integrations.

---

## 📑 Table of Contents

- [Core Architectural Overview](#-core-architectural-overview)
- [Key Features](#-key-features)
  - [User Portal](#user-portal)
  - [Admin Panel](#admin-panel)
  - [Security Implementation](#security-implementation)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Installation & Running Locally](#installation--running-locally)
- [Production Deployment Pipeline](#-production-deployment-pipeline)
- [Author](#-author)

---

## 🏛 Core Architectural Overview

* **Design Pattern:** Decoupled Model-View-Controller (MVC) separating business logic, routing layers, data schemas, and server-side templates.
* **State & Authentication:** Segregated sessions between user storefront and admin console using secure, encrypted HTTP-only session cookies and Passport strategies.
* **Data Layer:** Normalized and indexed Mongoose schema structures running on MongoDB Atlas with strict schema validations and automated timestamps.
* **Process Management:** Cluster/Fork-capable PM2 process supervision ensuring auto-restart on memory thresholds, uncaught rejections, and host reboot events.

---

## 🌟 Key Features

### User Portal
* **Authentication Suite:**
  * Local account registration with BCrypt salted password hashing.
  * Google OAuth 2.0 single sign-on integration.
  * Transactional OTP verification powered by Nodemailer.
* **Product Discovery:**
  * Multi-field full-text search with regex tokenization.
  * Categorical and price-bracket filtering with server-side pagination.
  * Stock validation checks preventing over-allocation during high-concurrency cart actions.
* **Checkout & Fulfillment:**
  * Multi-gateway checkout integrating Razorpay SDK and Cash on Delivery (COD).
  * Geocoded address auto-population with Google Maps API.
  * Wallet credit management supporting refund crediting and partial/full checkout redemption.
  * Automated PDF invoice generation upon order completion.

### Admin Panel
* **Business Analytics & Reporting:**
  * Dynamic revenue graphing, order status metrics, and sales report generation (exportable to PDF & Excel).
  * Period filtering (Daily, Weekly, Monthly, Custom Range).
* **Inventory & Catalog Control:**
  * Multi-image uploads with server-side cropping, optimization, and hosting via Cloudinary.
  * Category lifecycle management with soft-delete capabilities.
  * Stock threshold warnings and SKU tracking.
* **Promotions & Support:**
  * Rules-based coupon engine (percentage/flat deductions, minimum spend checks, usage limits).
  * Category-wide and product-specific promotional offer management.
  * Customer inquiry management ticketing pipeline.

### Security Implementation
* **Helmet Middleware:** Configured Content Security Policy (CSP), frame ancestor restrictions, cross-origin opener policies, and script origin control.
* **Data Sanitization:** Strict query sanitization mitigating NoSQL Injection and cross-site scripting (XSS).
* **Rate Limiting:** Granular rate-limit throttlers on sensitive endpoints (authentication routes and checkout pipelines).
* **CSRF Mitigation:** Synchronizer token validation injected into form payloads to prevent cross-site request forgery.

---

## 🛠 Technology Stack

### Backend
* **Runtime:** Node.js (v18+)
* **Framework:** Express.js (ES Modules syntax)
* **Database:** MongoDB Atlas (Mongoose ODM)
* **Process Management:** PM2

### Frontend & Rendering
* **Templating:** EJS (Embedded JavaScript)
* **Styling:** CSS3, Bootstrap
* **Media Management:** Cloudinary CDN

### Security & Middlewares
* **Headers & CSP:** Helmet.js
* **Sanitization:** `express-mongo-sanitize`
* **Rate Limiting:** `express-rate-limit`
* **Session Management:** `express-session`, `connect-mongo`
* **CSRF Protection:** Custom / Synchronizer Token Pattern

### Third-Party APIs & Services
* **Payments:** Razorpay API
* **Authentication:** Google OAuth 2.0 (Passport.js)
* **Mailing:** Nodemailer (SMTP)
* **Geocoding:** Google Maps Platform

---

## 🌐 System Architecture

```text
                       [ Incoming Client Request ]
                                   │
                                   ▼
             [ AWS Route 53 / GoDaddy DNS Resolution ]
                                   │
                         (Port 443 / HTTPS)
                                   ▼
             [ Nginx Reverse Proxy (SSL Termination) ]
                                   │
                         (Port 3000 / HTTP)
                                   ▼
             [ PM2 Process Manager / Express.js Server ]
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
[ MongoDB Atlas ]          [ Cloudinary CDN ]        [ Razorpay / APIs ]
 (Encrypted TLS)           (Optimized Media)         (Payment Geteway)
```

---

## 📁 Project Directory Structure

```text
homestation/
├── config/                     # Configuration files (DB, Passport, Cloudinary)
│   ├── db.js
│   └── passport.js
├── controllers/                # Business logic controllers
│   ├── admin/                  # Admin controllers (Dashboard, Product, Category, etc.)
│   └── user/                   # User controllers (Auth, Checkout, Order, Profile)
├── middlewares/                # Custom express middlewares
│   ├── cache.js                # Cache-control headers
│   ├── csrf.js                 # CSRF generation and validation
│   ├── globalErrorHandler.js   # Centralized error handler
│   ├── helmetConfig.js         # CSP and HTTP security headers
│   ├── loggerMiddleware.js     # Request and transaction logging
│   ├── mongoSanitizeMiddleware.js # NoSQL injection sanitization
│   ├── notFoundMiddleware.js   # 404 handler
│   ├── rateLimiter.js          # Route-level and global rate limiters
│   └── session.js              # Session stores and cookie configs
├── models/                     # Mongoose data models
│   ├── Address.js
│   ├── Cart.js
│   ├── Category.js
│   ├── Order.js
│   ├── Product.js
│   └── User.js
├── public/                     # Static client-facing assets
│   ├── css/
│   ├── js/
│   └── images/
├── routes/                     # Application route modules
│   ├── admin/                  # Administrative endpoints
│   └── user/                   # User storefront endpoints
├── views/                      # Server-rendered EJS templates
│   ├── admin/
│   ├── user/
│   └── partials/
├── .env.example                # Sample environment blueprint
├── app.js                      # Express application initialization & routing pipeline
├── ecosystem.config.cjs        # PM2 cluster configuration
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) `>= 18.x`
* [Git](https://git-scm.com/)
* Active [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
* Accounts for [Cloudinary](https://cloudinary.com/), [Razorpay](https://razorpay.com/), and [Google Cloud Console](https://console.cloud.google.com/)

---

### Environment Setup

An active `.env` file in the root directory:

```bash
cp .env.example .env
```

Populate the following keys in your `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/HomeStation?retryWrites=true&w=majority

# Session Secrets
USER_SESSION_SECRET=your_user_session_secret
ADMIN_SESSION_SECRET=your_admin_admin_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# OAuth 2.0 (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/user/auth/google/callback

# Mail Service (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

### Installation & Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ANURANJ714/homestation.git
   cd homestation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local server:**
   ```bash
   # Development mode with autoreload
   npm run dev

   # Standard production execution
   npm start
   ```

Access the application locally at `http://localhost:3000`.

---

## ☁️ Production Deployment Pipeline

This application is deployed on an **AWS EC2 Ubuntu** instance utilizing **Nginx** as an edge reverse proxy and **PM2** as the application process manager.

### 1. Reverse Proxy (Nginx)
Nginx intercepts incoming web traffic on ports 80/443 and securely forwards it to the internal Node process:

```nginx
server {
    server_name homestation.anuranjsm.co.in;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Process Manager (PM2)
Maintains zero-downtime execution, automatic crash recovery, and service persistence across reboots:

```bash
# Start application
pm2 start app.js --name "homestation-app" --env production

# Persist across system reboots
pm2 startup systemd
pm2 save
```

### 3. SSL Configuration (Certbot)
Automated Let's Encrypt TLS certificate generation and renewal:

```bash
sudo certbot --nginx -d homestation.anuranjsm.co.in
```

---

## 👨‍💻 Author

**Anuranj S M**
* **GitHub:** [@ANURANJ714](https://github.com/ANURANJ714)
* **LinkedIn:** [Anuranj S M](https://linkedin.com/in/anuranjsm)
* **Live Project:** [homestation.anuranjsm.co.in](https://homestation.anuranjsm.co.in)

---

## 📄 License

This project is intended for learning and portfolio purposes.
