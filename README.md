# CTS-1800

This repository contains a small demo site for KidCode — a sample children's coding site used for exercises.

Included pages (main branch):

- index.html — Home
- lessons.html — Lessons & Tutoring (with FAQ)
- join-us.html — Join Us / About & Contact (merged contact form)
- games.html — Games
- parent-zone.html — Parents & Teachers
- booking.html — Book a Tutor (prototype calendar booking UI)
- admin-bookings.html — Admin view (reads demo bookings from browser localStorage)
- gallery.html — Gallery
- privacy.html — Privacy Policy
- services.html — Legacy redirect → lessons.html
- about.html — Legacy redirect → join-us.html
- contact.html — Legacy redirect → join-us.html
- css/style.css
- js/main.js — global helpers and mock form handler (saves demo submissions to localStorage)
- js/calendar.js — booking calendar prototype (saves demo bookings to localStorage)

How to test locally

1. Start a static server in the repo root (recommended):
   - Python 3: `python -m http.server 8000`
2. Open the pages in a browser:
   - Home: http://localhost:8000/index.html
   - Book a demo tutor: http://localhost:8000/booking.html
   - Admin bookings: http://localhost:8000/admin-bookings.html

Notes

- The booking/calendar is a client-side prototype. Bookings and demo submissions are saved to your browser's localStorage only (keys: `kidcode_demo_submissions`, `kidcode_bookings`).
- Use Shift+S to open demo submissions and Shift+B to open the bookings admin (if popups allowed).
- If you want me to wire bookings to a server or a form service (Netlify Forms, Formspree) I can add that next.
