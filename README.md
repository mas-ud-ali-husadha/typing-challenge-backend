# Real-Time Typing Test API & Socket Service

## Introduction
This project is a **real-time typing test backend** that integrates **REST API**, **WebSocket events**, and **Redis** for data storage, pub/sub messaging, and leaderboard management.  
It supports:
- Global and per-user statistics
- Real-time leaderboards
- Multiplayer typing sessions with live progress tracking
- Persistent user history

The stack includes:
- **Node.js + Express** for API routes
- **Socket.IO** for live updates
- **Redis (ioredis)** for data persistence and pub/sub events

---

## Table of Contents
1. [Features](#features)  
2. [Installation](#installation)  
3. [Configuration](#configuration)  
4. [API Endpoints](#api-endpoints)  
5. [WebSocket Events](#websocket-events)  
6. [Services Overview](#services-overview)  
7. [Example Usage](#example-usage)  
8. [Troubleshooting](#troubleshooting)  
9. [License](#license)  

---

## Features
- **REST API**
  - Health checks
  - Fetch random typing text
  - View global statistics
  - Get leaderboards by WPM, accuracy, or consistency
  - View user profiles
  - Submit typing test results
- **Real-Time WebSocket**
  - Broadcast user online/offline status
  - Broadcast typing progress and start events
  - Auto-updating leaderboards
  - Global statistics updates
- **Redis-Powered**
  - Persistent leaderboards and stats
  - Pub/Sub event bus for real-time sync
  - Session tracking

---

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the server
npm start
