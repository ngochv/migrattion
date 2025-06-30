const { mysqlDb, pgDb } = require('../db/connection');

async function createTableFromMySQL(sourceTable, targetTable) {
    const columnsInfo = await mysqlDb.raw(`SHOW COLUMNS FROM \`${sourceTable}\``);
    const columns = columnsInfo[0];

    await pgDb.schema.createTable(targetTable, (table) => {
        columns.forEach(col => {
            const columnName = col.Field;
            const mysqlType = col.Type.toLowerCase();
            let column;

            if (mysqlType.startsWith('int') || mysqlType.startsWith('tinyint') || mysqlType.startsWith('smallint')) {
                column = table.integer(columnName);
            } else if (mysqlType.startsWith('bigint')) {
                column = table.bigInteger(columnName);
            } else if (mysqlType.startsWith('varchar') || mysqlType.startsWith('char')) {
                const lengthMatch = mysqlType.match(/\((\d+)\)/);
                const length = lengthMatch ? Number(lengthMatch[1]) : 255;
                column = table.string(columnName, length);
            } else if (mysqlType.startsWith('text')) {
                column = table.text(columnName);
            } else if (mysqlType.startsWith('datetime') || mysqlType.startsWith('timestamp')) {
                column = table.timestamp(columnName);
            } else if (mysqlType.startsWith('date')) {
                column = table.date(columnName);
            } else if (mysqlType.startsWith('float') || mysqlType.startsWith('double')) {
                column = table.float(columnName);
            } else if (mysqlType.startsWith('decimal')) {
                column = table.decimal(columnName);
            } else if (mysqlType.startsWith('boolean') || mysqlType.startsWith('bit')) {
                column = table.boolean(columnName);
            } else {
                column = table.string(columnName, 255);
            }

            if (col.Null === 'NO') {
                column.notNullable();
            }

            if (col.Default !== null) {
                if (!(col.Type.toLowerCase().startsWith('timestamp') && col.Default === '0000-00-00 00:00:00')) {
                    column.defaultTo(col.Default);
                } else {
                    // Bỏ qua default invalid này
                }
            }

            if (col.Key === 'PRI') {
                table.primary([columnName]);
            }
        });
    });

    console.log(`Created table ${targetTable} on PostgreSQL based on schema from MySQL table ${sourceTable}`);
}

async function migrateTables(tableMap) {
    try {
        for (const [sourceTable, targetTable] of Object.entries(tableMap)) {
            console.log(`Migrating from MySQL table ${sourceTable} => PostgreSQL table ${targetTable}`);

            // 1. Lấy dữ liệu từ MySQL
            const rows = await mysqlDb.select('*').from(sourceTable);
            if (rows.length === 0) {
                console.log(`- Không có dữ liệu trong bảng ${sourceTable}, bỏ qua`);
                continue;
            }

            // 2. Kiểm tra bẳng đích trên PostgreSQL có tồn tại không
            const exists = await pgDb.schema.hasTable(targetTable);
            if (!exists) {
                // Create bảng mới dựa trên cấu trúc bảng MySQL
                await createTableFromMySQL(sourceTable, targetTable);
            } else {
                // Xóa dữ liệu bảng đích
                await pgDb(targetTable).del();
                console.log(`- Đã xóa dữ liệu cũ trong bảng ${targetTable}`);
            }

            // 3. Chèn dữ liệu vào PostgreSQL theo batch
            const batchSize = 1000;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                await pgDb(targetTable).insert(batch);
                console.log(`- Insert batch ${i} -> ${i + batch.length}`);
            }

            console.log(`Migrated ${rows.length} rows từ ${sourceTable} sang ${targetTable}`);
        }
    } catch (err) {
        console.error('Migration error:', err);
        throw err;
    } finally {
        await mysqlDb.destroy();
        await pgDb.destroy();
    }
}

module.exports = { migrateTables };