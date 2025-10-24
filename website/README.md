# ShivikMart Inventory Management Website

A modern, feature-rich inventory management web application built with React.js and Vite.

## Features

- 🔐 **Authentication & Authorization** - Secure login with role-based access control
- 📦 **Product Management** - Complete CRUD operations for products with advanced search
- 👥 **Supplier Management** - Manage supplier information and relationships
- 🛒 **Purchase Orders** - Create and manage purchase orders with approval workflow
- 📊 **Inventory Tracking** - Real-time stock monitoring with low stock alerts
- 🏷️ **Batch Tracking** - FIFO inventory management with expiry tracking
- 🎨 **Brand & Category Management** - Organize products efficiently
- 👤 **User Management** - Admin controls for user permissions
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🎯 **Dashboard Analytics** - Visual insights into inventory performance

## Tech Stack

- **React 18** - Modern UI library
- **Vite** - Next-generation frontend tooling
- **React Router v6** - Client-side routing
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Hot Toast** - Toast notifications
- **Recharts** - Charting library
- **Date-fns** - Date utility library

## Prerequisites

- Node.js 14+ and npm/yarn
- Backend API running on http://localhost:8000

## Installation

1. **Clone the repository**
   ```bash
   cd website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:
   ```
   VITE_API_URL=http://localhost:8000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
website/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── auth/       # Authentication components
│   │   ├── common/     # Common UI components
│   │   └── layout/     # Layout components
│   ├── config/         # Configuration files
│   ├── contexts/       # React contexts
│   ├── pages/          # Page components
│   │   ├── auth/       # Authentication pages
│   │   ├── products/   # Product pages
│   │   ├── suppliers/  # Supplier pages
│   │   └── ...
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── .env.example        # Environment variables template
├── index.html          # HTML template
├── package.json        # Dependencies
├── tailwind.config.js  # Tailwind configuration
└── vite.config.js      # Vite configuration
```

## Key Features Implemented

### Authentication
- Secure login with JWT tokens
- Role-based access control (Admin, Manager, Employee, Viewer)
- Permission-based UI rendering
- Protected routes
- Auto-logout on token expiry

### Product Management
- List all products with pagination
- Advanced search with fuzzy matching
- Create/Edit/Delete products
- SKU and barcode management
- Stock level tracking
- Multi-level categorization
- Brand association
- Pricing management (Cost, Selling, MRP)

### Supplier Management
- Supplier directory
- Contact information management
- GST details
- Address management
- Active/Inactive status

### Purchase Orders
- Create purchase orders
- Multi-item orders
- Approval workflow
- Status tracking (Draft, Pending, Approved, Received)
- Order cancellation
- Integration with inventory

### Dashboard
- Key metrics overview
- Low stock alerts
- Expiring batch warnings
- Recent purchase orders
- Visual analytics

## Default Login Credentials

For testing purposes:
- **Email**: admin@shivikmart.com
- **Password**: admin123

## API Integration

The application communicates with the backend API using Axios. All API calls are centralized in the `services/api.js` file.

Base API URL: `http://localhost:8000/api/v1`

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: http://localhost:8000)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting with React.lazy
- Image optimization
- Memoization of expensive calculations
- Debounced search inputs
- Pagination for large datasets

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

© 2024 ShivikMart. All rights reserved.

## Support

For support, email support@shivikmart.com or create an issue in the repository.

