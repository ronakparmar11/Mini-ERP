# 🚀 Mini ERP – AI-Powered Multilingual Enterprise Resource Planning System

Mini ERP is a modern, full-stack Enterprise Resource Planning (ERP) platform designed to streamline business operations for small and medium-sized enterprises (SMEs). Built with an emphasis on usability, automation, and regional accessibility, it integrates AI-powered workflows, multilingual support, and real-time operational visibility.

---

## ✨ Key Features

### 📊 Executive Dashboard

* Real-time business KPIs
* Revenue trends and operational insights
* Recent activity tracking
* Risk indicators and action center

### 📦 Product Management

* Create and manage products
* Track inventory availability
* Product import/export support
* Excel-based product import automation

### 🛒 Sales Management

* Create and manage Sales Orders
* Order lifecycle tracking
* Sales Order confirmation and delivery workflows
* AI-powered PDF Sales Order OCR import

### 🧾 Invoice Management

* Generate invoices from Sales Orders
* Download invoices as PDF
* Email invoices directly to customers
* Invoice status tracking

### 🏭 Manufacturing Management

* Manufacturing Order workflows
* Work-in-progress tracking
* Production completion handling
* Automatic inventory updates

### 🧩 Bills of Materials (BoM)

* Define finished product recipes
* Multi-component manufacturing support
* Quantity-per-batch configuration

### 📥 Purchase Management

* Create Purchase Orders
* Vendor tracking
* Goods receipt processing
* Procurement workflows

### 📦 Inventory Management

* Real-time stock tracking
* Immutable inventory ledger
* Movement history and traceability
* Reservation and production consumption tracking

### 🔔 Admin Notification System

* In-app notifications for critical ERP events
* Multi-admin awareness and collaboration
* Read/unread notification tracking

### 🎤 Voice Navigation

* Navigate ERP modules using voice commands
* Hands-free ERP interaction
* Language-aware voice infrastructure

### 🌍 Multilingual Support

* Instant English ↔ Gujarati switching
* Persistent language preferences
* Regional accessibility for local businesses

### 📄 Pagination Support

* Reusable client-side pagination
* Enhanced performance and usability
* Consistent experience across ERP modules

### 📝 Audit Logs

* Field-level change tracking
* Entity-level activity monitoring
* Complete operational transparency

---

## 🧠 AI-Powered Capabilities

### OCR-Based Sales Order Import

Upload customer PDF orders and automatically extract:

* Customer Name
* Email Address
* Shipping Address
* Product Information
* Quantities
* Multiple line items

This significantly reduces manual data entry effort.

### Smart Excel Product Import

Bulk import product catalogs through Excel files, enabling rapid onboarding of inventory data.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* React Query
* i18next

### Backend

* FastAPI
* SQLAlchemy
* PostgreSQL
* Alembic

### Additional Integrations

* PDF Generation
* OCR Processing
* Email Services
* Voice Recognition APIs

---

## 🏗️ System Architecture

```text
React + TypeScript Frontend
            │
            ▼
       FastAPI APIs
            │
            ▼
 SQLAlchemy ORM Layer
            │
            ▼
      PostgreSQL Database
```

---

## ⚙️ Local Setup

### Clone Repository

```bash
git clone https://github.com/ronakparmar11/Mini-ERP.git
cd Mini-ERP
```

### Backend Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

alembic upgrade head

uvicorn main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

---

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 🔑 Demo Credentials

```text
Admin:
Email: admin@example.com
Password: admin123

User:
Email: user@example.com
Password: user123
```

> Replace these credentials if changed.

---

## 🎯 Problem Statement

Traditional ERP systems are often expensive, complex, and inaccessible to regional businesses due to language barriers and cumbersome workflows.

Mini ERP addresses these challenges by combining:

* Business process automation
* AI-assisted workflows
* Multilingual accessibility
* Modern user experience
* SME-focused design principles

---

## 🚀 Future Enhancements

* Real-time notifications using WebSockets
* Advanced analytics and forecasting
* Mobile application support
* Role-based approval workflows
* Additional regional language support
* AI-powered business insights

---

## 👨‍💻 Developed By

**Ronak Parmar**

B.E. Computer Engineering Student

Passionate about building scalable systems, AI-powered applications, and impactful software solutions.

GitHub: https://github.com/ronakparmar11

LinkedIn: https://www.linkedin.com/in/ronak-parmar-75b9422ba

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.

Feedback and contributions are always welcome!
