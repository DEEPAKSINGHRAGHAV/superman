# ShivikMart MEN Stack API

A complete MEN (MongoDB, Express, Node.js) stack boilerplate with comprehensive features including user management, product catalog, and sample APIs.

## 🚀 Features

- **MongoDB Integration**: Complete database setup with Mongoose ODM
- **Express.js Server**: RESTful API with middleware and error handling
- **User Management**: Full CRUD operations for users with validation
- **Product Catalog**: Complete product management with categories, ratings, and search
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Environment Configuration**: Flexible configuration with environment variables
- **Sample Data**: Seeding script with realistic test data
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: Well-documented endpoints with examples

## 📁 Project Structure

```
shivikmart/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   ├── errorHandler.js      # Global error handling
│   └── asyncHandler.js      # Async function wrapper
├── models/
│   ├── User.js             # User model with validation
│   └── Product.js          # Product model with features
├── routes/
│   ├── userRoutes.js       # User API endpoints
│   └── productRoutes.js    # Product API endpoints
├── scripts/
│   └── seedData.js         # Database seeding script
├── config.env              # Environment variables
├── package.json            # Dependencies and scripts
├── server.js               # Main application entry point
└── README.md               # This file
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Navigate to your project directory
cd shivikmart

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the environment configuration and update the values:

```bash
# The config.env file is already created with default values
# Update the MongoDB URI if needed
```

**config.env** contains:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `API_VERSION`: API version (default: v1)

### 3. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The default URI `mongodb://localhost:27017/shivikmart` will work

#### Option B: MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `config.env`

### 4. Start the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

### 5. Seed Sample Data (Optional)

```bash
# Run the seeding script to populate database with sample data
node scripts/seedData.js
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Server health status

### Users API (`/api/v1/users`)
- `GET /` - Get all users (with pagination and filtering)
- `GET /:id` - Get user by ID
- `POST /` - Create new user
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `GET /active` - Get active users only

### Products API (`/api/v1/products`)
- `GET /` - Get all products (with filtering, search, pagination)
- `GET /:id` - Get product by ID
- `POST /` - Create new product
- `PUT /:id` - Update product
- `DELETE /:id` - Soft delete product
- `GET /category/:category` - Get products by category
- `GET /featured` - Get featured products
- `POST /:id/stock` - Update product stock
- `POST /:id/rating` - Add product rating

## 🔧 API Usage Examples

### Create a User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "role": "user"
  }'
```

### Get All Products
```bash
curl http://localhost:3000/api/v1/products
```

### Search Products
```bash
curl "http://localhost:3000/api/v1/products?search=wireless&category=electronics"
```

### Create a Product
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartphone",
    "description": "Latest smartphone with advanced features",
    "price": 699.99,
    "category": "electronics",
    "stock": 25,
    "tags": ["smartphone", "mobile", "tech"]
  }'
```

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Mongoose schema validation
- **Error Handling**: Secure error messages in production

## 📊 Database Models

### User Model
- `name`: String (required, 2-50 chars)
- `email`: String (required, unique, validated)
- `age`: Number (0-120)
- `role`: Enum (user, admin, moderator)
- `isActive`: Boolean (default: true)
- `createdAt`, `updatedAt`: Timestamps

### Product Model
- `name`: String (required, 2-100 chars)
- `description`: String (required, max 500 chars)
- `price`: Number (required, min 0)
- `category`: Enum (electronics, clothing, books, home, sports, beauty, other)
- `stock`: Number (required, min 0)
- `images`: Array of image URLs
- `tags`: Array of strings
- `featured`: Boolean (default: false)
- `rating`: Object with average and count
- `isActive`: Boolean (default: true)

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shivikmart
API_VERSION=v1
```

### Heroku Deployment
1. Create a Heroku app
2. Set environment variables
3. Deploy using Git

```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

## 🧪 Testing the API

You can test the API using:
- **Postman**: Import the endpoints
- **curl**: Command line examples provided above
- **Thunder Client**: VS Code extension
- **Insomnia**: API testing tool

## 📝 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `node scripts/seedData.js` - Seed database with sample data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the console logs for error messages
2. Verify MongoDB connection
3. Ensure all environment variables are set correctly
4. Check if the required ports are available

---

**Happy Coding! 🎉**
