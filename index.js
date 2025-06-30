const { migrateTables } = require('./migrate/wordpressToPg');

const tableMap = {
  anaxagoras_users: 'users',
};

migrateTables(tableMap)
  .then(() => {
    console.log('Migration completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });