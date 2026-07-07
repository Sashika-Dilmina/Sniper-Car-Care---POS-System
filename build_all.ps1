Set-Location -Path "c:\Projects\Sniper-Car-Care---POS-System"

Write-Host "Building POS frontend..."
Set-Location -Path "c:\Projects\Sniper-Car-Care---POS-System\frontend"
npm run build
tar -czvf ../frontend.tar.gz -C dist .

Write-Host "Building Saloon site..."
Set-Location -Path "c:\Projects\Sniper-Car-Care---POS-System\customer-website-saloon"
npm run build
tar -czvf ../saloon.tar.gz -C dist .

Write-Host "Building 4x4 site..."
Set-Location -Path "c:\Projects\Sniper-Car-Care---POS-System\customer-website-4x4"
npm run build
tar -czvf ../4x4.tar.gz -C dist .

Write-Host "All frontend builds complete."
