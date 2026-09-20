# TowelWorks

Offline mill book for towel overlock production: workers, 11 machines, attendance, production (nearest-500 rounding), Saturday–Friday payroll, cash ledger, Excel export, and Hindi / Roman Urdu voice commands.

## Install the Android APK

1. Open **Actions** on this repo.
2. Open the latest **Build Android APK** run.
3. Download the **TowelWorks-APK** artifact.
4. Unzip it and install `app-debug.apk` on the phone (allow install from this source).
5. Floor PIN for the demo mill: **1234**.

You can also tap **Actions → Build Android APK → Run workflow** to rebuild.

## What is inside

- 11 overlock machines, permanent + outside workers
- Tailor Rs.25 / Helper Rs.15 per 100 pieces (historical rates stay on old production)
- Quantity rounded to nearest 500
- Cash (advance, loan, deduction, return, Saturday settlement) kept separate from production pay
- Backup / restore as a local JSON file — no internet required

Voice examples: `Imran hazir hai` · `machine 3 par 2500 piece` · `Asif ko 2000 advance`
