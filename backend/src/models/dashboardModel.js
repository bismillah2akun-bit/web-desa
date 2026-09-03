const { pool: db } = require('../config/database')

async function getSummary() {
  const [[counts], [guestbook], [contacts]] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*) FROM news) AS news_count,
        (SELECT COUNT(*) FROM facilities) AS facility_count,
        (SELECT COUNT(*) FROM potentials) AS potential_count,
        (SELECT COUNT(*) FROM contacts WHERE status = 'baru') AS new_contact_count,
        (SELECT COUNT(*) FROM guestbook WHERE status = 'baru') AS new_guestbook_count
        ,(SELECT COUNT(*) FROM service_applications WHERE status IN ('diajukan', 'diperiksa', 'revisi')) AS active_application_count
    `),
    db.query(`
      SELECT id, name, institution, visit_purpose, visit_date, status, created_at
      FROM guestbook
      ORDER BY created_at DESC
      LIMIT 5
    `),
    db.query(`
      SELECT id, name, email, subject, status, created_at
      FROM contacts
      ORDER BY created_at DESC
      LIMIT 5
    `),
  ])

  return {
    counts: counts[0],
    recentGuestbook: guestbook,
    recentContacts: contacts,
  }
}

module.exports = { getSummary }
