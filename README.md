# VPN Manager Dashboard (SvelteKit & Supabase Edition)

VPN Manager is a high-performance web dashboard designed to simplify the management and monitoring of your proxy/VPN services. This application has been completely rebuilt with a modern, responsive, and animated UI using **SvelteKit** and **TailwindCSS**, with a **Supabase** backend.

It provides a user-friendly interface to manage proxies, accounts, and tunnel configurations without needing to interact with a command-line interface or complex configuration files.

---

## ✨ Key Features

- **Centralized Dashboard**: Get a real-time overview of your services, including total proxies, online proxies, active tunnels, and user accounts.
- **Proxy Management**: Easily add, view, and manage your list of proxies.
- **Account Management**: Control who has access to your services by managing user accounts.
- **Supabase-Powered Backend**: Utilizes a powerful PostgreSQL database for reliable and scalable data storage.
- **Modern Frontend**: A clean, responsive, and animated interface built with SvelteKit and TailwindCSS.

---

## 🚀 Architecture & Technology

The project has been migrated to a modern, scalable, and secure technology stack:

- **Frontend**: **SvelteKit** with **TailwindCSS** for a reactive, performant, and beautiful user interface.
- **Backend**: **SvelteKit Server Routes** handle all server-side logic. Each `+server.js` file in the `src/routes/api` directory becomes a serverless API endpoint.
- **Database**: **Supabase** provides the PostgreSQL backend, enabling complex relational queries and better scalability.

### Application Workflow
1.  The user accesses the application.
2.  SvelteKit renders the application, fetching data from the API endpoints as needed.
3.  The SvelteKit server routes execute, connecting to the Supabase database using secure, private environment variables.
4.  The functions retrieve or write data to the PostgreSQL database.
5.  The data is returned to the frontend as JSON, which then dynamically updates the user interface.

---

## 🔧 Local Development Setup Guide

Follow these steps to run a copy of the project on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
- A [Supabase](https://supabase.com/) account and a new project created.

### Step 1: Clone the Repository
Clone this repository to your local machine.

### Step 2: Install Dependencies
Navigate to the project directory and install the required dependencies.
```sh
npm install
```

### Step 3: Set Up the Supabase Database
Your database needs to be set up with the correct tables and security policies.

1.  Open your project in the Supabase Dashboard.
2.  Navigate to the **SQL Editor**.
3.  Open the `setup.sql` file in this repository and copy its entire content.
4.  Paste the SQL script into the editor in Supabase and click **"RUN"**. This will create the `proxies`, `accounts`, `tunnels`, and `metadata` tables.

### Step 4: Configure Environment Variables
The application needs to know how to connect to your Supabase database.

1.  Create a new file in the project's root directory named `.env`.
2.  Find your API credentials in your Supabase dashboard under **Project Settings > API**.
3.  Add the following content to your `.env` file, replacing the placeholders with your own keys:

    ```
    # Supabase Project Credentials
    SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLIC_ANON_KEY"
    ```

### Step 5: Run the Local Development Server
You can now start the local development server.

```sh
npm run dev
```
The SvelteKit development server will start on `localhost:5173`. You can now open `http://localhost:5173` in your browser to see the application running.

---

## 📦 Deployment

This application is designed to be deployed on any platform that supports Node.js and SvelteKit, such as Vercel or Netlify. When deploying, you will need to configure the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in your hosting provider's settings.
