require('dotenv').config();
const Knex = require('knex');

const mysqlDb = Knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  }
});

const pgDb = Knex({
  client: 'mysql2',
//   client: 'pg',
  connection: {
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    database: process.env.PG_DB,
    port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  }
});

module.exports = { mysqlDb, pgDb };