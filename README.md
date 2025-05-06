<!-- <p align="center">
  <img src="https://via.placeholder.com/200x200.png?text=TecNet+API" width="200" alt="TecNet Logo" />
</p> -->

<h1 align="center">TecNet Backend API</h1>

<p align="center">
  A robust and scalable backend API for TecNet - a comprehensive platform for web development, mobile development, video game development, and UI/UX design services.
</p>

<p align="center">
  <a href="https://nodejs.org/en/"><img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
</p>

<p align="center">
  <a href="https://github.com/luiscastillo23/tecnet-backend/stargazers"><img src="https://img.shields.io/github/stars/luiscastillo23/tecnet-backend" alt="Stars" /></a>
  <a href="https://github.com/luiscastillo23/tecnet-backend/issues"><img src="https://img.shields.io/github/issues/luiscastillo23/tecnet-backend" alt="Issues" /></a>
  <a href="https://github.com/luiscastillo23/tecnet-backend/blob/main/LICENSE"><img src="https://img.shields.io/github/license/luiscastillo23/tecnet-backend" alt="License" /></a>
</p>

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the App](#running-the-app)
  - [Database Setup](#database-setup)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🚀 About

TecNet Backend is the API that powers the TecNet platform, a comprehensive solution for a company specializing in web development, mobile development, video game development, and UI/UX design services. This backend provides all the necessary endpoints to manage projects, users, quote requests, and more.

## ✨ Features

- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **User Management**: Create, update, and manage user accounts with different roles
- **Project Management**: Track and manage development projects
- **Service Categories**: Organize services by categories
- **Quote Requests**: Handle and process customer quote requests
- **Email Notifications**: Automated email system for quotes, project updates, etc.
- **File Upload**: S3 integration for file storage and management
- **API Documentation**: Interactive Swagger documentation

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - A progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- **ORM**: [Prisma](https://www.prisma.io/) - Next-generation Node.js and TypeScript ORM
- **Database**: PostgreSQL - Powerful, open-source object-relational database
- **Authentication**: Passport.js, JWT - Industry-standard authentication
- **Validation**: class-validator - Decorator-based property validation
- **Storage**: AWS S3 - Cloud storage for files and media
- **Email**: Nodemailer - Sending emails from Node.js
- **Documentation**: Swagger/OpenAPI - Interactive API documentation
- **Security**: Helmet - Secure HTTP headers

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- PostgreSQL database
- AWS S3 account (for file storage)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/luiscastillo23/tecnet-backend.git
   cd tecnet-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or with yarn
   yarn install
   ```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Application
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tecnet?schema=public"

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_s3_bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Email
MAIL_HOST=smtp.example.com
MAIL_USER=user@example.com
MAIL_PASSWORD=your_mail_password
MAIL_FROM=noreply@tecnet.com
```

### Database Setup

1. Start your PostgreSQL database
2. Run Prisma migrations to set up your database schema:
   ```bash
   npx prisma migrate dev
   # or with yarn
   yarn prisma migrate dev
   ```

### Running the App

```bash
# Development mode
npm run start:dev
# or
yarn start:dev

# Production mode
npm run start:prod
# or
yarn start:prod
```

After starting the application, it will be available at: http://localhost:4000/api

## 📚 API Documentation

When running in development mode, Swagger documentation is available at:
http://localhost:4000/docs

This interactive documentation allows you to:

- View all available endpoints
- Understand request/response formats
- Test API calls directly from the browser
- Authenticate using JWT tokens

## 🏗 Project Structure

```
├── prisma/              # Database schema and migrations
├── src/
│   ├── auth/            # Authentication module
│   ├── categories/      # Categories module
│   ├── common/          # Shared utilities and services
│   ├── config/          # Application configuration
│   ├── decorators/      # Custom decorators
│   ├── mail/            # Email functionality
│   ├── prisma/          # Prisma service and module
│   ├── projects/        # Projects module
│   ├── quote-requests/  # Quote requests module
│   ├── roles/           # User roles module
│   ├── users/           # User management module
│   ├── utils/           # Utility functions
│   ├── app.module.ts    # Main application module
│   └── main.ts          # Application entry point
├── test/                # End-to-end tests
└── ...
```

## 🧪 Testing

```bash
# Unit tests
npm run test
# or
yarn test

# End-to-end tests
npm run test:e2e
# or
yarn test:e2e

# Test coverage
npm run test:cov
# or
yarn test:cov
```

## 📦 Deployment

For production deployment, we recommend using Docker with our included Docker Compose setup:

```bash
# Build and start services
docker-compose up -d
```

Alternatively, you can deploy to any Node.js hosting service like:

- AWS Elastic Beanstalk
- Heroku
- DigitalOcean App Platform
- Vercel
- Render

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Project Repository: [https://github.com/luiscastillo23/tecnet-backend](https://github.com/luiscastillo23/tecnet-backend)

Project Website: Soon

Email contact: [tecnet.message@gmail.com](mailto:tecnet.message@gmail.com)

---

<p align="center">
  Built with ❤️ by the TecNet Team
</p>
</qodoArtifact>

This README.md provides a comprehensive overview of the TecNet backend application. It includes:

1. **Professional header** with project logo and badges to showcase technologies
2. **Clear introduction** explaining what TecNet is and its purpose
3. **Features section** highlighting the key capabilities of the backend
4. **Detailed tech stack** showing all the technologies used
5. **Getting started guide** with installation, environment setup, and database configuration
6. **API documentation** information pointing to the Swagger UI
7. **Project structure** to help developers understand the codebase organization
8. **Testing and deployment** instructions
9. **Contributing guidelines** to encourage community involvement

The README is designed to be both informative for developers working on the project and attractive for anyone visiting the repository. It showcases the professional nature of the TecNet platform while providing all necessary technical details.
