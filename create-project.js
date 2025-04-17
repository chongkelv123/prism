const fs = require('fs');
const path = require('path');

// Define project name (you can also use process.argv to get it from command line)
const projectName = process.argv[2] || 'prism-project';

// Create the base directory if it doesn't exist
if (!fs.existsSync(projectName)) {
    fs.mkdirSync(projectName);
}

// Helper function to create directory recursively
function createDirectory(dirPath) {
    const fullPath = path.join(projectName, dirPath);
    if (!fs.existsSync(fullPath)) {
        // Create all directories in the path
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created folder: ${fullPath}`);
    }
}

// Helper function to create empty file
function createFile(filePath, content = '') {
    const fullPath = path.join(projectName, filePath);
    const dirName = path.dirname(fullPath);
    
    // Ensure the directory exists
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }
    
    // Create the file if it doesn't exist
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content);
        console.log(`Created file: ${fullPath}`);
    }
}

// Define the folder structure
const folderStructure = [
    // Frontend structure
    'frontend/public/images',
    'frontend/public/icons',
    'frontend/src/assets/fonts',
    'frontend/src/assets/images',
    'frontend/src/components/auth',
    'frontend/src/components/common/Button',
    'frontend/src/components/common/Card',
    'frontend/src/components/common/Input',
    'frontend/src/components/common/Modal',
    'frontend/src/components/layout',
    'frontend/src/components/feature-specific/dashboard',
    'frontend/src/components/feature-specific/reports',
    'frontend/src/components/feature-specific/projects',
    'frontend/src/pages',
    'frontend/src/features/auth/api',
    'frontend/src/features/auth/components',
    'frontend/src/features/auth/hooks',
    'frontend/src/features/auth/utils',
    'frontend/src/features/reports',
    'frontend/src/features/projects',
    'frontend/src/hooks',
    'frontend/src/services',
    'frontend/src/store/slices',
    'frontend/src/utils',
    'frontend/src/types',
    'frontend/src/styles',
    'frontend/src/constants',
    'frontend/src/contexts',
    'frontend/src/lib',
    
    // Backend structure
    'backend/api-gateway/src/routes',
    'backend/api-gateway/src/middleware',
    'backend/services/auth-service/src/controllers',
    'backend/services/auth-service/src/models',
    'backend/services/auth-service/src/routes',
    'backend/services/auth-service/src/utils',
    'backend/services/project-data-service/src/controllers',
    'backend/services/project-data-service/src/models',
    'backend/services/project-data-service/src/routes',
    'backend/services/report-generation-service/src/templates',
    'backend/services/report-generation-service/src/controllers',
    'backend/services/report-generation-service/src/routes',
    'backend/services/notification-service/src/handlers',
    'backend/services/notification-service/src/routes',
    'backend/services/storage-service/src/controllers',
    'backend/services/storage-service/src/models',
    'backend/event-bus/src',
    
    // Shared code
    'shared/types',
    'shared/utils',
    'shared/constants',
    
    // Infrastructure
    'infra/docker',
    'infra/k8s',
    'infra/terraform',
    
    // Tests
    'tests/e2e',
    'tests/integration',
    
    // GitHub
    '.github/workflows'
];

// Define files to create
const filesToCreate = [
    // Root files
    '.env',
    '.env.example',
    '.gitignore',
    '.eslintrc.js',
    '.prettierrc',
    'package.json',
    'README.md',
    
    // GitHub workflows
    '.github/workflows/backend-ci.yml',
    '.github/workflows/frontend-ci.yml',
    
    // Frontend files
    'frontend/public/favicon.ico',
    'frontend/src/components/auth/LoginForm.tsx',
    'frontend/src/components/auth/RegistrationForm.tsx',
    'frontend/src/components/layout/Header.tsx',
    'frontend/src/components/layout/Footer.tsx',
    'frontend/src/components/layout/Sidebar.tsx',
    'frontend/src/components/layout/MainLayout.tsx',
    'frontend/src/pages/HomePage.tsx',
    'frontend/src/pages/LandingPage.tsx',
    'frontend/src/pages/LoginPage.tsx',
    'frontend/src/pages/RegisterPage.tsx',
    'frontend/src/pages/DashboardPage.tsx',
    'frontend/src/pages/ReportsPage.tsx',
    'frontend/src/pages/NotFoundPage.tsx',
    'frontend/src/hooks/useAuth.ts',
    'frontend/src/hooks/useFetch.ts',
    'frontend/src/services/api.service.ts',
    'frontend/src/services/auth.service.ts',
    'frontend/src/services/report.service.ts',
    'frontend/src/store/slices/authSlice.ts',
    'frontend/src/store/index.ts',
    'frontend/src/utils/api.ts',
    'frontend/src/styles/globals.css',
    'frontend/src/styles/tailwind.css',
    'frontend/src/constants/routes.ts',
    'frontend/src/constants/api.ts',
    'frontend/src/App.tsx',
    'frontend/src/main.tsx',
    'frontend/src/router.tsx',
    'frontend/src/vite-env.d.ts',
    'frontend/.eslintrc.js',
    'frontend/.prettierrc',
    'frontend/tsconfig.json',
    'frontend/vite.config.ts',
    'frontend/tailwind.config.js',
    'frontend/postcss.config.js',
    'frontend/package.json',
    
    // Backend files
    'backend/api-gateway/src/index.ts',
    'backend/api-gateway/Dockerfile',
    'backend/api-gateway/package.json',
    'backend/api-gateway/tsconfig.json',
    'backend/services/auth-service/src/index.ts',
    'backend/services/auth-service/Dockerfile',
    'backend/services/auth-service/package.json',
    'backend/services/auth-service/tsconfig.json',
    'backend/services/project-data-service/src/index.ts',
    'backend/services/project-data-service/Dockerfile',
    'backend/services/project-data-service/package.json',
    'backend/services/project-data-service/tsconfig.json',
    'backend/services/report-generation-service/src/index.ts',
    'backend/services/report-generation-service/Dockerfile',
    'backend/services/report-generation-service/package.json',
    'backend/services/report-generation-service/tsconfig.json',
    'backend/services/notification-service/src/index.ts',
    'backend/services/notification-service/Dockerfile',
    'backend/services/notification-service/package.json',
    'backend/services/notification-service/tsconfig.json',
    'backend/services/storage-service/src/index.ts',
    'backend/services/storage-service/Dockerfile',
    'backend/services/storage-service/package.json',
    'backend/services/storage-service/tsconfig.json',
    'backend/event-bus/src/eventHandler.ts',
    'backend/event-bus/Dockerfile',
    'backend/event-bus/package.json',
    'backend/package.json',
    
    // Shared files
    'shared/package.json',
    
    // Infrastructure files
    'infra/docker/docker-compose.yml',
    'infra/docker/docker-compose.prod.yml',
    'infra/k8s/api-gateway-deployment.yaml',
    'infra/k8s/services-deployment.yaml',
    'infra/terraform/main.tf',
    'infra/terraform/variables.tf',
    
    // Test files
    'tests/setup.js'
];

// Create basic package.json content for the root
const rootPackageJson = JSON.stringify({
  "name": projectName,
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend/*",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm test",
    "test:backend": "cd backend && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}, null, 2);

// Create basic package.json content for frontend
const frontendPackageJson = JSON.stringify({
  "name": `${projectName}-frontend`,
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.0.2",
    "vite": "^4.4.5",
    "vitest": "^0.34.6"
  }
}, null, 2);

// Create basic package.json content for backend
const backendPackageJson = JSON.stringify({
  "name": `${projectName}-backend`,
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:*\"",
    "build": "tsc -b services/*",
    "test": "jest"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.9.0",
    "concurrently": "^8.2.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  }
}, null, 2);

// Create the frontend vite.config.ts
const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
`;

// Create the frontend tailwind.config.js
const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;

// Create folders
folderStructure.forEach(folder => {
    createDirectory(folder);
});

// Create files with content where needed
createFile('package.json', rootPackageJson);
createFile('frontend/package.json', frontendPackageJson);
createFile('backend/package.json', backendPackageJson);
createFile('frontend/vite.config.ts', viteConfig);
createFile('frontend/tailwind.config.js', tailwindConfig);

// Create other empty files
filesToCreate.forEach(file => {
    if (file !== 'package.json' && 
        file !== 'frontend/package.json' && 
        file !== 'backend/package.json' &&
        file !== 'frontend/vite.config.ts' &&
        file !== 'frontend/tailwind.config.js') {
        createFile(file);
    }
});

console.log(`Full-stack project structure for ${projectName} has been created successfully!`);