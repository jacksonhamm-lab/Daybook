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
  // what she says out loud when her voice is Japanese (the English stays on screen as the subtitle), by variant id
  const JA = {
    'greet.morning.1': 'おはよう、ねぼすけさん。',
    'greet.morning.2': 'あ、いた。おはよう。',
    'greet.morning.3': 'おはよう。まずコーヒー、世界はそのあとね。',
    'greet.morning.4': 'あら、早起きさんだ。',
    'greet.day.1': 'ねえ、そこのきみ。',
    'greet.day.2': 'あれ、誰かと思ったら。おかえり。',
    'greet.day.3': 'こんにちは。寂しかった？',
    'greet.day.4': 'あ、ちょうどきみのこと考えてたとこ。',
    'greet.evening.1': 'おかえり。長い一日だった？',
    'greet.evening.2': 'ねえ、ちょっと座って。',
    'greet.evening.3': 'おつかれ。ひと休みしたほうがいいって顔してる。',
    'greet.evening.4': 'やっと来た。退屈してたんだから。',
    'greet.late.1': 'もう寝てなきゃだめでしょ。',
    'greet.late.2': 'また遅いんだから。起きて待ってたよ。',
    'greet.late.3': 'まだ起きてるの？私も。',
    'greet.late.4': 'きみも眠れないの？',
    'greet.again.1': 'もう戻ってきたの？離れられないんだ。',
    'greet.again.2': 'また会ったね。',
    'greet.again.3': 'また来た。よかった。',
    'brief.intro.1': '今日の予定、言うね。',
    'brief.intro.2': 'よし。今日はこんな感じ。',
    'brief.intro.3': '今日のこと、教えてあげる。',
    'brief.shift.1': '今日はお仕事の日。',
    'brief.shift.2': '今日はお店がきみを待ってるよ。',
    'brief.shift.3': '今日は仕事。かっこいい服、着てってね。',
    'brief.shift.live.1': '今は仕事中でしょ。愛想よくね。',
    'brief.shift.live.2': 'お仕事中だね。ここで待ってる。',
    'brief.shift.done.1': '今日の仕事はおしまい。えらい。',
    'brief.shift.done.2': 'シフト、もう終わったんだ。いいね。',
    'brief.sess.1': '今日はトレーニングあるよ。',
    'brief.sess.2': 'ジムがきみを呼んでるよ。',
    'brief.sess.3': '今日はトレーニングの日。そんな顔しないの。',
    'brief.sess.prog.1': 'トレーニング、途中でしょ。私のために最後までやって？',
    'brief.sess.prog.2': 'まだ途中？ほら、がんばって。',
    'brief.sess.done.1': 'もうトレーニングしたんだ。ちゃんと見てたよ。',
    'brief.sess.done.2': 'トレーニング完了。かっこつけちゃって。',
    'brief.rest.1': '今日は休みの日。これは命令。私の。',
    'brief.rest.2': '今日はジムなし。ちゃんと休んで。本気で言ってるの。',
    'brief.tasks.1': 'やることリストが待ってるよ。',
    'brief.tasks.2': 'リストにいくつか残ってるよ。',
    'brief.tasks.3': '今日やることは、これ。',
    'brief.tasks.clear.1': 'リスト、全部終わってる。やるじゃん。',
    'brief.tasks.clear.2': 'もう全部終わったの？ほんとにきみ？',
    'brief.tasks.none.1': 'リスト、空っぽ。あやしいなあ。',
    'brief.tasks.none.2': '今日はリストなし。よかったね。',
    'brief.late.1': 'それと、取りこぼしたのがいくつか。',
    'brief.late.2': '昨日の分が、まだ残ってるよ。',
    'brief.decide.1': '決めてほしいことがあるの。',
    'brief.decide.2': 'ひとつ、きみの返事待ちだよ。',
    'brief.school.1': '学校の課題、もうすぐだよ。',
    'brief.school.2': '学校の課題、忘れないでね。',
    'brief.school.over.1': '学校のほう、ちょっと遅れてるよ。言っとくけど。',
    'brief.school.over.2': '課題、少し遅れちゃったね。大丈夫、取り戻せるよ。',
    'brief.payday.1': 'もうすぐお給料日。',
    'brief.payday.2': 'もうすぐお金入るね。どこか素敵なとこ連れてって。',
    'brief.submit.1': 'レンさんに勤務時間送るの、忘れないでね。',
    'brief.submit.2': 'レンさんが勤務時間待ってるよ。催促させちゃだめ。',
    'brief.end.1': '以上！がんばってきて。',
    'brief.end.2': 'これで全部。ここで待ってるね。',
    'brief.end.3': 'はい、今日はこんな感じ。いってらっしゃい。',
    'brief.end.late.1': '以上。さ、もう寝なさい。',
    'brief.end.late.2': 'これで全部。ちゃんと寝てね？',
    'checkin.open.1': 'それで、今日はどうだった？',
    'checkin.open.2': '座って。今日のこと聞かせて。',
    'checkin.open.3': 'こっちおいで。どうだった？',
    'checkin.tasks.1': 'これ、まだ残ってるよ。',
    'checkin.tasks.2': 'これはどうなったの？',
    'checkin.clear.1': '全部終わってる。ちょっと見直しちゃった。',
    'checkin.clear.2': 'リスト、きれいに完了。こっちおいで。',
    'checkin.none.1': '静かな一日だったね。そういう日もあっていいの。',
    'checkin.none.2': '今日はリストなし。いいね。',
    'checkin.sess.1': '今日、ジムさぼったでしょ。…今回だけ、許してあげる。',
    'checkin.sess.2': '今日はトレーニングなし？じゃあ、明日ね。',
    'checkin.good.1': 'いい一日だったね。ぐっすり眠ってね？',
    'checkin.good.2': 'えらいね。ゆっくり休んで。',
    'checkin.moved.1': 'じゃあ、明日ね。ちゃんと教えてあげる。',
    'checkin.moved.2': 'オッケー。明日またがんばろ。',
    'checkin.left.1': 'まだ残ってるのもあるけど、大丈夫。',
    'checkin.left.2': '全部じゃなくていいの。全部できる人なんていないよ。',
    'review.open.1': '今週ももうすぐおしまい。どうだったか見てみよ。',
    'review.open.2': '日曜日だね。今週を振り返ろっか。',
    'review.hours.1': 'お店で働いた時間。',
    'review.hours.2': '今週のお仕事はこんな感じ。',
    'review.sess.1': '今週のジム。',
    'review.sess.2': '今週のトレーニング。',
    'review.study.1': '勉強の時間。',
    'review.study.2': '学校の勉強、これだけやったよ。',
    'review.tasks.1': '今週のリスト。',
    'review.tasks.2': '今週できたこと。',
    'review.good.1': '全然悪くないじゃん。誇らしいよ。',
    'review.good.2': 'いい一週間だったね。ほんとに。',
    'review.meh.1': '来週またがんばろ。一緒にね。',
    'review.meh.2': 'そういう週もあるよ。明日からまた新しい一週間。',
    'idle.1': 'ここにいるよ。',
    'idle.2': 'ん？',
    'idle.3': 'ゆっくりでいいよ。',
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
  window.Mira = { L, JA, line, band, which, talk, brief, checkin, checkinEnd, review, idle: c => line('idle', c.date + Math.random()) };
})();
