@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM Bulk Email Sender - Docker Start Script (Windows)
REM ============================================================
REM Automatically finds available ports and starts containers
REM ============================================================

echo ============================================================
echo Bulk Email Sender - Docker Startup
echo ============================================================

REM Default ports
set "APP_PORT_START=3000"
set "DB_PORT_START=5432"
set "REDIS_PORT_START=6379"

REM Check if ports are provided as arguments
if not "%~1"=="" set "APP_PORT_START=%~1"

REM Function to find available port
:FindAppPort
set "PORT=%APP_PORT_START%"
set "MAX_ATTEMPTS=10"
set "ATTEMPTS=0"

:CheckAppPort
set /a "ATTEMPTS+=1"
if %ATTEMPTS% gtr %MAX_ATTEMPTS% (
    echo [ERROR] Could not find available port for app after %MAX_ATTEMPTS% attempts
    exit /b 1
)

netstat -an | findstr /r ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Port %PORT% is busy, trying next...
    set /a "PORT+=1"
    goto :CheckAppPort
) else (
    set "APP_PORT=%PORT%"
    echo [OK] Using port %PORT% for app
)

REM Find available DB port
set "PORT=%DB_PORT_START%"
set "ATTEMPTS=0"

:CheckDBPort
set /a "ATTEMPTS+=1"
if %ATTEMPTS% gtr %MAX_ATTEMPTS% (
    echo [ERROR] Could not find available port for database after %MAX_ATTEMPTS% attempts
    exit /b 1
)

netstat -an | findstr /r ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Port %PORT% is busy, trying next...
    set /a "PORT+=1"
    goto :CheckDBPort
) else (
    set "DB_PORT=%PORT%"
    echo [OK] Using port %PORT% for PostgreSQL
)

REM Find available Redis port
set "PORT=%REDIS_PORT_START%"
set "ATTEMPTS=0"

:CheckRedisPort
set /a "ATTEMPTS+=1"
if %ATTEMPTS% gtr %MAX_ATTEMPTS% (
    echo [ERROR] Could not find available port for Redis after %MAX_ATTEMPTS% attempts
    exit /b 1
)

netstat -an | findstr /r ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Port %PORT% is busy, trying next...
    set /a "PORT+=1"
    goto :CheckRedisPort
) else (
    set "REDIS_PORT=%PORT%"
    echo [OK] Using port %PORT% for Redis
)

echo.
echo ============================================================
echo Starting containers with ports:
echo   App:      http://localhost:%APP_PORT%
echo   Postgres: localhost:%DB_PORT%
echo   Redis:    localhost:%REDIS_PORT%
echo ============================================================
echo.

REM Change to docker directory
cd /d "%~dp0"

REM Export environment variables and start docker-compose
set "APP_PORT=%APP_PORT%"
set "DB_PORT=%DB_PORT%"
set "REDIS_PORT=%REDIS_PORT%"

docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Containers started successfully!
    echo.
    echo   Application: http://localhost:%APP_PORT%
    echo   Database:    postgresql://postgres:postgres@localhost:%DB_PORT%/emailsender
    echo   Redis:       redis://localhost:%REDIS_PORT%
    echo.
    echo Commands:
    echo   View logs:   docker-compose logs -f
    echo   Stop:        docker-compose down
    echo   Restart:     docker-compose restart
    echo ============================================================
) else (
    echo.
    echo [ERROR] Failed to start containers
    exit /b 1
)

endlocal
