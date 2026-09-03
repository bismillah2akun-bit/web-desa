const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text.slice(0, maxLength) : null
}

function requireFields(payload, fields) {
  return fields.filter((field) => !payload[field])
}

function isValidEmail(email) {
  return !email || EMAIL_PATTERN.test(email)
}

module.exports = { cleanText, requireFields, isValidEmail }
