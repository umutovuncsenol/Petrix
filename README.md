# Petrix

Petrix is a full-stack veterinary clinic management platform that connects pet owners, veterinarians, clinic managers, and administrators in a single role-based system.

The project covers the core operational workflows of a multi-branch veterinary clinic, from appointments and medical records to vaccinations, inventory, boarding, memberships, invoices, and reporting.

## Features

- Role-based authentication for owners, veterinarians, managers, and administrators
- Pet profiles and longitudinal medical histories
- Appointment booking and veterinarian visit workflows
- Diagnosis, treatment, and vaccination records
- Medication inventory, restocking, waste tracking, and low-stock alerts
- Boarding requests and owner-facing boarding views
- Membership plans, invoices, payments, and veterinarian ratings
- Branch, operational, and vaccination reports
- Email reminders and scheduled notifications

## Architecture

```text
petrix/
├── backend/          Spring Boot REST API
├── frontend/         React single-page application
├── db/               PostgreSQL schema
└── docker-compose.yml
```

The backend follows a controller–service–repository structure. Spring Security and JWT handle authentication and authorization, while Spring JDBC provides direct access to PostgreSQL. The React frontend communicates with the backend through REST APIs.

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Java 17, Spring Boot 3, Spring Security, Spring JDBC |
| Frontend | React 18, Vite, React Router, Axios |
| Database | PostgreSQL |
| Authentication | JWT |
| Infrastructure | Docker, Docker Compose |
| Build tools | Maven, npm |

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Run with Docker

```bash
cd petrix
cp .env.example .env
# Replace the placeholder values in .env
docker compose up --build
```

Once the services are ready:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- PostgreSQL: `localhost:5433`

Stop the application with:

```bash
docker compose down
```

## Local Development

Start a PostgreSQL instance and set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and
`JWT_SECRET` in your shell or IDE, then run:

```bash
cd petrix/backend
mvn spring-boot:run
```

In another terminal:

```bash
cd petrix/frontend
npm install
npm run dev
```

Mail delivery is optional and uses `MAIL_USERNAME`, `MAIL_PASSWORD`, and
`MAIL_ENABLED`. The local `.env` file is ignored by Git; `.env.example` contains
only placeholders.

## My Contributions

My work on this team project included:

- Initial database schema and backend domain structure
- Authentication, registration, and role-based security
- Appointment, visit, vaccination, and medical-record workflows
- Inventory and medication operations
- Backend controllers, repositories, and REST integration
- Owner, veterinarian, and manager dashboard improvements
- Cross-layer debugging and demo-readiness work

## Project Background

Petrix was developed collaboratively by a five-person team. This repository preserves the original commit history and contributor attribution.

Original team repository: [HelloWorld-Vet/group20_vetpet](https://github.com/HelloWorld-Vet/group20_vetpet)
