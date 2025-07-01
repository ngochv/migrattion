const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sqlFrom, sqlTo } = require('../db/connection');

const tableMap = {
  't_wf_edt2_task': 't_wf_edt2_task2',
};

async function migrateTable(sourceTable, targetTable) {
  try {
    console.log(`\n=== Bắt đầu migrate bảng ${sourceTable} -> ${targetTable} ===`);

    console.log(`Đang lấy dữ liệu từ bảng nguồn: ${sourceTable} ...`);
    const rows = await sqlFrom.select('*').from(sourceTable);

    if (!rows) {
      console.log(`Không lấy được dữ liệu từ bảng ${sourceTable}`);
      return;
    }

    console.log(`Lấy được ${rows.length} bản ghi từ bảng ${sourceTable}`);

    if (rows.length === 0) {
      console.log(`Bảng ${sourceTable} trống, không cần migrate dữ liệu.`);
      return;
    }

    // Hiển thị mẫu dữ liệu (10 bản ghi đầu)
    console.log('Mẫu 10 bản ghi đầu bảng nguồn:', rows.slice(0, 10));

    const chunkSize = 1000;
    console.log(`Bắt đầu chèn dữ liệu vào bảng đích: ${targetTable} theo lô ${chunkSize} bản ghi`);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await sqlTo(targetTable).insert(chunk);
      console.log(`Đã insert ${chunk.length} bản ghi tới ${targetTable} (bản ghi thứ ${i + 1} đến ${i + chunk.length})`);
    }

    console.log(`Hoàn thành migrate bảng ${sourceTable} sang ${targetTable}!\n`);
  } catch (error) {
    console.error(`Lỗi khi migrate bảng ${sourceTable}:`, error);
  }
}

async function main() {
  console.log('=== Bắt đầu quá trình migrate từ SQL_FROM_DB sang SQL_TO_DB ===');
  try {
    for (const [sourceTable, targetTable] of Object.entries(tableMap)) {
      await migrateTable(sourceTable, targetTable);
    }
  } catch (error) {
    console.error('Lỗi trong quá trình migrate:', error);
  } finally {
    console.log('Đang đóng kết nối tới các database...');
    await sqlFrom.destroy();
    await sqlTo.destroy();
    console.log('Kết nối đã được đóng. Kết thúc chương trình.');
  }
}

main();
