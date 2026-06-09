(async ()=>{
  try {
    const db = require('../backend/config/db');
    const [tokens] = await db.query(
      'SELECT id, user_id, token, created_at FROM user_push_tokens ORDER BY created_at DESC LIMIT 100'
    );
    const [diagnostics] = await db.query(
      "SELECT id, action, details, created_at FROM audit_logs WHERE action LIKE '%PUSH%' OR details LIKE '%getToken%' OR details LIKE '%PUSH_DIAGNOSTIC%' ORDER BY created_at DESC LIMIT 200"
    );

    console.log('TOKENS:' + JSON.stringify(tokens, null, 2));
    console.log('\nDIAGNOSTICS:' + JSON.stringify(diagnostics, null, 2));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
