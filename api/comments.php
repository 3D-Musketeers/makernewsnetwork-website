<?php
/**
 * Comments on review and article pages.
 *   GET  /api/comments.php?slug=/reviews/printers/x/         -> {ok, comments:[...], user}
 *        Published comments for everyone. The signed-in author also sees their own pending ones.
 *   POST /api/comments.php            {slug, body}            -> {ok, comment}
 *        Needs a session. Fully verified accounts publish at once; new accounts are held as pending
 *        until the second verification clears (then bootstrap's complete_second_verification publishes them).
 *   POST /api/comments.php?action=remove   {id}               -> author removes own comment; staff can remove any
 * Bodies are stored as plain text and rendered with textContent on the client. No HTML ever.
 */
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

function clean_slug(string $s): string
{
    $s = strtolower(trim($s));
    if (!preg_match('#^/[a-z0-9/_-]{1,180}/$#', $s)) fail('Bad page reference');
    return $s;
}

if ($method === 'GET') {
    $slug = clean_slug((string) ($_GET['slug'] ?? ''));
    $me = current_user();
    $sql = "SELECT c.id, c.body, c.status, c.created_at, c.user_id, u.display_name, u.role
            FROM comments c JOIN users u ON u.id = c.user_id
            WHERE c.slug = ? AND (c.status = 'published'" . ($me ? " OR (c.status = 'pending' AND c.user_id = ?)" : '') . ")
            ORDER BY c.created_at ASC LIMIT 500";
    $st = $pdo->prepare($sql);
    $st->execute($me ? [$slug, $me['id']] : [$slug]);
    $out = [];
    foreach ($st as $r) {
        $out[] = [
            'id' => (int) $r['id'], 'body' => $r['body'], 'status' => $r['status'], 'created_at' => $r['created_at'] . 'Z',
            'display_name' => $r['display_name'], 'staff' => $r['role'] === 'staff', 'mine' => $me && (int) $r['user_id'] === (int) $me['id'],
        ];
    }
    json_out(['ok' => true, 'comments' => $out, 'user' => $me ? public_user($me) : null]);
}

require_post();
$me = current_user();
if (!$me) fail('Sign in to comment', 401);
$d = read_json();

if ($action === 'remove') {
    $id = (int) ($d['id'] ?? 0);
    $st = $pdo->prepare('SELECT user_id FROM comments WHERE id = ?');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) fail('Not found', 404);
    if ((int) $c['user_id'] !== (int) $me['id'] && $me['role'] !== 'staff') fail('Not yours', 403);
    $pdo->prepare("UPDATE comments SET status = 'removed' WHERE id = ?")->execute([$id]);
    json_out(['ok' => true]);
}

if (in_array($me['status'], ['restricted', 'banned'], true)) fail('This account cannot post. Check your email for the second confirmation link, or contact legal@makernewsnetwork.com.', 403);
$slug = clean_slug((string) ($d['slug'] ?? ''));
$body = trim((string) ($d['body'] ?? ''));
$body = preg_replace("/\r\n?/", "\n", $body);
$body = preg_replace("/\n{3,}/", "\n\n", $body);
if (mb_strlen($body) < 2) fail('Say a little more');
if (mb_strlen($body) > 3000) fail('Keep it under 3000 characters');
rate_limit('comment-user', (string) $me['id'], 20, 3600);
rate_limit('comment-user-burst', (string) $me['id'], 1, 20);

$status = $me['second_verified_at'] !== null ? 'published' : 'pending';
$pdo->prepare('INSERT INTO comments (slug, user_id, body, status, created_at, published_at) VALUES (?,?,?,?,?,?)')
    ->execute([$slug, $me['id'], $body, $status, now_utc(), $status === 'published' ? now_utc() : null]);
$id = (int) $pdo->lastInsertId();
json_out(['ok' => true, 'comment' => [
    'id' => $id, 'body' => $body, 'status' => $status, 'created_at' => now_utc() . 'Z',
    'display_name' => $me['display_name'], 'staff' => $me['role'] === 'staff', 'mine' => true,
]]);
