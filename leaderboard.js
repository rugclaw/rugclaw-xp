'use strict';
let snapshot = null;
let mode = 'weekly';
let loading = false;
const board = document.getElementById('board');
const updated = document.getElementById('updated');
const period = document.getElementById('period');
const buttons = Array.from(document.querySelectorAll('[data-mode]'));
const avatarPattern = /^https:\/\/cdn\.discordapp\.com\/(?:avatars\/[0-9]+\/[a-zA-Z0-9_]+\.(?:png|webp|gif|jpg)|guilds\/[0-9]+\/users\/[0-9]+\/avatars\/[a-zA-Z0-9_]+\.(?:png|webp|gif|jpg)|embed\/avatars\/[0-5]\.png)(?:\?size=(?:16|32|64|128|256|512|1024|2048|4096))?$/;
const weekTimezone = 'America/Chicago';
const dateOptions = {timeZone: weekTimezone, day: 'numeric', month: 'short', year: 'numeric'};
const dateLabel = seconds => new Date(seconds * 1000).toLocaleDateString('en-IE', dateOptions);
const cutoffFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: weekTimezone, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function validWeek(week, published) {
  if (!week || week.timezone !== weekTimezone || !Number.isSafeInteger(week.start) ||
      !Number.isSafeInteger(week.end) || week.start <= 0 || published < week.start || published >= week.end ||
      ![167, 168, 169].includes((week.end - week.start) / 3600)) return false;
  return [week.start, week.end].every(seconds => {
    const date = new Date(seconds * 1000);
    if (!Number.isFinite(date.getTime())) return false;
    const parts = Object.fromEntries(cutoffFormat.formatToParts(date).map(part => [part.type, part.value]));
    return parts.weekday === 'Sat' && parts.hour === '20' && parts.minute === '00' && parts.second === '00';
  });
}

function validPlayer(player, weekly) {
  return player && typeof player.name === 'string' && Number.isSafeInteger(player.xp) &&
    (weekly || player.xp >= 0) && Number.isSafeInteger(player.level) && player.level >= 1;
}

function validate(data) {
  if (!data || !Array.isArray(data.players) || !data.players.every(p => validPlayer(p, false)) ||
      !Number.isSafeInteger(data.updated) || data.updated <= 0) throw Error('Invalid scores');
  // Legacy data remains usable until the first v2 snapshot arrives.
  if (data.weekly_players !== undefined && (!Array.isArray(data.weekly_players) ||
      !data.weekly_players.every(p => validPlayer(p, true)) ||
      !validWeek(data.week, data.updated))) throw Error('Invalid weekly scores');
  return data;
}

function render() {
  if (!snapshot) return;
  const hasWeekly = Array.isArray(snapshot.weekly_players);
  if (!hasWeekly) mode = 'alltime';
  buttons.forEach(button => {
    button.disabled = button.dataset.mode === 'weekly' && !hasWeekly;
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
  const weekly = mode === 'weekly';
  const expired = hasWeekly && Date.now() >= snapshot.week.end * 1000;
  const players = weekly ? (expired ? [] : snapshot.weekly_players) : snapshot.players;
  board.replaceChildren();
  if (!players.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = weekly ? (expired ? 'A new week has started. Waiting for this week’s scores…' :
      'No XP changes this week yet. Play with RugClaw to join the board!') :
      '💀 No XP yet. Be the first degen on the board!';
    board.append(empty);
  }
  players.forEach((player, index) => {
    const row = document.createElement('article');
    row.className = 'player';
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = ['🥇', '🥈', '🥉'][index] || '#' + (index + 1);
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const initials = document.createElement('span');
    initials.textContent = Array.from(player.name.trim())[0]?.toUpperCase() || '🦞';
    avatar.append(initials);
    if (typeof player.avatar_url === 'string' && avatarPattern.test(player.avatar_url)) {
      const image = document.createElement('img');
      image.alt = '';
      image.width = 40;
      image.height = 40;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.remove(), {once: true});
      image.src = player.avatar_url;
      avatar.append(image);
    }
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = player.name;
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = player.xp.toLocaleString('en-IE') + (weekly ? ' XP this week' : ' XP');
    const level = document.createElement('small');
    level.textContent = 'LEVEL ' + player.level + (weekly ? ' · all-time level' : '');
    score.append(level);
    row.append(rank, avatar, name, score);
    board.append(row);
  });
  if (weekly) {
    period.textContent = 'Week of ' + dateLabel(snapshot.week.start) + ' · New scoring week Saturday 20:00 Texas Central Time (America/Chicago; CST/CDT). ' +
      'Net XP includes wins, losses and starter grants. Levels use all-time XP.';
    const began = snapshot.week.tracking_started;
    if (Number.isSafeInteger(began) && began > snapshot.week.start && began < snapshot.week.end) {
      period.textContent += ' This first week counts changes from ' + new Date(began * 1000).toLocaleString('en-IE', {
        ...dateOptions, hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      }) + '; earlier XP stays in all-time.';
    }
  } else {
    period.textContent = 'All-time XP · Lifetime balances are preserved across weekly resets.';
  }
}

buttons.forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  render();
}));

async function load() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch('leaderboard.json?t=' + Date.now(), {cache: 'no-store'});
    if (!response.ok) throw Error('Scores unavailable');
    snapshot = validate(await response.json());
    render();
    updated.textContent = 'Last published: ' + new Date(snapshot.updated * 1000).toLocaleString('en-IE', {
      ...dateOptions, hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
  } catch {
    if (snapshot) render();
    else board.textContent = 'Scores temporarily unavailable. Try again shortly.';
    updated.textContent = snapshot ? 'Refresh delayed · Showing last published scores' : 'Scores unavailable';
  } finally {
    loading = false;
  }
}
load();
setInterval(load, 8000);
