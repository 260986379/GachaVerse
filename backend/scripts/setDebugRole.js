const { query } = require('../src/config/db');

async function run() {
  const result = await query(
    "UPDATE users SET role = 'Debug' WHERE username = 'Sauce2'"
  );
  console.log(`Updated ${result.rowCount} row(s).`);
  if (result.rowCount === 0) {
    console.log('No user named Sauce2 found — check the username spelling.');
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
