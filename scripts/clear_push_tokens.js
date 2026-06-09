const db = require("../backend/config/db");
(async ()=>{ try {
  await db.query("DELETE FROM user_push_tokens");
  const [res] = await db.query("SELECT COUNT(*) AS c FROM user_push_tokens");
  console.log("DELETED. REMAINING:" + (res[0] && res[0].c));
  const audit = require('../backend/utils/audit');
  if (audit && typeof audit.logAudit === 'function') {
    await audit.logAudit('PUSH_TOKENS_CLEARED', 0, null, 'Cleared all push tokens via CLI');
    console.log('Audit logged');
  }
  process.exit(0);
} catch(e) { console.error('ERR', e && e.message ? e.message : e); process.exit(1);} })();
