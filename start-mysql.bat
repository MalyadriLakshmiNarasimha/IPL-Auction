@echo off
echo Starting local MySQL database for IPL Auction...
call npx tsx scripts/db-manager.ts ensure
pause

