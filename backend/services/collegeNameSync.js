const db = require('../config/db');

const COLLEGE_NAME_MAP = {
  'College A': 'Dr H N National College of Engineering',
  'College B': 'National College Jayanagar',
  'College C': 'National PU College',
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
     SET name = CASE email
       WHEN 'college_a@edu.com' THEN 'Dr H N National College of Engineering Rep'
       WHEN 'college_b@edu.com' THEN 'National College Jayanagar Rep'
       WHEN 'college_c@edu.com' THEN 'National PU College Rep'
       ELSE name
     END
     WHERE email IN ('college_a@edu.com', 'college_b@edu.com', 'college_c@edu.com')`
  );
};

module.exports = { syncCollegeNames };
