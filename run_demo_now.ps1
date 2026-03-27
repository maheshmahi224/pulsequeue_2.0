$ErrorActionPreference = "Stop"
Write-Host "Checking MongoDB..."
if (-Not (Test-Path "mongo.zip")) {
    Invoke-WebRequest -Uri "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5.zip" -OutFile "mongo.zip"
}
if (-Not (Test-Path ".\mongodb-win32-x86_64-windows-7.0.5")) {
    Write-Host "Extracting MongoDB..."
    Expand-Archive mongo.zip -DestinationPath . -Force
}
Write-Host "Starting MongoDB..."
mkdir -Force data
Start-Process -NoNewWindow -FilePath ".\mongodb-win32-x86_64-windows-7.0.5\bin\mongod.exe" -ArgumentList "--dbpath `"$PWD\data`""

Write-Host "Checking Node.js..."
if (-Not (Test-Path "node.zip")) {
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" -OutFile "node.zip"
}
if (-Not (Test-Path ".\node-v20.11.1-win-x64")) {
    Write-Host "Extracting Node.js..."
    Expand-Archive node.zip -DestinationPath . -Force
}
$env:PATH += ";$PWD\node-v20.11.1-win-x64"

Write-Host "Seeding backend data..."
cd backend
python seed_data.py
Write-Host "Starting FastAPI..."
Start-Process "powershell" -ArgumentList "-NoExit -Command `"cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`""

cd ..\patient-panel
Write-Host "Installing Patient Panel dependencies..."
npm install
Write-Host "Starting Patient Panel..."
Start-Process "powershell" -ArgumentList "-NoExit -Command `"cd patient-panel; npm run dev`""

cd ..\doctor-panel
Write-Host "Installing Doctor Panel dependencies..."
npm install
Write-Host "Starting Doctor Panel..."
Start-Process "powershell" -ArgumentList "-NoExit -Command `"cd doctor-panel; npm run dev`""

