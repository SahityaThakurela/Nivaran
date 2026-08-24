# Civic Platform

Civic Platform is a comprehensive solution designed to bridge the gap between citizens, government administrators, university officials, and industry partners. It provides a mobile application for citizens to seamlessly report civic issues and a web-based dashboard for administrators to track, manage, and resolve them efficiently.

## 🏗 Architecture & Repository Structure

The platform is structured as a **Monorepo** using [Turborepo](https://turbo.build/) and `pnpm` workspaces.

- **`apps/api`**: The backend server providing RESTful APIs. Handles authentication, database interactions, image uploads, AI processing, and core business logic.
- **`apps/mobile`**: The citizen-facing mobile application built with React Native and Expo. Allows users to capture issue photos, auto-detect locations, and track the status of their reports.
- **`rootAdminDashboardWeb`**: The web application for administrators and authorities (City Admins, Government Admins, etc.) to view analytics, manage issues via maps/queues, and monitor audit logs.

## 💻 Tech Stacks

### **Backend (`apps/api`)**
- Node.js & Express
- TypeScript
- Prisma ORM & PostgreSQL (with `pgvector` & `postgis` extensions)
- Cloudinary (Image storage)
- JWT (Authentication)
- Zod (Request Validation)

### **Mobile App (`apps/mobile`)**
- React Native
- Expo & EAS
- React Navigation (Native Stack)
- React Native Maps
- Expo Image Picker & Expo Location

### **Admin Dashboard (`rootAdminDashboardWeb`)**
- React 19 & Vite
- TypeScript
- React Router DOM
- Tailwind CSS
- Recharts (Analytics & Data Visualization)
- Leaflet & React-Leaflet (Maps integration)
- Lucide React (Icons)

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v11+) - Used as the package manager
- PostgreSQL Database
- Cloudinary Account (for image uploads)
- [Expo Go](https://expo.dev/client) (on your mobile device for testing)

### 1. Clone the repository
```bash
git clone <repository-url>
cd civic-platform
```

### 2. Install Dependencies
Run the following command at the root of the project to install dependencies for all workspaces:
```bash
pnpm install
```

---

### 3. Backend Setup (`apps/api`)
1. Navigate to the backend directory:
   ```bash
   cd apps/api
   ```
2. Configure environment variables:
   Copy the example `.env` file and fill in your credentials.
   ```bash
   cp .env.example .env
   ```
   *Required variables typically include `DATABASE_URL`, `DIRECT_URL`, Cloudinary keys, and `JWT_SECRET`.*
3. Setup Database (Prisma):
   Generate the Prisma client and push the schema to your database.
   ```bash
   pnpm prisma:generate
   
   # Apply migrations to your database
   pnpm prisma:migrate
   
   # (Optional) Seed the database with initial roles/data
   pnpm prisma:seed
   ```
4. Start the API Server:
   ```bash
   pnpm dev
   ```
   *The backend will be running at `http://localhost:4000`.*

---

### 4. Admin Dashboard Setup (`rootAdminDashboardWeb`)
1. Navigate to the dashboard directory:
   ```bash
   cd rootAdminDashboardWeb
   ```
2. Configure environment variables:
   Create a `.env` file to connect the dashboard to your local API.
   ```bash
   echo "VITE_API_URL=http://localhost:4000" > .env
   ```
3. Start the Frontend Application:
   ```bash
   pnpm dev
   ```
   *The dashboard will be available at `http://localhost:3000`.*

---

### 5. Mobile App Setup (`apps/mobile`)
1. Navigate to the mobile app directory:
   ```bash
   cd apps/mobile
   ```
2. Configure environment variables:
   Create a `.env` file and set the required backend endpoints or any external API keys (like Google Maps).
   ```bash
   cp .env.example .env
   # Or create it manually if an example doesn't exist
   ```
3. Start the Expo Server:
   ```bash
   pnpm start
   
   # If you are facing network issues testing on a physical device, start with an ngrok tunnel:
   pnpm start:tunnel
   ```
4. Run on Device:
   Download the **Expo Go** app on your iOS or Android device, and scan the QR code displayed in your terminal.

---

## 🔗 Links & Local Endpoints

- **Backend API Base URL**: `http://localhost:4000`
- **Frontend Admin Dashboard**: `http://localhost:3000`
- **Mobile Expo Server**: Runs locally (Port varies, accessible via Expo Go QR code)

## 🛠 Useful Monorepo Commands
You can run the following commands from the **root directory** utilizing Turborepo:
- `pnpm dev` — Runs the development servers for all apps concurrently (API, Mobile, and Web).
- `pnpm build` — Builds all packages in the monorepo for production.
- `pnpm lint` — Runs TypeScript type-checking and linter across all workspaces.

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
