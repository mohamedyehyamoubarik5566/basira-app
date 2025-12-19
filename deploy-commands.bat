@echo off
echo 🚀 رفع مشروع Basira ERP على GitHub...
echo.

cd /d "d:\basira-app"

echo ✅ تهيئة Git...
git init

echo ✅ إضافة الملفات...
git add .

echo ✅ إنشاء Commit...
git commit -m "Initial commit: Basira ERP System v2.0 - Ready for production"

echo ✅ ربط بـ GitHub...
git remote add origin https://github.com/mohamedyehyamoubarik5566/basira-app.git

echo ✅ رفع الملفات...
git branch -M main
git push -u origin main

echo.
echo 🎉 تم رفع المشروع بنجاح!
echo 🌐 رابط المشروع: https://github.com/mohamedyehyamoubarik5566/basira-app
echo.
echo 📋 الخطوة التالية: ربط مع Vercel للنشر
echo 1. اذهب إلى vercel.com
echo 2. سجل دخول بـ GitHub
echo 3. اختر repository: basira-app
echo 4. اضغط Deploy
echo.
pause