@echo off
echo Starting Vercel deployment process...

echo.
echo Step 1: Removing node_modules from Git tracking...
git rm -r --cached node_modules 2>nul

echo.
echo Step 2: Adding all changes...
git add .

echo.
echo Step 3: Committing changes...
git commit -m "feat: Optimize for Vercel deployment - Remove node_modules, update config"

echo.
echo Step 4: Pushing to GitHub...
git push origin main

echo.
echo Step 5: Deploying to Vercel...
vercel --prod

echo.
echo Deployment complete! Check your Vercel dashboard for the live URL.
pause