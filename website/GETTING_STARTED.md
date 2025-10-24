# Getting Started with ShivikMart Website

This guide will help you get the ShivikMart Inventory Management website up and running.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 14 or higher)
- **npm** or **yarn**
- **Backend API** running on `http://localhost:8000`

## Quick Start

### 1. Install Dependencies

```bash
cd website
npm install
```

This will install all required packages including:
- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- And more...

### 2. Configure Environment

Create a `.env` file in the website directory:

```bash
cp .env.example .env
```

Update the `.env` file with your backend API URL:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Start the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:3000`

### 4. Login

Use these credentials to login:
- **Email**: admin@shivikmart.com
- **Password**: admin123

(Make sure you have created this admin user in the backend using the `npm run create-admin` script)

## Available Scripts

### Development

```bash
npm run dev
```
Starts the development server with hot reload.

### Build

```bash
npm run build
```
Creates an optimized production build in the `dist` folder.

### Preview

```bash
npm run preview
```
Preview the production build locally.

### Lint

```bash
npm run lint
```
Run ESLint to check code quality.

## Project Structure

```
website/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Common UI components
│   │   └── layout/        # Layout components
│   ├── config/            # App configuration
│   ├── contexts/          # React contexts (Auth, etc.)
│   ├── pages/             # Page components
│   │   ├── auth/          # Login, Register
│   │   ├── products/      # Product management
│   │   ├── suppliers/     # Supplier management
│   │   ├── purchase-orders/ # Purchase order management
│   │   ├── inventory/     # Inventory tracking
│   │   ├── batches/       # Batch tracking
│   │   ├── brands/        # Brand management
│   │   ├── categories/    # Category management
│   │   └── users/         # User management
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── .env.example           # Environment template
├── index.html             # HTML template
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind config
└── vite.config.js         # Vite config
```

## Features Overview

### 🔐 Authentication
- Secure login with JWT
- Role-based access control
- Protected routes

### 📦 Product Management
- CRUD operations
- Advanced search
- Stock tracking
- Barcode support

### 👥 Supplier Management
- Supplier directory
- Contact management
- GST details

### 🛒 Purchase Orders
- Create and manage POs
- Approval workflow
- Status tracking

### 📊 Inventory
- Real-time tracking
- Stock movements
- Low stock alerts

### 🏷️ Batch Tracking
- FIFO management
- Expiry tracking
- Batch history

### 🎨 Brand & Category
- Organize products
- Hierarchical structure

### 👤 User Management
- User CRUD
- Role assignment
- Permission management

## Common Issues & Solutions

### Port Already in Use

If port 3000 is already in use, you can change it in `vite.config.js`:

```js
export default defineConfig({
  server: {
    port: 3001, // Change to any available port
  },
});
```

### API Connection Error

Ensure:
1. Backend server is running on `http://localhost:8000`
2. `.env` file has correct `VITE_API_URL`
3. CORS is enabled in backend

### Build Errors

Try:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR. Changes to your code will reflect immediately in the browser without full page reload.

### Code Organization

- Keep components small and focused
- Use the `common` folder for reusable components
- Place page-specific components in their respective page folders

### API Integration

All API calls are centralized in `src/services/api.js`. This makes it easy to:
- Modify endpoints
- Add authentication headers
- Handle errors globally

### Styling

The project uses Tailwind CSS for styling:
- Use utility classes for rapid development
- Custom styles in `src/index.css`
- Configuration in `tailwind.config.js`

## Next Steps

1. **Customize Branding**: Update colors in `tailwind.config.js`
2. **Add Features**: Extend functionality as needed
3. **Deploy**: Build and deploy to your hosting platform

## Support

For questions or issues:
- Check the README.md
- Review the backend API documentation
- Create an issue in the repository

## License

© 2024 ShivikMart. All rights reserved.

