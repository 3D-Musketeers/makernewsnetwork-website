<?php
/**
 * Give an account the staff role (badge in comments, access to /moderation/). CLI only.
 *   php api/cli/make-staff.php someone@example.com          -> staff
 *   php api/cli/make-staff.php someone@example.com member   -> back to member
 * The account must exist already (sign in once first). Staff accounts are also marked fully verified.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../lib/bootstrap.php';
$email = strtolower(trim((string) ($argv[1] ?? '')));
$role = ($argv[2] ?? 'staff') === 'member' ? 'member' : 'staff';
if ($email === '') { fwrite(STDERR, "usage: php api/cli/make-staff.php email [member]\n"); exit(1); }
$pdo = db();
$st = $pdo->prepare('SELECT id FROM users WHERE email = ?'); $st->execute([$email]);
$u = $st->fetch();
if (!$u) { fwrite(STDERR, "no account with that email; sign in once first\n"); exit(1); }
$pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $u['id']]);
if ($role === 'staff') complete_second_verification($pdo, (int) $u['id']);
echo "$email is now $role\n";
