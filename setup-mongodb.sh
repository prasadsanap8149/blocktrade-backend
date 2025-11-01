#!/bin/bash

# BlockTrade MongoDB Setup Script
# This script sets up MongoDB with Docker and initializes the database

set -e  # Exit on any error

echo "🚀 BlockTrade MongoDB Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_status "Checking Docker status..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check if MongoDB container already exists
if docker ps -a --format 'table {{.Names}}' | grep -q "^mongodb$"; then
    print_warning "MongoDB container already exists"
    
    # Check if it's running
    if docker ps --format 'table {{.Names}}' | grep -q "^mongodb$"; then
        print_status "MongoDB container is already running"
    else
        print_status "Starting existing MongoDB container..."
        docker start mongodb
        print_success "MongoDB container started"
    fi
else
    print_status "Creating MongoDB volume..."
    docker volume create mongodb_data
    print_success "Volume 'mongodb_data' created"

    print_status "Starting MongoDB container..."
    docker run --name mongodb -d -p 27017:27017 \
        -v mongodb_data:/data/db \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=password \
        mongodb/mongodb-community-server
    
    print_success "MongoDB container started"
fi

# Wait for MongoDB to be ready
print_status "Waiting for MongoDB to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        print_success "MongoDB is ready"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "MongoDB failed to start after ${max_attempts} attempts"
        exit 1
    fi
    
    echo -n "."
    sleep 2
    ((attempt++))
done

# Display connection information
echo ""
echo "📊 MongoDB Connection Information"
echo "=================================="
echo "Host: localhost"
echo "Port: 27017"
echo "Admin Username: admin"
echo "Admin Password: password"
echo "Database: blocktrade"
echo ""

# Display connection string
echo "🔗 Connection String:"
echo "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from .env.example..."
    cp .env.example .env
    
    # Update MongoDB URI in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|MONGO_URI=.*|MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin|' .env
    else
        # Linux
        sed -i 's|MONGO_URI=.*|MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin|' .env
    fi
    
    print_success ".env file created and updated with MongoDB URI"
else
    print_warning ".env file already exists. Please update MONGO_URI manually if needed."
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Initialize the database by running the commands in DATABASE_SETUP.md"
echo "2. Connect to MongoDB shell: docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin"
echo "3. Run: use blocktrade"
echo "4. Follow the database initialization commands in DATABASE_SETUP.md"
echo ""
echo "🎯 Quick Test:"
echo "Run this command to test the connection:"
echo "docker exec mongodb mongosh -u admin -p password --authenticationDatabase admin --eval \"db.adminCommand('ping')\""
echo ""
