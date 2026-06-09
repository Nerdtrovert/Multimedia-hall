const db = require('../config/db');

const COLLEGE_NAME_MAP = {
  'College A': 'Dr H N National College of Engineering',
  'College B': 'National College Jayanagar',
  'College C': 'National PU College',
};

const COLLEGE_USERNAME_MAP = {
  'Dr H N National College of Engineering':
    String(process.env.SEED_COLLEGE_A_USERNAME || 'dr-hn-national-college').trim() || 'dr-hn-national-college',
  'National College Jayanagar':
    String(process.env.SEED_COLLEGE_B_USERNAME || 'national-college-jayanagar').trim() || 'national-college-jayanagar',
  'National PU College':
    String(process.env.SEED_COLLEGE_C_USERNAME || 'national-pu-college').trim() || 'national-pu-college',
};

const syncCollegeNames = async () => {
  const oldNames = Object.keys(COLLEGE_NAME_MAP);
  if (oldNames.length === 0) return;

  const userCaseClause = oldNames.map(() => 'WHEN ? THEN ?').join(' ');
  const userCaseParams = oldNames.flatMap((oldName) => [oldName, COLLEGE_NAME_MAP[oldName]]);

  await db.query(
    `UPDATE users
     SET college_name = CASE college_name
       ${userCaseClause}
       ELSE college_name
     END
     WHERE college_name IN (${oldNames.map(() => '?').join(',')})`,
    [...userCaseParams, ...oldNames]
  );

  const bookingCaseClause = oldNames.map(() => 'WHEN ? THEN ?').join(' ');
  const bookingCaseParams = oldNames.flatMap((oldName) => [oldName, COLLEGE_NAME_MAP[oldName]]);

  await db.query(
    `UPDATE bookings
     SET college_name = CASE college_name
       ${bookingCaseClause}
       ELSE college_name
     END
     WHERE college_name IN (${oldNames.map(() => '?').join(',')})`,
    [...bookingCaseParams, ...oldNames]
  );

  await db.query(
    `UPDATE users
     SET name = TRIM(TRAILING ' Rep' FROM name)
     WHERE role = 'college' AND name LIKE '% Rep'`
  );

  for (const [collegeName, username] of Object.entries(COLLEGE_USERNAME_MAP)) {
    await db.query(
      `UPDATE users
       SET username = ?
       WHERE role = 'college'
         AND college_name = ?
         AND NULLIF(TRIM(username), '') IS NULL`,
      [username, collegeName]
    );
  }

  await db.query(
    `UPDATE users
     SET username = CONCAT('college-user-', id)
     WHERE role = 'college'
       AND NULLIF(TRIM(username), '') IS NULL`
  );
};

module.exports = { syncCollegeNames };
