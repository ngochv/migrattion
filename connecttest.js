require('dotenv').config();
const { sqlFrom, sqlTo } = require('./db/connection');

async function testConnection(knexInstance, name) {
  try {
    await knexInstance.raw('SELECT 1');
    console.log(`✅ Connection to ${name} - Success!`);
  } catch (error) {
    console.error(`❌ Connection to ${name} - Failed!`, error.message);
  }
}

async function showAllTables(knexInstance, name) {
  try {
    console.log(`\n=== Danh sách bảng trong database (${name}) ===`);

    const tables = await knexInstance('pg_catalog.pg_tables')
      .select('tablename')
      .where('schemaname', 'public');

    if (tables.length === 0) {
      console.log('Không tìm thấy bảng nào trong schema public');
    } else {
      console.log('Bảng tìm thấy:');
      tables.forEach(t => console.log(`- ${t.tablename}`));
    }
  } catch (error) {
    console.error(`Lỗi khi lấy danh sách bảng từ ${name}:`, error);
  }
}

async function main() {
  await testConnection(sqlFrom, 'SQL_FROM_DB');
  await testConnection(sqlTo, 'SQL_TO_DB');

  await showAllTables(sqlFrom, 'SQL_FROM_DB');

  await sqlFrom.destroy();
  await sqlTo.destroy();
}

main();
