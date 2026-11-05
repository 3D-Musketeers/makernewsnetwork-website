<?php
/**
 * Staff moderation. Every call needs a session whose user has role = 'staff'
 * (grant it with: php api/cli/make-staff.php someone@example.com).
 *   GET  /api/moderation.php?what=comments&status=pending|published|removed|all&q=text   -> latest 200
 *   GET  /api/moderation.php?what=users&q=text                                           -> latest 200
 *   POST /api/moderation.php?action=comment  {id, status: published|removed|pending}
 *   POST /api/moderation.php?action=user     {id, status: new|verified|restricted|banned}
 *        Setting verified also marks the second verification done and publishes held comments.
 */
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

$me = require_staff();
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $what = $_GET['what'] ?? 'comments';
    $q = trim((string) ($_GET['q'] ?? ''));
    $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
    if ($what === 'users') {
        $sql = 'SELECT id, email, display_name, provider, status, role, signup_ip, created_at, first_verified_at, second_due_at, second_sent_at, second_verified_at,
                (SELECT COUNT(*) FROM comments c WHERE c.user_id = users.id) AS comment_count FROM users'
             . ($q !== '' ? ' WHERE email LIKE ? OR display_name LIKE ?' : '') . ' ORDER BY id DESC LIMIT 200';
        $st = $pdo->prepare($sql); $st->execute($q !== '' ? [$like, $like] : []);
        json_out(['ok' => true, 'users' => $st->fetchAll()]);
    }
    $status = $_GET['status'] ?? 'pending';
    $where = []; $args = [];
    if (in_array($status, ['pending', 'published', 'removed'], true)) { $where[] = 'c.status = ?'; $args[] = $status; }
    if ($q !== '') { $where[] = '(c.body LIKE ? OR u.email LIKE ? OR u.display_name LIKE ? OR c.slug LIKE ?)'; array_push($args, $like, $like, $like, $like); }
    $sql = 'SELECT c.id, c.slug, c.body, c.status, c.created_at, c.published_at, u.id AS user_id, u.email, u.display_name, u.status AS user_status
            FROM comments c JOIN users u ON u.id = c.user_id' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY c.id DESC LIMIT 200';
    $st = $pdo->prepare($sql); $st->execute($args);
    json_out(['ok' => true, 'comments' => $st->fetchAll()]);
}

require_post();
$d = read_json();
$action = $_GET['action'] ?? '';
$id = (int) ($d['id'] ?? 0);
$status = (string) ($d['status'] ?? '');

if ($action === 'comment') {
    if (!in_array($status, ['published', 'removed', 'pending'], true)) fail('Bad status');
    $pdo->prepare('UPDATE comments SET status = ?, published_at = CASE WHEN ? = ? THEN ? ELSE published_at END WHERE id = ?')
        ->execute([$status, $status, 'published', now_utc(), $id]);
    json_out(['ok' => true]);
}
if ($action === 'user') {
    if (!in_array($status, ['new', 'verified', 'restricted', 'banned'], true)) fail('Bad status');
    if ($id === (int) $me['id'] && $status !== 'verified') fail('Not on your own account');
    if ($status === 'verified') { complete_second_verification($pdo, $id); json_out(['ok' => true]); }
    $pdo->prepare('UPDATE users SET status = ? WHERE id = ? AND role <> ?')->execute([$status, $id, 'staff']);
    if ($status === 'banned') $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$id]);
    json_out(['ok' => true]);
}
fail('Unknown action', 404);
