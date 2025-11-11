# Qup Backend API

This is the backend API for the Qup virtual queue management application. It is built using Django and Django REST Framework, and is deployed on [Railway](https://railway.app/).

## Features

- API endpoints for managing queue items
- Token-based authentication (JWT)
- PostgreSQL for data storage
- Redis for caching and real-time features (e.g. WebSocket support)
- Dockerized for containerized deployment

## Live API

- Base URL: `https://qup-app-v2-production.up.railway.app/api/`
- Example endpoint: `https://qup-app-v2-production.up.railway.app/api/queue/`

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/qup-backend.git
   cd qup-backend
   ```

2. Create a `.env` file and define the following variables:

   ```
   SECRET_KEY=your-secret-key
   DEBUG=False
   DB_NAME=...
   DB_USER=...
   DB_PASSWORD=...
   DB_HOST=...
   DB_PORT=5432
   REDIS_HOST=...
   REDIS_PORT=6379
   ```

3. Build and run with Docker:

   ```bash
   docker-compose up --build
   ```

4. Apply migrations:

   ```bash
   docker exec -it <backend-container-name> py  thon manage.py migrate
   ```

## Deployment

The project is deployed to Railway with:

- PostgreSQL and Redis provisioned via Railway plugins
- Environment variables configured in Railway Dashboard
- Automatic deployment via GitHub integration

## License

This project is licensed under the MIT License.