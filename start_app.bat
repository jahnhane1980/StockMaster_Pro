@echo off
TITLE StockMaster Pro - Starter
echo [1/3] Pruefe Abhaengigkeiten...
if not exist "node_modules" (
    echo Installiere Module...
    call npm install
)

echo [2/3] Starte Node.js Server...
start /b node server/server.js

echo [3/3] Oeffne Browser...
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo StockMaster Pro laeuft! 
echo Schliesse dieses Fenster, um den Server zu beenden.
echo.
pause