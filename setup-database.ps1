# PowerShell script to execute schema.sql
# Run this script to set up your PlanCompareAI database

Write-Host "🚀 Setting up PlanCompareAI Database..." -ForegroundColor Green

# Database configuration
$dbName = "plancompareai"
$dbUser = "postgres"
$schemaFile = "C:\CodeBase\PlanCompareAI\database\schema.sql"

# Check if PostgreSQL is installed
try {
    $pgVersion = psql --version
    Write-Host "✅ PostgreSQL found: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

# Prompt for password
$password = Read-Host "Enter PostgreSQL password for user '$dbUser'" -AsSecureString
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

try {
    # Check if database exists
    Write-Host "🔍 Checking if database '$dbName' exists..." -ForegroundColor Yellow
    $dbExists = psql -U $dbUser -lqt | Select-String -Pattern $dbName
    
    if (-not $dbExists) {
        Write-Host "📝 Creating database '$dbName'..." -ForegroundColor Yellow
        createdb -U $dbUser $dbName
        Write-Host "✅ Database '$dbName' created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✅ Database '$dbName' already exists." -ForegroundColor Green
    }
    
    # Execute schema file
    Write-Host "📄 Executing schema file..." -ForegroundColor Yellow
    psql -U $dbUser -d $dbName -f $schemaFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 Schema executed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Database setup complete! You can now:" -ForegroundColor Cyan
        Write-Host "   1. Update your .env file with database credentials" -ForegroundColor White
        Write-Host "   2. Start the server: npm start" -ForegroundColor White
        Write-Host "   3. Test dynamic scraping: POST /api/plans/refresh" -ForegroundColor White
    } else {
        Write-Host "❌ Error executing schema file." -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}

Write-Host ""
Write-Host "🔗 Next steps:" -ForegroundColor Yellow
Write-Host "   • Update .env: DB_USER=postgres, DB_PASSWORD=your_password, DB_NAME=plancompareai" -ForegroundColor White
Write-Host "   • Test connection: node -e `"require('./config/database').query('SELECT NOW()')`"" -ForegroundColor White