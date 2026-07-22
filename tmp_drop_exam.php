<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=erp', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

    $stmt = $pdo->query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'student_marks' AND COLUMN_NAME = 'exam_series_id' AND REFERENCED_TABLE_NAME IS NOT NULL");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $pdo->exec('ALTER TABLE student_marks DROP FOREIGN KEY ' . $row['CONSTRAINT_NAME']);
        echo 'Dropped FK: ' . $row['CONSTRAINT_NAME'] . PHP_EOL;
    }

    $pdo->exec('DROP INDEX IF EXISTS marks_unique_assessment ON student_marks');
    echo 'Dropped index marks_unique_assessment' . PHP_EOL;

    $pdo->exec('ALTER TABLE student_marks DROP COLUMN exam_series_id');
    echo 'Dropped exam_series_id from student_marks' . PHP_EOL;

    $pdo->exec('DROP TABLE IF EXISTS exam_series');
    echo 'Dropped exam_series table' . PHP_EOL;

    $pdo->exec("DELETE FROM migrations WHERE migration LIKE '%exam_series%'");
    echo 'Cleaned migration records' . PHP_EOL;

    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    echo 'Done' . PHP_EOL;
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
