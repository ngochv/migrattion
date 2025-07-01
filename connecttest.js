require('dotenv').config();
const { sqlFrom, sqlTo } = require('./db/connection');

/**
 * Lấy danh sách bảng trong database với knex instance, hỗ trợ MySQL và PostgreSQL
 * @param {object} knexInstance knex connection
 * @param {string} name tên kết nối (log)
 * @param {'mysql'|'pg'} clientType loại client để query phù hợp
 */
async function showAllTables(knexInstance, name, clientType) {
  try {
    console.log(`\n=== Danh sách bảng trong database (${name}) ===`);

    let tables;

    if (clientType === 'mysql') {
      tables = await knexInstance('information_schema.tables')
        .select('TABLE_NAME')
        .where('TABLE_SCHEMA', process.env.SQL_FROM_DB);
      if (!tables.length) {
        console.log('Không tìm thấy bảng nào trong database.');
        return;
      }
      console.log('Bảng tìm thấy:');
      tables.forEach(t => console.log(`- ${t.TABLE_NAME}`));
    } else if (clientType === 'pg') {
      tables = await knexInstance('pg_catalog.pg_tables')
        .select('tablename')
        .where('schemaname', 'public');
      if (!tables.length) {
        console.log('Không tìm thấy bảng nào trong schema public.');
        return;
      }
      console.log('Bảng tìm thấy:');
      tables.forEach(t => console.log(`- ${t.tablename}`));
    } else {
      console.warn(`ClientType "${clientType}" không được hỗ trợ.`);
    }
  } catch (error) {
    console.error(`Lỗi khi lấy danh sách bảng từ ${name}:`, error);
  }
}

async function testConnection(knexInstance, name) {
  try {
    await knexInstance.raw('SELECT 1');
    console.log(`✅ Connection to ${name} - Success!`);
  } catch (error) {
    console.error(`❌ Connection to ${name} - Failed!`, error.message);
  }
}

async function main() {
  // Kiểm tra kết nối
  await testConnection(sqlFrom, 'SQL_FROM_DB');
  await testConnection(sqlTo, 'SQL_TO_DB');

  // Hiển thị bảng
  await showAllTables(sqlFrom, 'SQL_FROM_DB', 'mysql');
  await showAllTables(sqlTo, 'SQL_TO_DB', 'pg');

  // Đóng kết nối
  await sqlFrom.destroy();
  await sqlTo.destroy();
}

main();