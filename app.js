// ═══════════════════════════════════════════════════════════
//  QuizApp — app.js
//  Pure Vanilla JS. No frameworks. No backend.
// ═══════════════════════════════════════════════════════════

const QuizApp = (() => {

  // ─── STATE ───────────────────────────────────────────────
  const state = {
    // Faculty config
    faculty: {
      subjectName: '',
      subjectCode: '',
      facultyName: '',
      facultyEmail: '',
      duration: 30, // minutes
      totalMarks: 0,
      gmailAccessToken: null,
    },
    // Raw + parsed questions
    questions: [],
    // All student sessions keyed by studentId
    sessions: {},
    // Quiz status
    quizLive: false,
    quizEnded: false,
  };

  // ─── QUESTION PARSER ─────────────────────────────────────
  const Parser = {
    parse(text) {
      const questions = [];
      // Split on Q followed by number and dot/paren
      const blocks = text.trim().split(/\n(?=Q\d+[\.\)])/i);
      for (const block of blocks) {
        const q = Parser.parseBlock(block.trim());
        if (q) questions.push(q);
      }
      return questions;
    },

    parseBlock(block) {
      if (!block) return null;
      // Extract question text
      const qMatch = block.match(/^Q\d+[\.\)]\s*(.+?)(?=\n|A\)|\(A\))/is);
      if (!qMatch) return null;
      const questionText = qMatch[1].trim();

      // Extract options — support "A) text", "(A) text"
      const optRegex = /[(\s]?([A-D])[\)]\s*(.+?)(?=\s*[(\s]?[B-D][\)]|Ans:|Answer:|$)/gis;
      const options = {};
      let m;
      const cleanBlock = block.replace(/\n/g, ' ');
      while ((m = optRegex.exec(cleanBlock)) !== null) {
        options[m[1].toUpperCase()] = m[2].trim();
      }

      // Extract answer
      const ansMatch = block.match(/Ans(?:wer)?\s*:\s*([A-D])/i);
      if (!ansMatch) return null;
      const answer = ansMatch[1].toUpperCase();

      if (!options[answer]) return null;
      if (Object.keys(options).length < 2) return null;

      return { questionText, options, answer };
    },
  };

  // ─── SESSION MANAGER ─────────────────────────────────────
  const Sessions = {
    create(studentData) {
      const id = `${studentData.jluId}_${Date.now()}`;
      const shuffled = Sessions.shuffle([...state.questions]).map(q => ({
        ...q,
        optionsShuffled: Sessions.shuffleOptions(q),
      }));
      const session = {
        id,
        ...studentData,
        questions: shuffled,
        answers: {},
        startTime: Date.now(),
        endTime: null,
        tabSwitches: 0,
        copyAttempts: 0,
        submitted: false,
        score: 0,
        accuracy: 0,
      };
      state.sessions[id] = session;
      return session;
    },

    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    shuffleOptions(q) {
      const keys = Object.keys(q.options);
      for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      return keys;
    },

    evaluate(sessionId) {
      const s = state.sessions[sessionId];
      let correct = 0;
      s.questions.forEach(q => {
        if (s.answers[q.questionText] === q.answer) correct++;
      });
      s.score = correct;
      s.accuracy = Math.round((correct / s.questions.length) * 100);
      s.endTime = Date.now();
      s.submitted = true;
      return s;
    },

    getTimeTaken(session) {
      const ms = (session.endTime || Date.now()) - session.startTime;
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}m ${secs}s`;
    },
  };

  // ─── SAMPLE FILE GENERATOR ───────────────────────────────
  const Samples = {
    questionText: `Q1. What is the capital of India?
A) Mumbai  B) Delhi  C) Chennai  D) Kolkata
Ans: B

Q2. Which planet is closest to the Sun?
A) Earth  B) Mars  C) Mercury  D) Venus
Ans: C

Q3. What does CPU stand for?
A) Central Process Unit  B) Central Processing Unit  C) Computer Personal Unit  D) Core Processing Unit
Ans: B

Q4. Which data structure uses LIFO order?
A) Queue  B) Array  C) Stack  D) Linked List
Ans: C

Q5. What is the value of Pi (approx)?
A) 2.14  B) 3.14  C) 4.13  D) 1.41
Ans: B`,

    answerKeyText(questions, subjectName, subjectCode) {
      let text = `ANSWER KEY\n`;
      text += `Subject: ${subjectName || 'N/A'} | Code: ${subjectCode || 'N/A'}\n`;
      text += `Total Questions: ${questions.length}\n`;
      text += `${'─'.repeat(50)}\n\n`;
      questions.forEach((q, i) => {
        text += `Q${i + 1}. ${q.questionText}\n`;
        Object.entries(q.options).forEach(([k, v]) => {
          text += `     ${k}) ${v}${k === q.answer ? '  ✓ CORRECT' : ''}\n`;
        });
        text += `Answer: ${q.answer}) ${q.options[q.answer]}\n\n`;
      });
      return text;
    },

    downloadTxt(content, filename) {
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    },
  };

  // ─── EMAIL via Gmail API ──────────────────────────────────
  const Email = {
    // Build student scorecard HTML
    buildStudentEmail(session) {
      const timeTaken = Sessions.getTimeTaken(session);
      const totalQ = session.questions.length;
      const maxMarks = state.faculty.totalMarks || totalQ;

      let questionsHtml = '';
      session.questions.forEach((q, i) => {
        const chosen = session.answers[q.questionText] || 'Not Answered';
        const isCorrect = chosen === q.answer;
        questionsHtml += `
          <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
            <td style="padding:10px;border:1px solid #e0e0e0;font-size:13px;">${i + 1}. ${q.questionText}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;font-weight:600;color:${isCorrect ? '#22c55e' : '#ef4444'}">
              ${chosen !== 'Not Answered' ? chosen + ') ' + (q.options[chosen] || '') : 'Not Answered'}
            </td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;color:#22c55e;font-weight:600">
              ${q.answer}) ${q.options[q.answer]}
            </td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;font-size:18px">${isCorrect ? '✅' : '❌'}</td>
          </tr>`;
      });

      return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#f5f5f5;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#6c63ff,#43e8b0);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">Quiz Scorecard</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${state.faculty.subjectName} — ${state.faculty.subjectCode}</p>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:8px 0;color:#666;font-size:14px">Student Name</td><td style="padding:8px 0;font-weight:600">${session.name}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:14px">JLU ID</td><td style="padding:8px 0;font-weight:600">${session.jluId}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:14px">Roll Number</td><td style="padding:8px 0;font-weight:600">${session.rollNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:14px">Email</td><td style="padding:8px 0;font-weight:600">${session.email}</td></tr>
      <tr><td style="padding:8px 0;color:#666;font-size:14px">Subject</td><td style="padding:8px 0;font-weight:600">${state.faculty.subjectName} (${state.faculty.subjectCode})</td></tr>
    </table>
    <div style="display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:#f0f0ff;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#6c63ff">${session.score}/${totalQ}</div>
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.1em">Score</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fff8;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#22c55e">${session.accuracy}%</div>
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.1em">Accuracy</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fff8f0;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#f59e0b">${Sessions.getTimeTaken(session)}</div>
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.1em">Time Taken</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fff0f0;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#ef4444">${session.tabSwitches}</div>
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.1em">Tab Switches</div>
      </div>
    </div>
    <h3 style="margin-bottom:12px;color:#333">Detailed Answer Review</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#6c63ff;color:#fff">
          <th style="padding:12px;border:1px solid #e0e0e0;text-align:left">Question</th>
          <th style="padding:12px;border:1px solid #e0e0e0">Your Answer</th>
          <th style="padding:12px;border:1px solid #e0e0e0">Correct Answer</th>
          <th style="padding:12px;border:1px solid #e0e0e0">Result</th>
        </tr>
      </thead>
      <tbody>${questionsHtml}</tbody>
    </table>
  </div>
  <div style="background:#f9f9f9;padding:16px 28px;font-size:12px;color:#999;text-align:center">
    This is an auto-generated scorecard. — ${state.faculty.subjectName} | ${state.faculty.facultyName}
  </div>
</div></body></html>`;
    },

    // Build faculty summary email (all students table + detailed breakdown)
    buildFacultySummaryEmail() {
      const sessions = Object.values(state.sessions).filter(s => s.submitted);
      const sorted = [...sessions].sort((a, b) => b.score - a.score);
      const totalQ = state.questions.length;
      const avgScore = sessions.length ? (sessions.reduce((s, x) => s + x.score, 0) / sessions.length).toFixed(1) : 0;

      let summaryRows = '';
      sorted.forEach((s, i) => {
        summaryRows += `
          <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
            <td style="padding:10px;border:1px solid #e0e0e0">${i + 1}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;font-weight:600">${s.name}</td>
            <td style="padding:10px;border:1px solid #e0e0e0">${s.jluId}</td>
            <td style="padding:10px;border:1px solid #e0e0e0">${s.rollNumber}</td>
            <td style="padding:10px;border:1px solid #e0e0e0">${s.email}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;font-weight:700;color:#6c63ff">${s.score}/${totalQ}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center">${s.accuracy}%</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center">${Sessions.getTimeTaken(s)}</td>
            <td style="padding:10px;border:1px solid #e0e0e0;text-align:center;color:${s.tabSwitches > 0 ? '#ef4444' : '#22c55e'}">${s.tabSwitches}</td>
          </tr>`;
      });

      // Per-student detailed breakdown
      let detailedBreakdown = '';
      sorted.forEach((s, idx) => {
        let qRows = '';
        s.questions.forEach((q, i) => {
          const chosen = s.answers[q.questionText] || 'Not Answered';
          const isCorrect = chosen === q.answer;
          qRows += `<tr style="background:${i%2===0?'#f9f9f9':'#fff'}">
            <td style="padding:8px;border:1px solid #e0e0e0;font-size:12px">${i+1}. ${q.questionText}</td>
            <td style="padding:8px;border:1px solid #e0e0e0;text-align:center;font-size:12px;color:${isCorrect?'#22c55e':'#ef4444'}">${chosen !== 'Not Answered' ? chosen+') '+(q.options[chosen]||'') : 'Not Answered'}</td>
            <td style="padding:8px;border:1px solid #e0e0e0;text-align:center;font-size:12px;color:#22c55e">${q.answer}) ${q.options[q.answer]}</td>
            <td style="padding:8px;border:1px solid #e0e0e0;text-align:center">${isCorrect?'✅':'❌'}</td>
          </tr>`;
        });
        detailedBreakdown += `
          <div style="margin-bottom:24px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
            <div style="background:${idx===0?'#6c63ff':'#f0f0f0'};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;color:${idx===0?'#fff':'#333'}">#${idx+1} ${s.name} — ${s.jluId} | Roll: ${s.rollNumber}</span>
              <span style="font-weight:800;font-size:18px;color:${idx===0?'#fff':'#6c63ff'}">${s.score}/${totalQ} (${s.accuracy}%)</span>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#eee">
                <th style="padding:8px;border:1px solid #e0e0e0;font-size:12px;text-align:left">Question</th>
                <th style="padding:8px;border:1px solid #e0e0e0;font-size:12px">Student Answer</th>
                <th style="padding:8px;border:1px solid #e0e0e0;font-size:12px">Correct Answer</th>
                <th style="padding:8px;border:1px solid #e0e0e0;font-size:12px">Result</th>
              </tr></thead>
              <tbody>${qRows}</tbody>
            </table>
          </div>`;
      });

      return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#f5f5f5">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#6c63ff,#43e8b0);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">Full Quiz Report</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${state.faculty.subjectName} — ${state.faculty.subjectCode}</p>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:14px">Faculty: ${state.faculty.facultyName} | Total Students: ${sessions.length}</p>
  </div>
  <div style="padding:28px">
    <div style="display:flex;gap:16px;margin-bottom:28px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:#f0f0ff;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#6c63ff">${sessions.length}</div>
        <div style="font-size:12px;color:#666">Total Students</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fff8;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#22c55e">${avgScore}/${totalQ}</div>
        <div style="font-size:12px;color:#666">Class Average</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fff8f0;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:#f59e0b">${sorted[0]?.name?.split(' ')[0] || 'N/A'}</div>
        <div style="font-size:12px;color:#666">Top Scorer</div>
      </div>
    </div>
    <h3 style="margin-bottom:12px">Summary Table</h3>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      <thead><tr style="background:#6c63ff;color:#fff">
        <th style="padding:12px;border:1px solid #e0e0e0">#</th>
        <th style="padding:12px;border:1px solid #e0e0e0;text-align:left">Name</th>
        <th style="padding:12px;border:1px solid #e0e0e0">JLU ID</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Roll No.</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Email</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Marks</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Accuracy</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Time</th>
        <th style="padding:12px;border:1px solid #e0e0e0">Tab Switches</th>
      </tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
    </div>
    <h3 style="margin-bottom:16px">Detailed Per-Student Breakdown</h3>
    ${detailedBreakdown}
  </div>
  <div style="background:#f9f9f9;padding:16px 28px;font-size:12px;color:#999;text-align:center">
    Auto-generated by QuizApp — ${state.faculty.subjectName} | ${state.faculty.facultyName}
  </div>
</div></body></html>`;
    },

    // Build invitation email HTML
    buildInvitationEmail(student) {
      const f = state.faculty;
      const quizUrl = f.quizUrl || '#';
      return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#6c63ff,#43e8b0);padding:36px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">📝</div>
    <h1 style="color:#fff;margin:0;font-size:26px">Quiz Invitation</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:15px">${f.subjectName} — ${f.subjectCode}</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;color:#333;margin-bottom:20px">Dear Student,</p>
    <p style="color:#555;line-height:1.7;margin-bottom:24px">
      You have been invited to take an online quiz by <strong>${f.facultyName}</strong>.
    </p>

    <!-- Institute info -->
    <div style="background:#f8f8ff;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#666;font-size:13px;width:40%">🏛️ Institute</td><td style="padding:5px 0;font-size:13px;font-weight:600">${f.instituteName||'—'}</td></tr>
        <tr><td style="padding:5px 0;color:#666;font-size:13px">🎓 Program</td><td style="padding:5px 0;font-size:13px;font-weight:600">${f.programName||'—'}</td></tr>
        <tr><td style="padding:5px 0;color:#666;font-size:13px">📅 Semester</td><td style="padding:5px 0;font-size:13px;font-weight:600">${f.semester||'—'}${f.academicYear?' ('+f.academicYear+')':''}</td></tr>
        <tr><td style="padding:5px 0;color:#666;font-size:13px">📚 Subject</td><td style="padding:5px 0;font-size:13px;font-weight:600">${f.subjectName} (${f.subjectCode})</td></tr>
        <tr><td style="padding:5px 0;color:#666;font-size:13px">👨‍🏫 Faculty</td><td style="padding:5px 0;font-size:13px;font-weight:600">${f.facultyName}</td></tr>
      </table>
    </div>

    <!-- Quiz details + CTA -->
    <div style="background:#f0f8ff;border:2px solid #6c63ff;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center">
      <div style="display:flex;justify-content:center;gap:24px;margin-bottom:16px;flex-wrap:wrap">
        <div><div style="font-size:22px;font-weight:800;color:#6c63ff">${state.questions.length}</div><div style="font-size:11px;color:#888;text-transform:uppercase">Questions</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#6c63ff">${f.duration} min</div><div style="font-size:11px;color:#888;text-transform:uppercase">Duration</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#6c63ff">${f.totalMarks}</div><div style="font-size:11px;color:#888;text-transform:uppercase">Total Marks</div></div>
      </div>
      <a href="${quizUrl}" style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.02em">
        🚀 Open Quiz
      </a>
      <p style="color:#999;font-size:11px;margin:10px 0 0;word-break:break-all">${quizUrl}</p>
    </div>

    ${f.instructions?`<div style="background:#fff8e1;border-left:4px solid #ffd166;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px"><strong style="color:#b45309">📌 Instructions:</strong><br><span style="color:#555;font-size:14px;line-height:1.6">${f.instructions}</span></div>`:''}

    <div style="background:#f0fff8;border:1px solid #86efac;border-radius:8px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;color:#166534;font-size:13px;line-height:1.8">
        ✅ On the quiz page, enter your <strong>Name, JLU ID, Roll Number, and this Email</strong> to begin.<br>
        📧 Your scorecard will be emailed to you automatically after submission.
      </p>
    </div>

    <p style="color:#555;font-size:14px">Best of luck! 🍀</p>
    <p style="color:#333;font-weight:700;margin:4px 0">${f.facultyName}</p>
    <p style="color:#999;font-size:12px;margin:0">${f.subjectName} | ${f.subjectCode} | ${f.instituteName||''}</p>
  </div>
  <div style="background:#f9f9f9;padding:14px 28px;font-size:11px;color:#aaa;text-align:center">
    Sent via QuizApp. Do not share this link with others.
  </div>
</div></body></html>`;
    },

    // Encode email for Gmail API
    encodeEmail(to, subject, htmlBody) {
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
      ].join('\r\n');
      return btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    async send(to, subject, htmlBody) {
      if (!state.faculty.gmailAccessToken) {
        console.warn('No Gmail token. Email not sent.');
        return false;
      }
      try {
        const raw = Email.encodeEmail(to, subject, htmlBody);
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.faculty.gmailAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        });
        return res.ok;
      } catch (e) {
        console.error('Email send error:', e);
        return false;
      }
    },

    async sendStudentScorecard(session) {
      const html = Email.buildStudentEmail(session);
      const subject = `Scorecard: ${state.faculty.subjectName} (${state.faculty.subjectCode}) — ${session.name}`;
      // Send to student
      await Email.send(session.email, subject, html);
      // Send copy to faculty
      await Email.send(state.faculty.facultyEmail,
        `[Student Result] ${session.name} | ${session.jluId} — ${state.faculty.subjectName}`, html);
    },

    async sendFacultySummary() {
      if (!state.faculty.facultyEmail) return;
      const html = Email.buildFacultySummaryEmail();
      const subject = `[Full Report] ${state.faculty.subjectName} (${state.faculty.subjectCode}) — ${Object.values(state.sessions).filter(s=>s.submitted).length} Students`;
      await Email.send(state.faculty.facultyEmail, subject, html);
    },
  };

  // ─── DOCX PARSER (via mammoth CDN) ───────────────────────
  const DocxParser = {
    async extractText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (typeof mammoth === 'undefined') {
              reject(new Error('mammoth not loaded'));
              return;
            }
            const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
            resolve(result.value);
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    },
  };

  // ─── PUBLIC API ──────────────────────────────────────────
  return {
    state,
    Parser,
    Sessions,
    Samples,
    Email,
    DocxParser,
  };
})();
