# 🐳 Docker Deployment Guide - AI Document Analyzer

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/yana-arch/ai-document-analyzer.git
   cd ai-document-analyzer
   ```

2. **Start the application**

   ```bash
   docker compose up --build
   ```

3. **Access the application**
   - Open your browser and navigate to `http://localhost:3016`
   - The application will be available at the configured port

### Using Docker Commands

1. **Build the Docker image**

   ```bash
   docker build -t ai-document-analyzer .
   ```

2. **Run the container**
   ```bash
   docker run -p 3016:3016 -e API_KEY=your_gemini_api_key ai-document-analyzer
   ```

## 🔧 Configuration

### Environment Variables

When running the container, make sure to set the required environment variables:

```bash
# Required: Your Gemini AI API key
API_KEY=your_gemini_api_key_here

# Optional: Custom configuration
NODE_ENV=production
VITE_API_BASE_URL=https://your-api-endpoint.com
```

### Docker Compose Configuration

The `compose.yaml` file includes:

- **Multi-stage build** for optimized production images
- **Environment variable management**
- **Port mapping** (3016:3016)
- **Volume mounting** for persistent data (optional)

## 🌐 Deployment Options

### Production Deployment

1. **Build for your target platform**

   ```bash
   # For AMD64
   docker build --platform=linux/amd64 -t ai-document-analyzer .

   # For ARM64 (Apple Silicon)
   docker build --platform=linux/arm64 -t ai-document-analyzer .
   ```

2. **Tag and push to registry**

   ```bash
   docker tag ai-document-analyzer your-registry/ai-document-analyzer:v2.4.0
   docker push your-registry/ai-document-analyzer:v2.4.0
   ```

3. **Deploy to cloud platform**
   - **AWS ECS/Fargate**: Use the Docker image in your task definition
   - **Google Cloud Run**: Deploy directly from Container Registry
   - **Azure Container Instances**: Use the image from Azure Container Registry
   - **DigitalOcean App Platform**: Deploy from Docker Hub or custom registry

### Environment Setup for Production

Create a `.env` file or set environment variables in your deployment platform:

```bash
# Production environment variables
NODE_ENV=production
API_KEY=your_production_gemini_api_key
VITE_API_BASE_URL=https://your-production-api.com
```

## 🔒 Security Considerations

### API Key Management

- **Never commit API keys** to version control
- **Use secrets management** in production (Docker secrets, Kubernetes secrets, etc.)
- **Rotate keys regularly** and monitor usage

### Container Security

- **Run as non-root user** (handled in Dockerfile)
- **Minimal base image** to reduce attack surface
- **Regular security updates** for base images and dependencies

## 📊 Monitoring & Logging

### Health Checks

The application includes basic health check endpoints that can be used for monitoring.

### Logs

- Application logs are available through Docker logs
- Use `docker compose logs` to view logs in development
- Configure log aggregation in production environments

## 🛠 Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Check what's using port 3016
   lsof -i :3016
   # Or use a different port in compose.yaml
   ```

2. **API key not configured**

   - Ensure `API_KEY` environment variable is set
   - Check application logs for API-related errors

3. **Build failures**
   ```bash
   # Clean build
   docker system prune -f
   docker compose build --no-cache
   ```

### Development vs Production

- **Development**: Uses hot reload and source maps
- **Production**: Optimized build with minification and caching

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Guide](https://docs.docker.com/language/nodejs/)
- [AI Document Analyzer Main README](../README.md)

## 🔄 Updates

To update to a newer version:

1. **Pull latest changes**

   ```bash
   git pull origin main
   ```

2. **Rebuild and restart**
   ```bash
   docker compose down
   docker compose up --build
   ```

---

_For more detailed information about the application features and usage, see the main [README.md](../README.md) file._
