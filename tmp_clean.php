<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=erp', 'root', '');
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
$pdo->exec('DROP TABLE IF EXISTS exam_series');
echo "Dropped exam_series table\n";
$pdo->exec("DELETE FROM migrations WHERE migration LIKE '%exam_series%'");
echo "Cleaned migration records\n";
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "Done\n";
