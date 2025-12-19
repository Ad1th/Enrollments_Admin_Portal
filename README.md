# 🚀 MFC Admin Portal - Recruitments '25

![Version](https://img.shields.io/badge/version-1.0.0-FC7A00.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success.svg?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-MERN-blue.svg?style=for-the-badge)

> A premium, high-performance admin dashboard for managing recruitment enrollments, engineered with **React** and **Express**.

---

## ✨ Features

- **🎨 Sexy Dark UI**: Signature "MFC Black & Orange" theme (`#fc7a00`) with sleek glassmorphism.
- **📊 Live Dashboard**: Real-time applicant tracking and statistics.
- **⚡ Lightning Search**: Instant filtering by Name, Registration Number, or Email.
- **📂 Domain Control**: Specialized workflows for **Tech**, **Design**, and **Management**.
- **📝 Deep Dive**: interactive modals to review applicant profiles and task submissions in detail.
- **🔐 Secure Core**: Industrial-strength JWT authentication.

## 🛠️ The Tech Stack

Built on a robust modern architecture:

| Frontend | Backend | Database |
| :--- | :--- | :--- |
| ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) **Vite** | ![Node](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white) **Express** | ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white) |

## 🚀 Getting Started

Follow these steps to deploy the portal locally.

### 1. Clone & Install

```bash
git clone https://github.com/Ad1th/Enrollments_Admin_Portal.git
cd Enrollments_Admin_Portal
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
PORT=5003
CONNECT_STRING=your_mongodb_connection_string
ACCESS_TOKEN_SECERT=your_secret_key
AUTH_EMAIL=admin_email_config
```

> **Note**: This project operates on port **5003** by default to remain independent.

### 3. Ignite ⚡

Open two terminal sessions to run the full stack:

**Terminal A (Frontend):**
```bash
npm run dev
```

**Terminal B (Backend):**
```bash
node backend/server.js
```

Access the portal at `http://localhost:5173`

## 🎨 Design System

The UI is strictly typed to the MFC Brand Identity:

- **Primary**: `#fc7a00` (Blaze Orange)
- **Void**: `#121212` (True Black Background)
- **Surface**: `#2c2c2c` (Elevated Elements)

---

<p align="center">
  Made with 🧡 for <strong>MFC</strong>
</p>
