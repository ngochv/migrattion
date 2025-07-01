const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sqlFrom, sqlTo } = require('../db/connection');
const tableMap = require('./tableMap');

/**
 * Map kiểu dữ liệu MySQL sang PostgreSQL đơn giản
 */
function mapMySQLTypeToPostgres(mysqlType) {
  mysqlType = mysqlType.toLowerCase();

  if (mysqlType.includes('tinyint(1)')) return 'BOOLEAN';
  if (mysqlType.includes('int')) return 'INTEGER';
  if (mysqlType.includes('tinyint')) return 'SMALLINT';
  if (mysqlType.includes('bigint')) return 'BIGINT';
  if (mysqlType.includes('varchar')) return 'VARCHAR';
  if (mysqlType.includes('char')) return 'CHAR';
  if (mysqlType.includes('text')) return 'TEXT';
  if (mysqlType.includes('datetime')) return 'TIMESTAMP';
  if (mysqlType.includes('timestamp')) return 'TIMESTAMP';
  if (mysqlType.includes('date')) return 'DATE';
  if (mysqlType.includes('decimal')) return mysqlType.toUpperCase(); // giữ nguyên decimal(x,y)
  if (mysqlType.includes('float')) return 'REAL';
  if (mysqlType.includes('double')) return 'DOUBLE PRECISION';

  return 'TEXT'; // mặc định
}

/**
 * Tạo bảng PostgreSQL dựa trên schema MySQL
 */
async function createPostgresTableFromMySQL(fromTable, toTable) {
  const result = await sqlFrom.raw(
    `
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `,
    [process.env.SQL_FROM_DB, fromTable]
  );

  const cols = result[0];
  if (!cols || cols.length === 0) {
    throw new Error(`Không lấy được thông tin cột cho bảng ${fromTable}`);
  }

  const colDefs = cols.map((col) => {
    const colName = `"${col.COLUMN_NAME}"`;
    const colType = mapMySQLTypeToPostgres(col.COLUMN_TYPE);
    const nullable = col.IS_NULLABLE === 'YES' ? '' : 'NOT NULL';

    // Xử lý bỏ default '0000-00-00 00:00:00' vì Postgres không chấp nhận
    const isDateTime = colType === 'TIMESTAMP' || colType === 'DATE';
    const defaultVal =
      col.COLUMN_DEFAULT !== null && !(isDateTime && col.COLUMN_DEFAULT === '0000-00-00 00:00:00')
        ? `DEFAULT ${
            typeof col.COLUMN_DEFAULT === 'string' &&
            !col.COLUMN_DEFAULT.match(/^\d+$/)
              ? `'${col.COLUMN_DEFAULT.replace(/'/g, "''")}'`
              : col.COLUMN_DEFAULT
          }`
        : '';

    return `${colName} ${colType} ${nullable} ${defaultVal}`.trim();
  });

  const pkCols = cols
    .filter((c) => c.COLUMN_KEY && c.COLUMN_KEY.includes('PRI'))
    .map((c) => `"${c.COLUMN_NAME}"`);

  let pkDef = '';
  if (pkCols.length) {
    pkDef = `, PRIMARY KEY (${pkCols.join(', ')})`;
  }

  const createTableSQL = `CREATE TABLE IF NOT EXISTS "${toTable}" (\n  ${colDefs.join(
    ',\n  '
  )}${pkDef}\n);`;

  console.log(`Tạo bảng Postgres "${toTable}":\n${createTableSQL}`);

  await sqlTo.raw(createTableSQL);
}

/**
 * Chuyển các giá trị '0000-00-00 00:00:00' thành null trong dữ liệu để tránh lỗi khi insert
 */
function fixRowDateTime(row) {
  const fixedRow = { ...row };
  for (const key in fixedRow) {
    if (typeof fixedRow[key] === 'string' && fixedRow[key] === '0000-00-00 00:00:00') {
      fixedRow[key] = null;
    }
  }
  return fixedRow;
}

async function migrateTable(fromTable, toTable) {
  try {
    console.log(`\nMigrating table ${fromTable} => ${toTable}`);

    await createPostgresTableFromMySQL(fromTable, toTable);

    const rows = await sqlFrom.select('*').from(fromTable);
    console.log(`- Lấy ${rows.length} bản ghi từ bảng ${fromTable}`);

    // Xoá sạch dữ liệu cũ bằng TRUNCATE, reset identity để tránh lỗi duplicate key
    await sqlTo.raw(`TRUNCATE TABLE "${toTable}" RESTART IDENTITY CASCADE`);
    console.log(`- Đã xoá dữ liệu cũ trong bảng ${toTable}`);

    if (rows.length === 0) {
      console.log(`- Không có dữ liệu để insert.`);
      return;
    }

    const chunkSize = 1000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      // Áp dụng fix giá trị ngày tháng trước khi insert
      const chunk = rows.slice(i, i + chunkSize).map(fixRowDateTime);

      await sqlTo(toTable).insert(chunk);
      console.log(`- Đã chèn ${Math.min(i + chunk.length, rows.length)} / ${rows.length} bản ghi`);
    }

    console.log(`=> Migrate bảng ${fromTable} thành công!`);
  } catch (error) {
    console.error(`Lỗi migrate bảng ${fromTable}:`, error);
  }
}

async function main() {
  for (const [fromTable, toTable] of Object.entries(tableMap)) {
    await migrateTable(fromTable, toTable);
  }

  await Promise.all([sqlFrom.destroy(), sqlTo.destroy()]);
  console.log('Đã đóng kết nối database');
}

main().catch((error) => {
  console.error('Lỗi chương trình:', error);
  process.exit(1);
});

module.exports = {
  main,
};