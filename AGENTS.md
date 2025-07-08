# Ficsit Hosting Agent Guide

This repository contains a multi-component system for provisioning and managing Satisfactory game servers. The architecture relies heavily on Docker and Docker Compose for local development, testing, and production deployment.

## Overview of Components

- **React Frontend** (`project/`)
  - Provides the dashboard and user interface.
  - Built with Vite + TypeScript.
- **Provisioning System** (`project/provisioning-system/`)
  - **Orchestrator** – Spring Boot service that coordinates nodes, servers, and ports.
  - **Auth Service** – Spring Boot service handling user accounts, authentication, and email verification.
  - **Host Agent** – Python application running on each node. Manages local Docker containers and Rathole clients.
  - **Rathole Server** – Python API that manages Rathole server processes for public tunnels.
- **Supporting Scripts and Documentation** – Various README files describing configuration details, environment variables, and troubleshooting steps.

## Networking Architecture

```
Players/Administrators
        │
        ▼
React Frontend ──► Orchestrator (Spring Boot) ──► Host Agent (Python)
                                   │
                                   ▼
                             Rathole Manager ──► Rathole Server
                                   │
                                   ▼
                                VPS Public IP
```

- Game servers run in Docker containers on the node with the Host Agent.
- The Host Agent starts a Rathole client per server container. Clients forward the game and beacon ports to the Rathole Server running on a VPS.
- The Rathole Server exposes public ports so players can connect from the internet. The Rathole Manager provides an API for creating and destroying these tunnels.
- The Orchestrator coordinates port allocations, keeps node health status in Redis/PostgreSQL, and communicates with the Host Agents over HTTP.
- The Auth Service issues JWT tokens and validates user identities for both the frontend and the Rathole Manager API.

## Development and Testing

- **Docker & Docker Compose** are available in this environment. You can start services using the compose files under each component directory.
- Example: to bring up the Orchestrator stack in development mode:

```bash
cd project/provisioning-system/orchestrator
cp .env.development .env
docker-compose up -d
```

- Similarly, you can deploy the host agent or rathole server with their own compose files for local testing.

## Tips for Agents

1. Inspect the `project/provisioning-system/README.md` and subdirectory READMEs for details on environment variables and quick commands.
2. When running tests or bringing up containers, ensure any required `.env` files are copied from the provided examples.
3. Ports are dynamically allocated and may conflict if old containers or processes remain running. Use `docker-compose down` to clean up before re-testing.
4. Logs for each component are available via `docker-compose logs -f <service>`.

With Docker and Docker Compose installed, you can run end-to-end tests, spin up the entire stack, and verify networking flows locally.
