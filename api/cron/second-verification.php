<?php
/**
 * Runs the delayed second verification. Schedule it every 15 minutes in cPanel > Cron Jobs
 * (common setting "Every 15 minutes", command below; note a literal star-slash cannot appear in this comment):
 *   /usr/local/bin/php /home/<user>/mnn.3dmusketeers.com/api/cron/second-verification.php >/dev/null 2>&1
 * Also callable over HTTP with ?key=CRON_KEY for a manual run (CRON_KEY in api/config.php).
 *
 * 1. Users whose random due time has passed and who have not been sent the second link: send it.
 * 2. Users sent the link more than SECOND_GRACE_DAYS ago who never clicked: mark restricted
 *    (comments stay hidden; nothing is deleted; a staff member can lift it).
 */
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';

if (!comments_enabled()) { echo "comments are switched off in site-config.json; nothing to do
"; exit; }
if (PHP_SAPI !== 'cli') {
    if (!defined('CRON_KEY') || CRON_KEY === '' || !hash_equals(CRON_KEY, (string) ($_GET['key'] ?? ''))) fail('Forbidden', 403);
}
$pdo = db();
$sent = 0; $restricted = 0;

$due = $pdo->prepare("SELECT * FROM users WHERE second_verified_at IS NULL AND second_sent_at IS NULL AND second_due_at IS NOT NULL AND second_due_at <= ? AND status = 'new' LIMIT 200");
$due->execute([now_utc()]);
foreach ($due->fetchAll() as $u) {
    $token = issue_token((int) $u['id'], 'second', SECOND_GRACE_DAYS * 86400);
    if (mail_second_verification($u['email'], APP_URL . '/api/auth.php?action=second&token=' . $token)) {
        $pdo->prepare('UPDATE users SET second_sent_at = ? WHERE id = ?')->execute([now_utc(), $u['id']]);
        $sent++;
    }
}

$late = $pdo->prepare("UPDATE users SET status = 'restricted' WHERE second_verified_at IS NULL AND second_sent_at IS NOT NULL AND second_sent_at < ? AND status = 'new'");
$late->execute([now_utc(-SECOND_GRACE_DAYS * 86400)]);
$restricted = $late->rowCount();

// Housekeeping: expired tokens and sessions.
$pdo->prepare('DELETE FROM tokens WHERE expires_at < ?')->execute([now_utc(-86400)]);
$pdo->prepare('DELETE FROM sessions WHERE expires_at < ?')->execute([now_utc()]);

$msg = "second-verification: sent $sent, restricted $restricted";
if (PHP_SAPI === 'cli') echo $msg . "\n"; else json_out(['ok' => true, 'sent' => $sent, 'restricted' => $restricted]);
