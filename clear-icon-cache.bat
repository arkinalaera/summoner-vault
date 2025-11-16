@echo off
echo Nettoyage du cache d'icones Windows...
echo.

:: Arreter l'explorateur Windows
taskkill /f /im explorer.exe

:: Attendre un peu
timeout /t 2 /nobreak >nul

:: Supprimer le cache d'icones
del /f /s /q /a %localappdata%\IconCache.db >nul 2>&1
del /f /s /q /a %localappdata%\Microsoft\Windows\Explorer\iconcache*.db >nul 2>&1
del /f /s /q /a %localappdata%\Microsoft\Windows\Explorer\thumbcache*.db >nul 2>&1

echo Cache d'icones supprime!
echo.

:: Redemarrer l'explorateur
start explorer.exe

echo Explorateur Windows redemarre.
echo.
echo Les icones devraient maintenant etre a jour!
pause
