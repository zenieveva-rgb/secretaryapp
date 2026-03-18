<?php
session_start();
session_destroy();
setcookie('auth_token', '', time() - 3600, '/');
header('Location: login.php');
exit();
?>
