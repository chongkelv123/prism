# PRISM: PowerPoint Report Integration & Synchronization Manager

![PRISM Logo](https://via.placeholder.com/200x80?text=PRISM)

PRISM is a web-based API that seamlessly integrates with project management platforms like Monday.com, Jira, and TROFOS to automate the creation of PowerPoint reports. This system revolutionizes project reporting by transforming raw project management data into polished, professional presentations - saving time and reducing errors.

## 🌟 Key Features

- **Automated Transformation**: Convert project data into polished PowerPoint reports automatically
- **Multi-Platform Integration**: Seamlessly connect with Monday.com, Jira, and TROFOS
- **Real-Time Synchronization**: Ensure reports always reflect the latest project status
- **Enhanced Productivity**: Eliminate manual report creation, saving valuable time
- **Error Reduction**: Automated processing ensures consistent, accurate reporting
- **Customizable Output**: Flexible templates adapt to specific reporting needs

## 🏗️ Architecture

PRISM follows a microservices architecture with a Pub/Sub communication model for scalability and flexibility:

- **User Interface**: React-based web app for configuration and management
- **API Gateway**: Routes requests to appropriate microservices
- **Authentication Service**: Manages user authentication and access control
- **Project Management Data Service**: Fetches data from external project management tools
- **Data Processing Service**: Transforms fetched data for report generation
- **Report Generation Service**: Creates PowerPoint presentations from processed data
- **Notification Service**: Alerts users when reports are ready
- **Storage Service**: Manages temporary storage of generated reports

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/prism-project.git
   cd prism-project
   ```

2. Install dependencies:
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development environment:
   ```bash
   # From the root directory
   docker-compose up -d
   ```

5. Access the application:
   ```
   Frontend: http://localhost:5173
   API Gateway: http://localhost:3000
   ```

## 💻 Development

### Project Structure

```
/prism-project
├── /frontend                # React frontend application with Vite
│   ├── /public              # Static assets
│   ├── /src                 # Frontend source code
│   │   ├── /components      # Reusable UI components
│   │   ├── /contexts        # React contexts (Auth, etc.)
│   │   ├── /features        # Feature modules
│   │   ├── /hooks           # Custom React hooks
│   │   ├── /pages           # Page components
│   │   ├── /services        # API services
│   │   ├── /store           # State management
│   │   ├── /styles          # Global styles
│   │   └── /utils           # Utility functions
├── /backend                 # Backend microservices
│   ├── /api-gateway         # API Gateway Service
│   ├── /services            # Individual microservices
│   │   ├── /auth-service    # Authentication service
│   │   ├── /project-data-service
│   │   ├── /report-generation-service
│   │   ├── /notification-service
│   │   └── /storage-service
│   └── /event-bus           # Message broker configuration
├── /shared                  # Shared code between services
├── /infra                   # Infrastructure configuration
│   ├── /docker              # Docker configurations
│   ├── /k8s                 # Kubernetes manifests
│   └── /terraform           # Cloud infrastructure provisioning
└── /tests                   # End-to-end and integration tests
```

### Running with Docker Compose

The easiest way to run the full application stack is using Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Individual Services

The project is set up with npm workspaces, allowing you to run services directly from the root:

```bash
# Run all services in development mode
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend services
npm run dev:backend

# Alternatively, you can run individual services from their directories
cd frontend
npm run dev

cd backend/services/auth-service
npm run dev
```

## 🔧 Technology Stack

### Frontend
- **Framework**: React.js with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI Components**: Custom components with Lucide React icons

### Backend
- **Runtime**: Node.js
- **API Framework**: Express.js
- **Authentication**: JWT with bcrypt
- **Database**: MongoDB
- **Message Broker**: RabbitMQ
- **Storage**: Cloud storage (AWS S3/Azure Blob planned)

### DevOps
- **Containerization**: Docker
- **Container Orchestration**: Kubernetes (planned)
- **CI/CD**: GitHub Actions (configured)
- **Version Control**: Git

## 📊 Project Timeline

The development of PRISM follows a one-year plan:

1. **Months 1-2**: Planning & Requirements ✅
2. **Months 3-4**: System Design ✅
3. **Months 5-6**: Core Backend Development 🔄
4. **Months 7-8**: Frontend Development 🔄
5. **Month 9**: Report Generation Engine
6. **Month 10**: Storage & Notifications
7. **Month 11**: Testing & QA
8. **Month 12**: Deployment & Launch

## 🔍 Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test

# Run e2e tests
cd tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to follow our coding standards and run tests before submitting PRs.

## 👥 Team

- Ardian Bryan Limasarian (e0895862@u.nus.edu)
- Chan Jian Da (e0895901@u.nus.edu)
- Kelvin, Chong Kean Siong (e0895806@u.nus.edu) - Team Leader

## 🙏 Acknowledgments

- Special thanks to the National University of Singapore for supporting this project
- All the open-source libraries and frameworks that made this project possible