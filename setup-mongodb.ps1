# BlockTrade MongoDB Setup Script for Windows
# This script sets up MongoDB with Docker and initializes the database

param(
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host "BlockTrade MongoDB Setup Script"
    Write-Host "Usage: .\setup-mongodb.ps1 [-Force] [-Help]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Force    Force recreate the container even if it exists"
    Write-Host "  -Help     Show this help message"
    exit 0
}

# Colors for output
$ColorInfo = "Blue"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $ColorSuccess
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $ColorWarning
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

Write-Host "🚀 BlockTrade MongoDB Setup" -ForegroundColor Blue
Write-Host "==================================" -ForegroundColor Blue

# Check if Docker is running
Write-Status "Checking Docker status..."
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Check if MongoDB container already exists
$containerExists = docker ps -a --format "table {{.Names}}" | Select-String "^mongodb$"

if ($containerExists -and -not $Force) {
    Write-Warning "MongoDB container already exists"
    
    # Check if it's running
    $containerRunning = docker ps --format "table {{.Names}}" | Select-String "^mongodb$"
    if ($containerRunning) {
        Write-Status "MongoDB container is already running"
    } else {
        Write-Status "Starting existing MongoDB container..."
        docker start mongodb
        Write-Success "MongoDB container started"
    }
} else {
    if ($Force -and $containerExists) {
        Write-Warning "Force flag detected. Removing existing container..."
        docker stop mongodb 2>$null
        docker rm mongodb 2>$null
        Write-Success "Existing container removed"
    }
    
    Write-Status "Creating MongoDB volume..."
    docker volume create mongodb_data
    Write-Success "Volume 'mongodb_data' created"

    Write-Status "Starting MongoDB container..."
    docker run --name mongodb -d -p 27017:27017 `
        -v mongodb_data:/data/db `
        -e MONGO_INITDB_ROOT_USERNAME=admin `
        -e MONGO_INITDB_ROOT_PASSWORD=password `
        mongodb/mongodb-community-server
    
    Write-Success "MongoDB container started"
}

# Wait for MongoDB to be ready
Write-Status "Waiting for MongoDB to be ready..."
$maxAttempts = 30
$attempt = 1

while ($attempt -le $maxAttempts) {
    try {
        docker exec mongodb mongosh --eval "db.adminCommand('ping')" 2>$null | Out-Null
        Write-Success "MongoDB is ready"
        break
    } catch {
        if ($attempt -eq $maxAttempts) {
            Write-Error "MongoDB failed to start after $maxAttempts attempts"
            exit 1
        }
        Write-Host "." -NoNewline
        Start-Sleep 2
        $attempt++
    }
}

Write-Host ""

# Display connection information
Write-Host ""
Write-Host "📊 MongoDB Connection Information" -ForegroundColor Blue
Write-Host "==================================" -ForegroundColor Blue
Write-Host "Host: localhost"
Write-Host "Port: 27017"
Write-Host "Admin Username: admin"
Write-Host "Admin Password: password"
Write-Host "Database: blocktrade"
Write-Host ""

# Display connection string
Write-Host "🔗 Connection String:" -ForegroundColor Blue
Write-Host "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin"
Write-Host ""

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Status "Creating .env file from .env.example..."
    Copy-Item ".env.example" ".env"
    
    # Update MongoDB URI in .env file
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin"
    Set-Content ".env" $envContent
    
    Write-Success ".env file created and updated with MongoDB URI"
} else {
    Write-Warning ".env file already exists. Please update MONGO_URI manually if needed."
}

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Initialize the database by running the commands in DATABASE_SETUP.md"
Write-Host "2. Connect to MongoDB shell: docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin"
Write-Host "3. Run: use blocktrade"
Write-Host "4. Follow the database initialization commands in DATABASE_SETUP.md"
Write-Host ""
Write-Host "🎯 Quick Test:" -ForegroundColor Blue
Write-Host "Run this command to test the connection:"
Write-Host "docker exec mongodb mongosh -u admin -p password --authenticationDatabase admin --eval `"db.adminCommand('ping')`""
Write-Host ""
Write-Host "💡 Available npm commands:" -ForegroundColor Blue
Write-Host "npm run test:db       # Test database connection"
Write-Host "npm run db:shell      # Connect to MongoDB shell"
Write-Host "npm run db:logs       # View MongoDB logs"
Write-Host "npm run db:start      # Start MongoDB container"
Write-Host "npm run db:stop       # Stop MongoDB container"
Write-Host ""
