FROM python:3.11-slim

# Install system dependencies and Docker CLI
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc python3-dev libffi-dev libssl-dev \
      curl docker.io wget unzip \
 && rm -rf /var/lib/apt/lists/*

# Install Docker Compose binary
ENV COMPOSE_VERSION=2.17.3
RUN curl -SL https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64 \
    -o /usr/local/bin/docker-compose \
 && chmod +x /usr/local/bin/docker-compose

# Install FRP client binary
ENV FRP_VERSION=0.57.0
RUN wget https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz \
 && tar -xzf frp_${FRP_VERSION}_linux_amd64.tar.gz \
 && mv frp_${FRP_VERSION}_linux_amd64/frpc /usr/local/bin/frpc \
 && chmod +x /usr/local/bin/frpc \
 && rm -rf frp_${FRP_VERSION}_linux_amd64*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy agent code and configuration
WORKDIR /app
COPY agent.py /app/agent.py
COPY .env /app/.env

# Create data directories for Satisfactory servers and Rathole configs
RUN mkdir -p /data/satisfactory /data/rathole

# Expose the agent API port
EXPOSE 8082

# Run the agent
CMD ["python", "agent.py"]
