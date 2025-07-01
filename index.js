// index.js
(async () => {
  try {
    // Import hàm main từ file migrate/mysqlToPg.js
    const { main } = require('./migrate/mysqlToPg');

    // Gọi chạy hàm main thực hiện migrate
    await main();

    // Thông báo hoàn thành
    console.log('Migration completed!');
  } catch (error) {
    // Bắt lỗi và in ra console
    console.error('Migration error:', error);

    // Exit process với mã lỗi 1 (báo lỗi)
    process.exit(1);
  }
})();