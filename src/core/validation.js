/** Numeric values match the original Java simulator: nonnegative integers only. */
export function parseNonnegativeInteger(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) {
    throw new Error(`${fieldName} must be a non-negative whole number.`);
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number)) {
    throw new Error(`${fieldName} is too large.`);
  }
  return number;
}

/** Strict IPv4 validation: 0–255 per octet and no leading zeros. */
export function isValidIPv4(value) {
  if (typeof value !== 'string') return false;
  const ip = value.trim();
  const parts = ip.split('.');
  return parts.length === 4 && parts.every((part) => {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return false;
    return Number(part) <= 255;
  });
}

export function validatePacket(form) {
  const id = parseNonnegativeInteger(form.id, 'Packet ID');
  const priority = parseNonnegativeInteger(form.priority, 'Priority');
  const sourceIP = String(form.sourceIP ?? '').trim();
  const destinationIP = String(form.destinationIP ?? '').trim();

  if (!isValidIPv4(sourceIP)) {
    throw new Error('Enter a valid source IPv4 address (for example, 192.168.1.5).');
  }
  if (!isValidIPv4(destinationIP)) {
    throw new Error('Enter a valid destination IPv4 address (for example, 10.0.0.8).');
  }

  return { id, priority, sourceIP, destinationIP };
}
