/**
 * Attempt to repair truncated JSON (e.g. from max_tokens cutoff).
 *
 * Strategy: walk the string tracking JSON structure, find the position of
 * the last complete value, truncate there, then close any open brackets/braces.
 */
export function repairJson(raw: string): unknown {
  // First, try as-is
  try {
    return JSON.parse(raw);
  } catch {
    // continue to repair
  }

  // Walk through tracking structure
  const opens: string[] = [];
  let inString = false;
  let escape = false;
  let lastCompleteValueEnd = -1;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
        lastCompleteValueEnd = i;
      }
      continue;
    }

    switch (ch) {
      case '"':
        inString = true;
        break;
      case '{':
      case '[':
        opens.push(ch);
        break;
      case '}':
      case ']':
        opens.pop();
        lastCompleteValueEnd = i;
        break;
      case ',':
      case ':':
      case ' ':
      case '\n':
      case '\r':
      case '\t':
        break;
      default:
        // Numbers, booleans, null — track end of literal
        if (/[\d.eE+\-]/.test(ch) || /[trufalsn]/.test(ch)) {
          // Find end of literal token
          const literalMatch = raw.slice(i).match(/^(-?\d[\d.eE+\-]*|true|false|null)/);
          if (literalMatch) {
            i += literalMatch[0].length - 1;
            lastCompleteValueEnd = i;
          }
        }
        break;
    }
  }

  // If we ended inside a string or with incomplete data, truncate to last complete value
  let trimmed: string;
  if (inString || lastCompleteValueEnd < raw.length - 1) {
    trimmed = raw.slice(0, lastCompleteValueEnd + 1);
  } else {
    trimmed = raw;
  }

  // Remove any trailing comma
  trimmed = trimmed.replace(/,\s*$/, '');

  // Re-scan to find unclosed brackets
  const unclosed: string[] = [];
  inString = false;
  escape = false;
  for (const ch of trimmed) {
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') unclosed.push(ch);
    else if (ch === '}' || ch === ']') unclosed.pop();
  }

  // Close in reverse order
  for (let i = unclosed.length - 1; i >= 0; i--) {
    trimmed += unclosed[i] === '{' ? '}' : ']';
  }

  return JSON.parse(trimmed);
}
