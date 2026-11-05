<?php
/**
 * Email magic-link auth and session endpoints.
 *   POST /api/auth.php?action=request-link   {email, next}   -> sends a sign-in link (creates the account if new)
 *   GET  /api/auth.php?action=verify&token=...&next=/path    -> first verification + login, redirects to next
 *   GET  /api/auth.php?action=second&token=...               -> second verification, redirects to /account-verified/
 *   GET  /api/auth.php?action=me                             -> {ok, user|null}
 *   POST /api/auth.php?action=logout
 */
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

$action = $_GET['action'] ?? '';
$pdo = db();

if ($action === 'me') {
    $u = current_user();
    json_out(['ok' => true, 'user' => $u ? public_user($u) : null]);
}

if ($action === 'logout') {
    require_post();
    end_session();
    json_out(['ok' => true]);
}

if ($action === 'request-link') {
    require_post();
    $d = read_json();
    $email = strtolower(trim((string) ($d['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) fail('That email address does not look right');
    rate_limit('link-ip', client_ip(), 10, 3600);
    rate_limit('link-email', $email, 3, 900);
    $next = same_site_path($d['next'] ?? '/');

    $st = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch();
    $isNew = false;
    if (!$user) {
        rate_limit('signup-ip', client_ip(), 5, 86400);   // speed bump against mass signups from one address
        $pdo->prepare('INSERT INTO users (email, display_name, provider, signup_ip, created_at) VALUES (?,?,?,?,?)')
            ->execute([$email, display_name_from_email($email), 'email', client_ip(), now_utc()]);
        $st->execute([$email]);
        $user = $st->fetch();
        $isNew = true;
    }
    if ($user['status'] === 'banned') json_out(['ok' => true]); // say nothing different
    $token = issue_token((int) $user['id'], 'magic', 1800);
    $link = APP_URL . '/api/auth.php?action=verify&token=' . $token . '&next=' . rawurlencode($next);
    mail_magic_link($email, $link, $isNew);
    json_out(['ok' => true, 'new' => $isNew]);
}

if ($action === 'verify') {
    $t = consume_token((string) ($_GET['token'] ?? ''), 'magic');
    $next = same_site_path($_GET['next'] ?? '/');
    if (!$t) { header('Location: /sign-in/?expired=1&next=' . rawurlencode($next), true, 302); exit; }
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $st->execute([$t['user_id']]);
    $user = $st->fetch();
    if (!$user || $user['status'] === 'banned') { header('Location: /sign-in/?expired=1', true, 302); exit; }
    mark_first_verified($pdo, $user);
    start_session((int) $user['id']);
    header('Location: ' . $next, true, 302);
    exit;
}

if ($action === 'second') {
    $t = consume_token((string) ($_GET['token'] ?? ''), 'second');
    if (!$t) { header('Location: /sign-in/?second=expired', true, 302); exit; }
    complete_second_verification($pdo, (int) $t['user_id']);
    if (!current_user()) start_session((int) $t['user_id']);
    header('Location: /sign-in/?second=done', true, 302);
    exit;
}

fail('Unknown action', 404);
