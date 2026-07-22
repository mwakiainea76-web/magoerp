<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=erp', 'root', '');
$stmt = $pdo->query('SELECT id, migration FROM migrations ORDER BY id DESC LIMIT 15');
echo "Last migrations:\n";
foreach ($stmt as $row) {
    echo $row['id'] . ' ' . $row['migration'] . "\n";
}
