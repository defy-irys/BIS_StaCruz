### Tech Stack

### Frontend
| Layer | Technology | Version |
|-------|------------|---------|
| UI Framework | React | 19.2.8 |
| Language | TypeScript | ~6.0.2 |
| Build/Dev Server | Vite | 8.2.2 |
| Routing | React Router | 7.18.3 |
| Styling | Tailwind CSS | 4.3.3 |
| CSS Processing | PostCSS | 8.5.26 |
| State Management | Zustand | 5.0.15 |
| HTTP Client | Axios | 1.20.0 |
| Forms | React Hook Form | 7.87.0 |
| Validation | Zod | 4.5.4 |
| Utility Libraries | clsx + tailwind-merge | 2.1.1 / 3.6.0 |
| Class Variance | class-variance-authority | 0.7.1 |
| Date Handling | date-fns | 4.4.0 |
| Linting | oxlint | 1.79.0 |

**Architecture:** SPA (Single Page Application) with React + Vite  
**Data Layer:** Mock data initially, transitioning to FastAPI backend  
**GIS:** Work in Progress

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Migrations:** Alembic
- **Authentication:** JWT-based with RBAC (Role-Based Access Control)
- **API Documentation:** OpenAPI/Swagger

### Infrastructure
- **Version Control:** Git/GitHub
- **Branch Protection:** Enabled on `main`
- **Project Structure:** Modular monolith with clear separation of concerns

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9+ or higher, comes with Node.js)
- **Python** (v3.9+) - [Download](https://www.python.org/)
- **PostgreSQL** (v14+) - [Download](https://www.postgresql.org/)
- **Git** (v2.30+) - [Download](https://git-scm.com/)

### Verify Installation
```bash
node --version   # Should be v18+
npm --version    # Should be v9+
python --version # Should be 3.9+
git --version    # Should be 2.30+
psql --version   # Should be 14+
```

## Quick Start
1. Clone Repository 
```bash
git clone https://github.com/defy-irys/BIS_StaCruz.git
cd BIS_StaCruz
```
2. Backend setup
```bash
cd backend

python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Set up database (make sure PostgreSQL is running)
# Copy environment template
cp .env.example .env  # If exists, otherwise create .env

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```
Backend will run at: http://localhost:8000
API docs: http://localhost:8000/docs

3. Frontend Setup
```bash
#new terminal
cd frontend
npm install

npm run dev
```
Frontend will run at: http://localhost:5173

### Branch Naming Convention
```feature/feature-name``` (e.g., ```feature/resident-registration```)

```bugfix/issue-description``` (e.g., ```bugfix/login-error```)

```hotfix/critical-fix```

```docs/documentation-update```

### Commit Message Format
```text 
type: subject
```
Types: ```feat```, ```fix```, ```docs```, ```style```, ```refactor```, ```test```, ```chore```

### Workflow
```bash
# 1. Start with latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-task

# 3. Make changes and commit
git add .
git commit -m "feat: description"

# 4. Push branch
git push origin feature/my-task

# 5. Create Pull Request on GitHub
# 6. Wait for review and approval
```

### Testing
Backend Tests
```bash
cd backend
pytest
```
Frontend Linting
```bash
cd frontend
npm run lint
```

Security
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Password hashing with secure algorithms
- Environment variables for sensitive data

Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

License
This project is proprietary and confidential. Unauthorized use or distribution is prohibited.

> Maintained by: Lavender Fields IT New Gen Team
>> Last Updated: 1113 09/02/2026
