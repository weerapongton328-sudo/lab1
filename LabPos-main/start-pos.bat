@echo off
echo Starting POS Server (Node.js)...
start "POS Server" cmd /c "npm run start"

echo Waiting 5 seconds for the server to be ready...
timeout /t 5 /nobreak >nul

echo Starting POS Interface (Google Chrome)...
start "" "C:\Program Files\Google\Chrome\Application\chrome_proxy.exe" --profile-directory=Default --app-id=hbblfifohofgngfbjbiimbbcimepbdcb --kiosk-printing

echo POS System started successfully!
