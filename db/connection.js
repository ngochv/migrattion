require('dotenv').config();
const Knex = require('knex');

const sqlFrom = Knex({
  client: 'pg',
  connection: {
    host: process.env.SQL_FROM_HOST,
    user: process.env.SQL_FROM_USER,
    password: process.env.SQL_FROM_PASS.replace(/(^'|'$)/g, ''),
    database: process.env.SQL_FROM_DB,
    port: process.env.SQL_FROM_PORT ? Number(process.env.SQL_FROM_PORT) : 5432,
  }
});

const sqlTo = Knex({
  client: 'pg',
  connection: {
    host: process.env.SQL_TO_HOST,
    user: process.env.SQL_TO_USER,
    password: process.env.SQL_TO_PASS.replace(/(^'|'$)/g, ''),
    database: process.env.SQL_TO_DB,
    port: process.env.SQL_TO_PORT ? Number(process.env.SQL_TO_PORT) : 5432,
  }
});

module.exports = { sqlFrom, sqlTo };
