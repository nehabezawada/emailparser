# Email Receipt Processing System

A comprehensive full-stack application that automatically processes PDF receipts from emails, stores them in a database, and provides bank statement reconciliation capabilities.

## 🚀 Features

### Core Functionality
- **Email Processing**: Automatically reads incoming emails and extracts PDF receipts
- **PDF Parsing**: Intelligent extraction of merchant names, amounts, dates, and categories
- **Database Storage**: SQLite database with comprehensive ledger management
- **Bank Reconciliation**: Upload CSV bank statements and compare with ledger entries
- **Modern UI**: Beautiful, responsive React frontend with real-time updates

### Key Features
- **Dashboard**: Overview with statistics, charts, and quick actions
- **Ledger Management**: View, edit, and manage all processed receipts
- **Reconciliation**: Upload bank statements and see matching analysis
- **Email Settings**: Configure email processing and monitor activity
- **Search & Filter**: Advanced search and filtering capabilities
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data persistence
- **IMAP** for email processing
- **PDF parsing** with pdf-parse
- **CSV processing** for bank statements
- **Multer** for file uploads

### Frontend
- **React** with modern hooks
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Router** for navigation
- **Axios** for API communication
- **React Dropzone** for file uploads

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd email-receipt-processor
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit the .env file with your email credentials
   nano .env
   ```

4. **Email Setup (Gmail)**
   - Enable 2-factor authentication in your Gmail account
   - Generate an App Password (Google Account → Security → App Passwords)
   - Use the App Password in your .env file

5. **Start the application**
   ```bash
   # Development mode (runs both server and client)
   npm run dev
   
   # Or run separately:
   npm run server  # Backend only
   cd client && npm start  # Frontend only
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Database Configuration
DATABASE_URL=./data/receipts.db

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Email Provider Setup

#### Gmail
- Host: `imap.gmail.com`
- Port: `993`
- Use App Password (not regular password)

#### Outlook/Hotmail
- Host: `outlook.office365.com`
- Port: `993`

#### Yahoo
- Host: `imap.mail.yahoo.com`
- Port: `993`

## 📊 Usage

### 1. Email Processing
1. Navigate to "Email Settings"
2. Configure your email credentials
3. Test the connection
4. Click "Process Emails" to scan for new receipts

### 2. Viewing Ledger
1. Go to "Ledger" page
2. Browse all processed receipts
3. Use search and filters to find specific entries
4. Edit or delete entries as needed

### 3. Bank Reconciliation
1. Navigate to "Reconciliation"
2. Upload a CSV bank statement
3. Click "Compare with Ledger"
4. Review the matching analysis
5. Save the reconciliation results

### 4. Dashboard
- View overall statistics
- See spending trends and category breakdowns
- Monitor recent email processing activity

## 📁 Project Structure

```
email-receipt-processor/
├── server/
│   ├── index.js              # Main server file
│   ├── database/
│   │   └── database.js       # Database setup and utilities
│   ├── routes/
│   │   ├── ledger.js         # Ledger API routes
│   │   ├── email.js          # Email processing routes
│   │   └── reconciliation.js # Bank reconciliation routes
│   ├── services/
│   │   └── emailService.js   # Email processing service
│   └── utils/
│       └── pdfParser.js      # PDF parsing utilities
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.js     # Navigation component
│   │   ├── pages/
│   │   │   ├── Dashboard.js  # Dashboard page
│   │   │   ├── Ledger.js     # Ledger management
│   │   │   ├── Reconciliation.js # Bank reconciliation
│   │   │   └── EmailSettings.js # Email configuration
│   │   ├── App.js            # Main React component
│   │   └── index.js          # React entry point
│   └── public/
│       └── index.html        # HTML template
├── data/                     # Database files (created automatically)
├── package.json              # Server dependencies
├── vercel.json              # Vercel deployment config
└── README.md                # This file
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Add the environment variables from your `.env` file

### Manual Deployment

1. **Build the client**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Start the server**
   ```bash
   npm start
   ```

## 🔍 API Endpoints

### Ledger
- `GET /api/ledger` - Get ledger entries with pagination
- `POST /api/ledger` - Create new ledger entry
- `PUT /api/ledger/:id` - Update ledger entry
- `DELETE /api/ledger/:id` - Delete ledger entry
- `GET /api/ledger/stats/summary` - Get ledger statistics

### Email Processing
- `POST /api/email/process` - Process new emails
- `GET /api/email/log` - Get email processing logs
- `GET /api/email/stats` - Get email processing statistics
- `POST /api/email/test-connection` - Test email connection

### Reconciliation
- `POST /api/reconciliation/upload-statement` - Upload bank statement
- `POST /api/reconciliation/compare` - Compare with ledger
- `POST /api/reconciliation/save` - Save reconciliation results

## 🧪 Testing

### Manual Testing
1. Send an email with a PDF receipt to your configured email
2. Process emails through the UI
3. Verify the receipt appears in the ledger
4. Upload a bank statement CSV
5. Test the reconciliation functionality

### Sample Data
The system includes intelligent PDF parsing that can extract:
- Merchant names
- Transaction amounts
- Dates
- Categories (auto-assigned based on merchant)

## 🔒 Security Features

- **Rate limiting** on API endpoints
- **Input validation** and sanitization
- **CORS** protection
- **Helmet.js** for security headers
- **Environment variable** protection for sensitive data

## 🐛 Troubleshooting

### Common Issues

1. **Email Connection Failed**
   - Verify your email credentials
   - Ensure 2FA is enabled and App Password is used
   - Check IMAP settings for your email provider

2. **PDF Parsing Issues**
   - Ensure PDFs are text-based (not scanned images)
   - Check that PDFs contain receipt information
   - Verify PDF file size is reasonable

3. **Database Issues**
   - Ensure the `data` directory exists
   - Check file permissions
   - Verify SQLite is properly installed

4. **Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for scalability and maintainability
- Focus on user experience and performance
- Comprehensive error handling and logging

---

**Note**: This system is designed for personal use and educational purposes. For production use, consider additional security measures and data backup strategies. 