# PRISM: PowerPoint Report Integration & Synchronization Manager

![PRISM Logo](https://via.placeholder.com/200x80?text=PRISM)

PRISM is a web-based API that seamlessly integrates with project management platforms like Monday.com, Jira, and TROFOS to automate the creation of PowerPoint reports. This system revolutionizes project reporting by transforming raw project management data into polished, professional presentations - saving time and reducing errors.

## 🌟 Key Features

- **Automated Transformation**: Convert project data into polished PowerPoint reports automatically
- **Multi-Platform Integration**: Seamless connections with Monday.com, Jira, and TROFOS
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

- Node.js (v14+)
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/prism.git
   cd prism
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
   Frontend: http://localhost:3000
   API Gateway: http://localhost:8000
   ```

## 💻 Development

### Project Structure

```
/prism
├── /frontend                # React frontend application
├── /backend                 # Backend microservices
│   ├── /api-gateway         # API Gateway Service
│   ├── /services            # Individual microservices
│   │   ├── /auth-service
│   │   ├── /project-data-service
│   │   ├── /report-generation-service
│   │   ├── /notification-service
│   │   └── /storage-service
│   └── /event-bus           # Message broker configuration
├── /shared                  # Shared code between services
├── /infra                   # Infrastructure configuration
└── /tests                   # End-to-end and integration tests
```

### Running Individual Services

```bash
# Run frontend in development mode
cd frontend
npm run dev

# Run a specific backend service
cd backend/services/auth-service
npm run dev
```

## 🔧 Technology Stack

### Frontend
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **API Communication**: Axios

### Backend
- **Runtime**: Node.js
- **API Framework**: Express.js
- **Authentication**: OAuth 2.0 / Passport.js
- **Message Broker**: RabbitMQ / Apache Kafka
- **Storage**: AWS S3 / Azure Blob Storage

### DevOps
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitLab CI/CD
- **Version Control**: Git (GitLab)

## 📊 Project Timeline

The development of PRISM follows a one-year plan:

1. **Months 1-2**: Planning & Requirements
2. **Months 3-4**: System Design
3. **Months 5-6**: Core Backend Development
4. **Months 7-8**: Frontend Development
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

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Ardian Bryan Limasarian (e0895862@u.nus.edu)
- Chan Jian Da (e0895901@u.nus.edu)
- Kelvin, Chong Kean Siong (e0895806@u.nus.edu) - Team Leader

## 🙏 Acknowledgments

- Special thanks to the National University of Singapore for supporting this project
- All the open-source libraries and frameworks that made this project possible