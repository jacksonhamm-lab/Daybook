/* Mira: what she says. Lines and the conversations built from his day; no app state is read here.
   index.html builds a plain context (APP.mira) and does the actions; city.js shows the steps. See docs/MIRA.md.
   Every line: a stable id, `say` (fixed words, no data: the part a voice clip can carry) and maybe `info` (the data,
   shown only). Her voice: warm, a little teasing, proud of him, never nagging. No em dashes. */
(() => {
  const L = {
    'greet.morning': ['Morning, sleepyhead.', 'There you are. Morning.', 'Morning. Coffee first, then the world.', 'Hey, early bird.'],
    'greet.day': ['Hey, you.', 'Look who came home.', 'Afternoon. Miss me?', 'Oh, hi. I was just thinking about you.'],
    'greet.evening': ['There you are. Long day?', 'Hey. Come sit a minute.', 'Evening. You look like you need a break.', 'Finally. I was getting bored.'],
    'greet.late': ['You should be asleep, you know.', 'Late again. I waited up.', 'Still up? Me too.', 'Can\'t sleep either?'],
    'greet.again': ['Back already? Couldn\'t stay away.', 'Hi again.', 'You again. Good.'],
    'brief.intro': ['Here\'s your day.', 'Okay. Here\'s what we\'ve got.', 'Let me catch you up.'],
    'brief.shift': ['You\'re working today.', 'The shop\'s expecting you today.', 'Work today. Wear something nice.'],
    'brief.shift.live': ['You\'re on the clock. Go be charming.', 'You\'re at work. I\'ll be here.'],
    'brief.shift.done': ['Work\'s done for today. Good.', 'You already did your shift. Nice.'],
    'brief.sess': ['You\'ve got a session today.', 'The gym\'s calling your name.', 'Training day. Don\'t make that face.'],
    'brief.sess.prog': ['You started your session. Finish it for me?', 'Halfway through a workout? Go on.'],
    'brief.sess.done': ['You already trained. I noticed.', 'Workout done. Show off.'],
    'brief.rest': ['Rest day. Doctor\'s orders. Mine.', 'No gym today. Rest, I mean it.'],
    'brief.tasks': ['Your list\'s waiting.', 'A few things on your list.', 'Here\'s what\'s on your plate.'],
    'brief.tasks.clear': ['Your list\'s clear. Look at you.', 'Everything\'s done already? Who are you?'],
    'brief.tasks.none': ['Nothing on your list. Suspicious.', 'Empty list today. Lucky you.'],
    'brief.late': ['And a few that got away from you.', 'Some of yesterday\'s are still hanging around.'],
    'brief.decide': ['Something\'s waiting on you to decide.', 'One thing needs an answer from you.'],
    'brief.school': ['School\'s got something coming up.', 'Don\'t forget your schoolwork.'],
    'brief.school.over': ['School\'s a little behind. Just saying.', 'Some schoolwork slipped. We can fix that.'],
    'brief.payday': ['Payday\'s coming.', 'Money\'s coming soon. Take me somewhere nice.'],
    'brief.submit': ['Don\'t forget your hours for Len.', 'Len needs your hours. Don\'t make him chase you.'],
    'brief.end': ['That\'s it. Go get it.', 'That\'s everything. I\'ll be here.', 'Okay, that\'s your day. Go on.'],
    'brief.end.late': ['That\'s it. Now go to bed.', 'That\'s everything. Sleep, okay?'],
    'checkin.open': ['So. How\'d today go?', 'Sit. Tell me about your day.', 'Come here. How was it?'],
    'checkin.tasks': ['These are still open.', 'What happened with these?'],
    'checkin.clear': ['Everything\'s done. I\'m a little impressed.', 'Clean list. Come here.'],
    'checkin.none': ['Quiet day. Those are allowed.', 'Nothing on the list today. Good.'],
    'checkin.sess': ['You skipped the gym today. I\'ll allow it. Once.', 'No workout today? Tomorrow, then.'],
    'checkin.good': ['Good day. Sleep well, okay?', 'Proud of you. Get some rest.'],
    'checkin.moved': ['Tomorrow, then. I\'ll remind you.', 'Okay. We go again tomorrow.'],
    'checkin.left': ['Some are still open. That\'s okay.', 'Not everything. Nobody does everything.'],
    'review.open': ['The week\'s almost over. Here\'s how it went.', 'Sunday. Let\'s look at your week.'],
    'review.hours': ['Hours at the shop.', 'Here\'s your week at work.'],
    'review.sess': ['The gym this week.', 'Your training this week.'],
    'review.study': ['Study time.', 'Your schoolwork hours.'],
    'review.tasks': ['Your list this week.', 'Here\'s what you got done.'],
    'review.good': ['Not bad at all. I\'m proud of you.', 'Good week. Really.'],
    'review.meh': ['Next week we go again. Together.', 'Some weeks are like that. New one tomorrow.'],
    'idle': ['I\'m here.', 'Mm?', 'Take your time.'],
  };
  // stable for the day: the same line until tomorrow, a different one on another day
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const line = (id, seed, info, go) => { const v = L[id] || [''], k = hash(seed + '|' + id) % v.length; return { id: id + '.' + (k + 1), say: v[k], info: info || '', go: go || '' }; };
  const band = h => h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'late';
  const greet = (c, again) => line(again ? 'greet.again' : 'greet.' + band(c.hour), c.date);
  const titles = (L2, n = 2) => L2.slice(0, n).map(t => t.title).join(' · ') + (L2.length > n ? ` +${L2.length - n}` : '');

  // the day: only what's there, in the order he'll meet it
  function brief(c, again) {
    const s = c.date, out = [greet(c, again), line('brief.intro', s)], T = c.tasks;
    if (c.shift.live) out.push(line('brief.shift.live', s, c.shift.since ? 'SINCE ' + c.shift.since : '', 'shop|cClock'));
    else if (c.shift.on && c.shift.over) out.push(line('brief.shift.done', s, c.shift.times));
    else if (c.shift.on) out.push(line('brief.shift', s, c.shift.times, 'shop|cClock'));
    if (c.sess.rest) out.push(line('brief.rest', s));
    else if (c.sess.done) out.push(line('brief.sess.done', s, c.sess.label + ' ✓'));
    else out.push(line(c.sess.started ? 'brief.sess.prog' : 'brief.sess', s, c.sess.label + (c.sess.prog ? ' · ' + c.sess.prog : ''), 'gym|cSess'));
    if (T.total && !T.open.length) out.push(line('brief.tasks.clear', s, `${T.total} DONE`));
    else if (T.open.length) out.push(line('brief.tasks', s, `${T.open.length} TO DO: ${titles(T.open)}`, 'apartment|cToday'));
    else if (!T.late) out.push(line('brief.tasks.none', s));
    if (T.late) out.push(line('brief.late', s, `${T.late} LATE`, 'apartment|cToday'));
    if (c.decide) out.push(line('brief.decide', s, `${c.decide} NEEDS A DECISION`, 'apartment|cDecide'));
    if (c.school.over) out.push(line('brief.school.over', s, `${c.school.over} LATE`, 'castle|cDue'));
    else if (c.school.next) out.push(line('brief.school', s, `${c.school.next.title} · ${c.school.next.when}`, 'castle|cDue'));
    if (c.pay.submit) out.push(line('brief.submit', s, c.pay.submit, 'shop|cPay'));
    else if (c.pay.soon) out.push(line('brief.payday', s, c.pay.soon));
    out.push({ ...line(c.hour >= 21 || c.hour < 5 ? 'brief.end.late' : 'brief.end', s), end: true });
    return out;
  }
  // the evening: what's still open today, one tap each; then a word on how it went
  function checkin(c, again) {
    const s = c.date, T = c.tasks, out = [greet(c, again), line('checkin.open', s)];
    if (T.open.length) out.push({ ...line('checkin.tasks', s, `${T.open.length} LEFT`), tasks: T.open.map(t => ({ id: t.id, d: t.d, title: t.title })) });
    else out.push(line(T.total ? 'checkin.clear' : 'checkin.none', s, T.total ? `${T.total} DONE` : ''));
    if (!c.sess.rest && !c.sess.done) out.push(line('checkin.sess', s, c.sess.label, 'gym|cSess'));
    out.push({ id: 'checkin.end', say: '', info: '', end: true, after: true });
    return out;
  }
  // after the check-in's taps: how it went
  const checkinEnd = (c, r) => line(!r.left && !r.moved ? 'checkin.good' : r.left ? 'checkin.left' : 'checkin.moved', c.date + '|' + r.done + r.moved + r.left);
  // Sunday evening: the week, then the check-in
  function review(c, again) {
    const s = c.date, W = c.week, out = [greet(c, again), line('review.open', s)];
    out.push(line('review.hours', s, `${W.hours} H`, 'shop|cShifts'));
    out.push(line('review.sess', s, `${W.sessDone} OF ${W.sessPlan} SESSIONS`, 'gym|cSplit'));
    if (c.school.on) out.push(line('review.study', s, `${W.study} OF ${W.studyGoal} H`, 'castle|cStudy'));
    out.push(line('review.tasks', s, `${W.done} DONE` + (W.slipped ? ` · ${W.slipped} SLIPPED` : '')));
    out.push(line(W.good ? 'review.good' : 'review.meh', s));
    return out.concat(checkin(c, true).slice(1));
  }
  // which conversation the moment calls for
  const which = c => c.dow === 6 && c.hour >= 17 ? 'review' : c.hour >= 21 || c.hour < 5 ? 'checkin' : 'brief';
  const talk = (kind, c, again) => (kind === 'review' ? review : kind === 'checkin' ? checkin : brief)(c, again);
  window.Mira = { L, line, band, which, talk, brief, checkin, checkinEnd, review, idle: c => line('idle', c.date + Math.random()) };
})();
