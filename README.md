# ⚡ QuizApp

> A lightweight, zero-backend online MCQ quiz platform for academic institutions — built with pure HTML, CSS & Vanilla JavaScript.

![QuizApp](https://img.shields.io/badge/Built%20With-HTML%20%7C%20CSS%20%7C%20JS-6c63ff?style=for-the-badge)
![No Backend](https://img.shields.io/badge/Backend-None-43e8b0?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-ff6584?style=for-the-badge)

---

## 📖 Overview

QuizApp is a complete online examination system designed for university faculty. It handles everything from question upload and student invitations to real-time result tracking and automated scorecard delivery — all without a single line of server-side code.

Drop four files on any Apache or HTML server, open `index.html`, and your quiz is live in minutes.

---

## ✨ Features

### 🧑‍🏫 Faculty Panel
- Enter institute name, program, semester, academic year
- Enter subject name, subject code, duration, and total marks
- Upload questions via **paste** or **.docx Word file**
- Auto-parse questions in standard MCQ format
- Download **sample question file** and **answer key**
- Add student emails — paste, upload CSV, or add one by one
- Connect Gmail API to send automated emails
- Live dashboard with real-time student submissions
- Export results as **CSV**
- End quiz and trigger full batch report email

### 🧑‍🎓 Student Experience
- Receives personalized **invitation email** with quiz link
- Fills own Name, JLU ID, Roll Number, and Email at login
- Gets a **randomized question order** every attempt
- Sees a timer with color-coded warnings
- Submits quiz and instantly sees score on screen
- Receives a **detailed scorecard email** automatically

### 🛡️ Anti-Cheat System
| Protection | Method |
|---|---|
| Tab switch detection | `visibilitychange` API — warns, auto-submits on 3rd violation |
| Fullscreen enforcement | Fullscreen API — exit triggers warning |
| Copy / Paste blocked | `oncopy`, `onpaste`, `oncut` event prevention |
| Right-click disabled | `contextmenu` event blocked |
| Keyboard shortcuts blocked | F12, Ctrl+U, Ctrl+C, Ctrl+Shift+I, etc. |
| Window blur detection | `window.blur` event tracking |

### 📧 Email System (Gmail API)
| Email | Trigger | Content |
|---|---|---|
| Invitation | On quiz launch | Institute, program, semester, subject, quiz link, duration, instructions |
| Student Scorecard | On each submission | Score, accuracy, time taken, tab switches, Q&A breakdown |
| Faculty Copy | On each submission | Same scorecard as student |
| Full Batch Report | On "End Quiz" | Summary table + detailed breakdown of every student |

---

## 📁 File Structure

```
quiz-app/
│
├── index.html      → Faculty panel (setup wizard + live dashboard)
├── quiz.html       → Student login + quiz + results screen
├── style.css       → All styling (dark theme, responsive)
└── app.js          → All logic (parser, sessions, evaluator, email)
```

> **That's it. Four files. No Node.js. No database. No backend.**

---

## 🚀 Getting Started

### 1. Deploy
```
Drop all four files into your Apache server's public folder
e.g. /var/www/html/quiz-app/
```

### 2. Open Faculty Panel
```
http://yourserver.com/quiz-app/index.html
```

### 3. Setup (5 Steps)
| Step | Action |
|---|---|
| 1 | Enter institute, program, semester, subject, faculty details |
| 2 | Paste or upload questions in MCQ format |
| 3 | Add student emails (paste / CSV / one by one) |
| 4 | Connect Gmail API and enter quiz URL |
| 5 | Launch — invitations sent automatically |

### 4. Students
```
Students receive email → click quiz link → fill credentials → take quiz → get scorecard
```

---

## ❓ Question Format

Questions must follow this format — one per block:

```
Q1. What is the time complexity of Binary Search?
A) O(n)  B) O(log n)  C) O(1)  D) O(n^2)
Ans: B

Q2. Which data structure follows LIFO order?
A) Queue  B) Array  C) Stack  D) Linked List
Ans: C
```

Both **pasted text** and **.docx Word files** are supported and auto-parsed.

---

## 👥 Student List Format

Just paste emails — one per line. That's all.

```
rahul@gmail.com
priya@jlu.edu.in
amit@student.jlu.edu.in
```

Or upload a `.csv` or `.txt` file — QuizApp automatically extracts any valid email address from the file regardless of format.

---

## 📧 Gmail API Setup

QuizApp uses Gmail API (OAuth 2.0 implicit flow) to send emails directly from the browser.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Gmail API**
3. Create **OAuth 2.0 credentials** → Web Application
4. Add your server domain to **Authorized JavaScript Origins**
5. Copy the **Client ID** and paste it in Step 4 of the faculty panel
6. Click **Sign in with Google** → authorize → done

> Gmail API is optional. The quiz works fully without it — faculty can share the quiz URL manually.

---

## 📊 Results & Reporting

### Live Dashboard
- Real-time table updates as students submit
- Shows: Name, JLU ID, Roll No., Email, Marks, Accuracy %, Time Taken, Tab Switches
- Sortable by score or name
- Export to CSV anytime

### Student Scorecard Email
```
Subject: Scorecard — Data Structures (CS301) | Rahul Sharma

Score: 18/20  |  Accuracy: 90%  |  Time: 12:34  |  Tab Switches: 0

Q1. What is... → Your Answer: B ✅
Q2. Which of... → Your Answer: A | Correct: C ❌
...
```

### Faculty Batch Report Email
Sent when faculty clicks **End Quiz**:
- Summary table: Name, JLU ID, Roll No., Email, Marks, Accuracy
- Detailed per-student Q&A breakdown
- Class average, top scorer

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Document Parsing | [Mammoth.js](https://github.com/mwilliamson/mammoth.js) (CDN) |
| Email | Gmail API (OAuth 2.0, browser-side) |
| Hosting | Any static file server (Apache, Nginx, Netlify, etc.) |
| Backend | ❌ None |
| Database | ❌ None |
| Framework | ❌ None |

---

## ⚠️ Limitations

- **Session-based only** — results live in browser memory. If faculty refreshes `index.html`, session data resets. Keep the tab open for the duration of the exam.
- **Same-device sessions** — `sessionStorage` is shared between `index.html` and `quiz.html` only on the same browser/device. Works perfectly for network-hosted deployments.
- **Gmail API** requires Google Cloud Console setup. Without it, the quiz still works but emails are not sent.
- **Not suitable for large-scale exams** (500+ students) without a proper backend.

---

## 📌 Recommended Use Case

```
Small to medium university quizzes
Classroom MCQ tests (20–100 students)
Internal assessments and unit tests
Semester quiz sessions
```

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙌 Built With

Made with ❤️ using zero dependencies — just the web platform.

```
HTML + CSS + JavaScript
= A complete exam system
```
