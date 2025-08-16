# Deployment Guide

This guide covers deploying EduFlow to production environments using Docker and Docker Compose.

## 🚀 Quick Deployment with Docker

### Prerequisites

- Docker 20.10+ and Docker Compose v2
- PostgreSQL database (or use included Docker setup)
- OpenAI API key

### 1. Environment Setup

Create a `.env.production` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://eduflow_user:your_secure_password@postgres:5432/eduflow
POSTGRES_PASSWORD=your_secure_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters

# Application Settings
NODE_ENV=production
PORT=5000
```

### 2. Build and Deploy

```bash
# Clone the repository
git clone <your-repo-url>
cd eduflow

# Copy environment file
cp .env.production .env

# Deploy with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps
```

### 3. Verify Deployment

```bash
# Check application health
curl http://localhost:5000/api/health

# View logs
docker-compose logs app

# Monitor services
docker-compose logs -f
```

## 🔧 Production Configuration

### SSL/TLS Setup

Update `nginx/nginx.conf` for HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | - | Yes |
| `SESSION_SECRET` | Secret for session encryption | - | Yes |
| `NODE_ENV` | Environment (production/development) | development | No |
| `PORT` | Application port | 5000 | No |
| `REDIS_URL` | Redis connection for caching | - | No |

### Database Migration

For production deployments with existing data:

```bash
# Run database migrations
docker-compose exec app npm run db:migrate

# Seed initial data (optional)
docker-compose exec app npm run db:seed
```

## 🏗️ Infrastructure Options

### Option 1: Single Server Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=eduflow
      - POSTGRES_USER=eduflow_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
```

### Option 2: Cloud Deployment (AWS/GCP/Azure)

#### Using Container Services

```yaml
# For AWS ECS, GCP Cloud Run, Azure Container Instances
version: '3.8'
services:
  app:
    image: your-registry/eduflow:latest
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
```

#### Using Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eduflow-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: eduflow
  template:
    metadata:
      labels:
        app: eduflow
    spec:
      containers:
      - name: eduflow
        image: your-registry/eduflow:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: eduflow-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: eduflow-secrets
              key: openai-api-key
```

## 📊 Monitoring and Logging

### Health Checks

Built-in health check endpoint:

```bash
# Application health
curl http://localhost:5000/api/health

# Database connection
curl http://localhost:5000/api/health/db

# AI services
curl http://localhost:5000/api/health/ai
```

### Logging Configuration

```yaml
# docker-compose.yml logging
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Monitoring Stack

```yaml
# monitoring/docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
```

## 🔐 Security Hardening

### Application Security

```bash
# Create non-root user in Docker
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 eduflow
USER eduflow
```

### Network Security

```yaml
# docker-compose.yml
networks:
  eduflow-internal:
    driver: bridge
    internal: true
  eduflow-external:
    driver: bridge

services:
  app:
    networks:
      - eduflow-internal
      - eduflow-external
  
  postgres:
    networks:
      - eduflow-internal  # Internal only
```

### Secrets Management

```bash
# Using Docker secrets
echo "your_openai_key" | docker secret create openai_api_key -
echo "your_db_password" | docker secret create db_password -
```

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - openai_api_key
      - db_password

secrets:
  openai_api_key:
    external: true
  db_password:
    external: true
```

## 📈 Performance Optimization

### Caching Strategy

```yaml
# Add Redis for caching
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
```

### Load Balancing

```nginx
# nginx/upstream.conf
upstream eduflow_backend {
    server app1:5000;
    server app2:5000;
    server app3:5000;
}

server {
    location / {
        proxy_pass http://eduflow_backend;
    }
}
```

### CDN Configuration

```yaml
# For static assets
services:
  app:
    environment:
      - CDN_URL=https://cdn.your-domain.com
      - STATIC_URL=https://static.your-domain.com
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t eduflow:${{ github.sha }} .
    
    - name: Deploy to production
      run: |
        docker-compose down
        docker-compose up -d
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - docker-compose pull
    - docker-compose up -d
  only:
    - main
```

## 🚨 Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U eduflow_user eduflow > $BACKUP_DIR/database.sql

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/database.sql s3://your-backup-bucket/
```

### Application Data Backup

```bash
# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Backup configuration
cp .env .env.backup.$(date +%Y%m%d)
```

### Recovery Procedure

```bash
# Restore database
docker-compose exec -T postgres psql -U eduflow_user eduflow < backup.sql

# Restore files
tar -xzf uploads_backup.tar.gz

# Restart services
docker-compose restart
```

## 🌍 Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
    depends_on:
      - postgres
      - redis
```

### Database Scaling

```yaml
# Read replicas
services:
  postgres-primary:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=master
  
  postgres-replica:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_MASTER_HOST=postgres-primary
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose logs postgres
   docker-compose exec postgres pg_isready
   ```

2. **OpenAI API Errors**
   ```bash
   # Verify API key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

3. **Memory Issues**
   ```bash
   # Monitor resource usage
   docker stats
   docker-compose logs app | grep -i memory
   ```

### Log Analysis

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs postgres | grep ERROR

# System resource usage
docker system df
docker system prune
```

## 📋 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Backup strategy implemented
- [ ] Monitoring configured

### Post-deployment

- [ ] Health checks passing
- [ ] SSL/TLS working
- [ ] Performance metrics baseline
- [ ] Backup restoration tested
- [ ] Rollback procedure verified

### Maintenance

- [ ] Regular security updates
- [ ] Database maintenance
- [ ] Log rotation configured
- [ ] Performance monitoring
- [ ] Capacity planning

---

This deployment guide provides a comprehensive foundation for running EduFlow in production environments. Adjust configurations based on your specific infrastructure requirements and security policies.