# Git Push Script
Set-Location $PSScriptRoot

Write-Host "[1/3] Adding all files..."
git add -A

Write-Host "[2/3] Committing changes..."
git commit -m "Fix: Update GROW CRM to working version"

Write-Host "[3/3] Pushing to GitHub..."
git push -u origin master

Write-Host "Done!"
