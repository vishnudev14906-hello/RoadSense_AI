/**
 * Robust Real-Time Date & Time Utilities for RoadSense AI
 * Accurately parses UTC / ISO / naive timestamps and renders user's real local time.
 */

export function parseDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  let str = String(dateStr).trim();
  // If string has 'T' or space without timezone offset, append 'Z' to treat as UTC
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  } else if (!str.includes('T') && str.includes(' ') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatDateTime(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(dateStr, includeSeconds = true) {
  const d = parseDate(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  });
}

export function formatRelativeTime(dateStr) {
  const d = parseDate(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffSec < 0) return 'Just now';
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}
