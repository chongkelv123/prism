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

## 🏗️ Simplified Architecture

PRISM follows a **simplified microservices architecture** with 4 core services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐
│                 │    │                 │    │                         │
│   React App     │◄──►│   API Gateway   │◄──►│   Platform Integration  │
│   (Frontend)    │    │   (Port 3000)   │    │   Service (Port 4005)   │
│                 │    │                 │    │                         │
└─────────────────┘    └─────────────────┘    └─────────────────────────┘
                                │                         │
                                │                         │
                                ▼                         ▼
                       ┌─────────────────┐    ┌─────────────────────────┐
                       │                 │    │                         │
                       │   Auth Service  │    │    Report Generation    │
                       │   (Port 4000)   │    │    Service (Port 4002)  │
                       │                 │    │                         │
                       └─────────────────┘    └─────────────────────────┘
                                │                         │
                                │                         │
                                ▼                         ▼
                       ┌─────────────────┐    ┌─────────────────────────┐
                       │                 │    │                         │
                       │    MongoDB      │    │       RabbitMQ          │
                       │   (Port 27017)  │    │    (Port 5672/15672)    │
                       │                 │    │                         │
                       └─────────────────┘    └─────────────────────────┘
```

### Core Services:

1. **Frontend (React App)**: User interface with authentication, dashboard, and report management
2. **API Gateway**: Routes requests to appropriate microservices and handles CORS
3. **Authentication Service**: Manages user authentication, registration, and JWT tokens
4. **Platform Integrations Service**: Handles connections to Monday.com, Jira, and TROFOS
5. **Report Generation Service**: Creates PowerPoint presentations from project data

### Supporting Infrastructure:
- **MongoDB**: Database for user data, connections, and reports
- **RabbitMQ**: Message broker for inter-service communication

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
   RabbitMQ Management: http://localhost:15672 (guest/guest)
   ```

## 💻 Development

### Project Structure

```
/prism-project
├── /frontend                                # React frontend application with Vite
│   ├── /public                              # Static assets
│   ├── /src                                 # Frontend source code
│   │   ├── /components                      # Reusable UI components
│   │   ├── /contexts                        # React contexts (Auth, Connections)
│   │   ├── /features                        # Feature modules
│   │   ├── /hooks                           # Custom React hooks
│   │   ├── /pages                           # Page components
│   │   ├── /services                        # API services
│   │   ├── /store                           # State management
│   │   ├── /styles                          # Global styles
│   │   └── /utils                           # Utility functions
├── /backend                                 # Backend microservices
│   ├── /api-gateway                         # API Gateway Service
│   │   ├── /src
│   │   │   ├── /routes
│   │   │   ├── /middleware
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── /services                            # Core microservices
│       ├── /auth-service                    # Authentication Service
│       │   ├── /src
│       │   │   ├── /controllers
│       │   │   ├── /models
│       │   │   ├── /routes
│       │   │   ├── /middleware
│       │   │   ├── /events
│       │   │   └── /utils
│       │   ├── Dockerfile
│       │   ├── package.json
│       │   └── tsconfig.json
│       │
│       ├── /platform-integrations-service   # Platform Integration Service
│       │   ├── /src
│       │   │   ├── /controllers
│       │   │   ├── /models
│       │   │   ├── /routes
│       │   │   ├── /clients
│       │   │   ├── /services
│       │   │   └── /utils
│       │   ├── Dockerfile
│       │   ├── package.json
│       │   └── tsconfig.json
│       │
│       └── /report-generation-service       # PowerPoint Generation
│           ├── /src
│           │   ├── /controllers
│           │   ├── /models
│           │   ├── /routes
│           │   ├── /utils
│           │   └── /templates
│           ├── Dockerfile
│           ├── package.json
│           └── tsconfig.json
│
├── /shared                                  # Shared code between services
│   ├── /types                               # Shared TypeScript types
│   ├── /utils                               # Shared utility functions
│   ├── /constants                           # Shared constants
│   └── package.json                         # Shared package dependencies
│
├── /infra                                   # Infrastructure as code
│   ├── /docker                              # Docker configurations
│   │   ├── docker-compose.yml               # Local development setup
│   │   └── docker-compose.prod.yml          # Production configuration
│   │
│   ├── /k8s                                 # Kubernetes manifests
│   │   ├── api-gateway-deployment.yaml
│   │   └── services-deployment.yaml
│   │
│   └── /terraform                           # Cloud infrastructure provisioning
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── /tests                                   # End-to-end and integration tests
│   ├── /e2e
│   ├── /integration
│   └── setup.js
│
├── .github                                  # GitHub specific files
│   └── /workflows                           # GitHub Actions workflows
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
├── .env                                     # Environment variables (git-ignored)
├── .env.example                             # Example environment variables template
├── .gitignore                               # Git ignore rules
├── .eslintrc.js                             # Root ESLint configuration
├── .prettierrc                              # Root Prettier configuration
├── package.json                             # Root package.json for project-wide scripts
└── README.md                                # Project documentation
```

### Running with Docker Compose

The easiest way to run the full application stack:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Running Individual Services

For development, you can run services individually:

```bash
# Run all services in development mode
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend services
npm run dev:backend

# Alternatively, run individual services from their directories
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
- **PowerPoint Generation**: PptxGenJS
- **File Storage**: Local filesystem (configurable)

### DevOps
- **Containerization**: Docker
- **Container Orchestration**: Kubernetes (planned)
- **CI/CD**: GitHub Actions
- **Version Control**: Git

## 📊 Service Details

### Authentication Service (Port 4000)
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- User profile management

### Platform Integrations Service (Port 4005)
- **Monday.com**: Connects via GraphQL API to fetch boards, items, and status updates
- **Jira**: Integrates with Jira Cloud REST API for issues, sprints, and project data
- **TROFOS**: Connects to TROFOS server API for project metrics and backlog items
- Encrypted credential storage
- Connection testing and validation

### Report Generation Service (Port 4002)
- PowerPoint generation using PptxGenJS
- Template-based report creation
- File storage and download management
- Background processing with status tracking

### API Gateway (Port 3000)
- Request routing to appropriate services
- CORS handling
- Health check endpoints
- Error handling and logging

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

## 📈 Development Status

**Current Phase**: Core Backend Development & Frontend Development ✅

**Completed:**
- [x] Project setup and Docker configuration
- [x] Authentication service with JWT
- [x] Platform integrations service foundation
- [x] Frontend React application with routing
- [x] User authentication and protected routes
- [x] Connection management UI
- [x] Report generation service with PowerPoint creation

**In Progress:**
- [ ] Platform API implementations (Monday.com, Jira, TROFOS)
- [ ] Report wizard and template system
- [ ] Advanced error handling and logging

**Upcoming:**
- [ ] Production deployment configuration
- [ ] Advanced testing and QA
- [ ] Performance optimization

## 🚀 Platform Integration Examples

### Monday.com
```typescript
// Example: Fetch boards and items
const mondayClient = new MondayClient(connection);
const projects = await mondayClient.getProjects();
```

### Jira
```typescript
// Example: Fetch project issues
const jiraClient = new JiraClient(connection);
const projectData = await jiraClient.getProject('PRISM');
```

### TROFOS
```typescript
// Example: Fetch project sprints and backlogs
const trofosClient = new TrofosClient(connection);
const sprints = await trofosClient.getProjectData(projectId);
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to follow our coding standards and run tests before submitting PRs.

## 🔐 Environment Variables

### Required Environment Variables

```bash
# Authentication
JWT_SECRET=your_jwt_secret_key_here
TOKEN_EXPIRATION=24h

# Database
MONGODB_URI=mongodb://localhost:27017/prism-auth

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=prism.events

# Platform Integrations
ENCRYPTION_KEY=your_32_character_encryption_key_here

# API Gateway
AUTH_SERVICE_URL=http://localhost:4000
REPORT_SERVICE_URL=http://localhost:4002
PLATFORM_INTEGRATIONS_SERVICE_URL=http://localhost:4005
```

## 👥 Team

- **Kelvin, Chong Kean Siong** (e0895806@u.nus.edu) - Team Leader
- **Ardian Bryan Limasarian** (e0895862@u.nus.edu)
- **Chan Jian Da** (e0895901@u.nus.edu)

## 📝 License

This project is developed as part of TIC4902S Capstone Project at the National University of Singapore.

## 🙏 Acknowledgments

- Special thanks to the National University of Singapore for supporting this project
- All the open-source libraries and frameworks that made this project possible
- The project management platforms (Monday.com, Jira, TROFOS) for their comprehensive APIs

---

**Last Updated**: December 2024  
**Version**: 1.0.0 (Simplified Architecture)  
**Next Milestone**: Platform API Integration Completion