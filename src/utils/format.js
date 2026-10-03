function fmt(num) {
  return Number(num || 0).toLocaleString('en-US');
}

function timeLeft(date) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

module.exports = { fmt, timeLeft };
