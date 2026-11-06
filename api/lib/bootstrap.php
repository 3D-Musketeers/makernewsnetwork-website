<?php
/**
 * Shared plumbing for every /api endpoint: config, database, JSON responses, sessions,
 * rate limits, tokens, mail. Scope: newsroom-docs/product/comment-auth-system.md.
 *
 * Database: MySQL on cPanel (DB_DSN mysql:...) or SQLite for local tests (DB_DSN sqlite:/path).
 * Times are stored as UTC 'Y-m-d H:i:s' strings so both engines compare them the same way.
 */
declare(strict_types=1);

/**
 * ONE switch for comments, accounts, sign-in and moderation: "comments" in /site-config.json.
 * Off by default. When it is off every account endpoint answers 503 before it touches the config or the
 * database (the CLI is exempt so Grant can still run make-staff before switching on). No code is removed.
 */
function comments_enabled(): bool
{
    $f = dirname(__DIR__, 2) . '/site-config.json';
    $j = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    return is_array($j) && ($j['comments'] ?? false) === true;
}
if (PHP_SAPI !== 'cli' && !comments_enabled()) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Comments and accounts are not open yet', 'comments_off' => true]);
    exit;
}

$configPath = __DIR__ . '/../config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Server not configured']);
    exit;
}
require_once $configPath;

foreach (['DB_DSN', 'APP_URL', 'AUTH_SECRET', 'MAIL_FROM_ADDRESS'] as $k) {
    if (!defined($k)) { http_response_code(500); header('Content-Type: application/json'); echo json_encode(['ok' => false, 'error' => 'Config missing ' . $k]); exit; }
}
if (!defined('DB_USER')) define('DB_USER', null);
if (!defined('DB_PASS')) define('DB_PASS', null);
if (!defined('MAIL_FROM_NAME')) define('MAIL_FROM_NAME', 'Maker News Network');
if (!defined('MAIL_DEV_LOG')) define('MAIL_DEV_LOG', '');           // local only: write mail to this file instead of sending
if (!defined('SECOND_MIN_HOURS')) define('SECOND_MIN_HOURS', 1);   // second verification window, per the scope doc
if (!defined('SECOND_MAX_HOURS')) define('SECOND_MAX_HOURS', 24);
if (!defined('SECOND_GRACE_DAYS')) define('SECOND_GRACE_DAYS', 7); // after the second mail: complete it within this, or the account is restricted
if (!defined('SESSION_DAYS')) define('SESSION_DAYS', 30);

function now_utc(int $offsetSeconds = 0): string { return gmdate('Y-m-d H:i:s', time() + $offsetSeconds); }

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        if (str_starts_with(DB_DSN, 'sqlite:')) { $pdo->exec('PRAGMA foreign_keys = ON'); $pdo->exec('PRAGMA journal_mode = WAL'); }
        ensure_schema($pdo);
    }
    return $pdo;
}

function ensure_schema(PDO $pdo): void
{
    $sqlite = str_starts_with(DB_DSN, 'sqlite:');
    $id = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
    $tail = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id $id,
        email VARCHAR(190) NOT NULL UNIQUE,
        display_name VARCHAR(60) NOT NULL,
        provider VARCHAR(20) NOT NULL DEFAULT 'email',
        provider_id VARCHAR(190) NULL,
        signup_ip VARCHAR(45) NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        created_at VARCHAR(19) NOT NULL,
        first_verified_at VARCHAR(19) NULL,
        second_due_at VARCHAR(19) NULL,
        second_sent_at VARCHAR(19) NULL,
        second_verified_at VARCHAR(19) NULL
    )$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS tokens (
        id $id,
        user_id INT NOT NULL,
        kind VARCHAR(20) NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at VARCHAR(19) NOT NULL,
        used_at VARCHAR(19) NULL,
        created_at VARCHAR(19) NOT NULL
    )$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
        id $id,
        user_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        created_at VARCHAR(19) NOT NULL,
        expires_at VARCHAR(19) NOT NULL,
        last_seen_at VARCHAR(19) NOT NULL
    )$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS comments (
        id $id,
        slug VARCHAR(190) NOT NULL,
        user_id INT NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at VARCHAR(19) NOT NULL,
        published_at VARCHAR(19) NULL
    )$tail");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
        bucket VARCHAR(40) NOT NULL,
        key_hash CHAR(64) NOT NULL,
        window_start VARCHAR(19) NOT NULL,
        hits INT NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket, key_hash)
    )$tail");
    if ($sqlite) {
        $pdo->exec('CREATE INDEX IF NOT EXISTS comments_slug ON comments (slug, status)');
    } else {
        try { $pdo->exec('CREATE INDEX comments_slug ON comments (slug, status)'); } catch (Throwable $e) { /* exists */ }
    }
}

// ---------- responses ----------
function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}
function fail(string $msg, int $code = 400): void { json_out(['ok' => false, 'error' => $msg], $code); }
function read_json(): array
{
    $raw = file_get_contents('php://input');
    $d = json_decode($raw ?: '', true);
    return is_array($d) ? $d : [];
}
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45); }
function same_site_path(?string $p): string
{
    // Only a same-site path (one slash, then not another slash or backslash) is ever used for redirects.
    if (!is_string($p) || !preg_match('#^/(?![/\\\\])[^\s]*$#', $p)) return '/';
    return $p;
}
function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only', 405);
    // Defense in depth against cross-site form posts (the session cookie is SameSite=Lax already):
    // an HTML form cannot send application/json, so every state-changing call must.
    if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) fail('Send JSON', 415);
}
function require_staff(): array
{
    $u = current_user();
    if (!$u) fail('Sign in', 401);
    if ($u['role'] !== 'staff') fail('Staff only', 403);
    return $u;
}

// ---------- rate limits (windowed counter per bucket and salted key) ----------
function rate_limit(string $bucket, string $key, int $max, int $windowSeconds): void
{
    $pdo = db();
    $hash = hash('sha256', AUTH_SECRET . '|' . $bucket . '|' . $key);
    $now = time();
    $row = $pdo->prepare('SELECT window_start, hits FROM rate_limits WHERE bucket = ? AND key_hash = ?');
    $row->execute([$bucket, $hash]);
    $r = $row->fetch();
    if (!$r || strtotime($r['window_start'] . ' UTC') < $now - $windowSeconds) {
        $pdo->prepare('DELETE FROM rate_limits WHERE bucket = ? AND key_hash = ?')->execute([$bucket, $hash]);
        $pdo->prepare('INSERT INTO rate_limits (bucket, key_hash, window_start, hits) VALUES (?,?,?,1)')->execute([$bucket, $hash, now_utc()]);
        return;
    }
    if ((int) $r['hits'] >= $max) fail('Too many requests, try again later', 429);
    $pdo->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE bucket = ? AND key_hash = ?')->execute([$bucket, $hash]);
}

// ---------- tokens (only the SHA-256 is stored) ----------
function issue_token(int $userId, string $kind, int $ttlSeconds): string
{
    $raw = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO tokens (user_id, kind, token_hash, expires_at, created_at) VALUES (?,?,?,?,?)')
        ->execute([$userId, $kind, hash('sha256', $raw), now_utc($ttlSeconds), now_utc()]);
    return $raw;
}
function consume_token(string $raw, string $kind): ?array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $raw)) return null;
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM tokens WHERE token_hash = ? AND kind = ?');
    $st->execute([hash('sha256', $raw), $kind]);
    $t = $st->fetch();
    if (!$t || $t['used_at'] !== null || $t['expires_at'] < now_utc()) return null;
    $pdo->prepare('UPDATE tokens SET used_at = ? WHERE id = ?')->execute([now_utc(), $t['id']]);
    return $t;
}

// ---------- sessions (own table, cookie holds a random token; the SHA-256 is stored) ----------
const SESSION_COOKIE = 'mnn_session';
function start_session(int $userId): void
{
    $raw = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO sessions (user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?,?,?,?,?)')
        ->execute([$userId, hash('sha256', $raw), now_utc(), now_utc(SESSION_DAYS * 86400), now_utc()]);
    setcookie(SESSION_COOKIE, $raw, [
        'expires' => time() + SESSION_DAYS * 86400, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
        'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
    ]);
}
function current_user(): ?array
{
    static $user = false;
    if ($user !== false) return $user;
    $user = null;
    $raw = $_COOKIE[SESSION_COOKIE] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $raw)) return null;
    $pdo = db();
    $st = $pdo->prepare('SELECT s.id AS sid, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?');
    $st->execute([hash('sha256', $raw), now_utc()]);
    $u = $st->fetch();
    if (!$u) return null;
    $pdo->prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')->execute([now_utc(), $u['sid']]);
    unset($u['sid']);
    $user = $u;
    return $user;
}
function end_session(): void
{
    $raw = $_COOKIE[SESSION_COOKIE] ?? '';
    if (preg_match('/^[a-f0-9]{64}$/', $raw)) db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', $raw)]);
    setcookie(SESSION_COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
}
function public_user(array $u): array
{
    return [
        'id' => (int) $u['id'], 'display_name' => $u['display_name'], 'role' => $u['role'], 'status' => $u['status'],
        'second_verified' => $u['second_verified_at'] !== null,
        'second_pending' => $u['second_verified_at'] === null && $u['status'] !== 'restricted' && $u['status'] !== 'banned',
    ];
}

// ---------- users ----------
function display_name_from_email(string $email): string
{
    $local = strtolower(explode('@', $email)[0]);
    $local = preg_replace('/[^a-z0-9._-]/', '', $local) ?: 'reader';
    return substr($local, 0, 40);
}
function schedule_second_verification(PDO $pdo, int $userId): void
{
    // Random delay inside the window so the timing cannot be gamed (scope doc, anti-abuse notes).
    $delay = random_int(SECOND_MIN_HOURS * 3600, SECOND_MAX_HOURS * 3600);
    $pdo->prepare('UPDATE users SET second_due_at = ? WHERE id = ? AND second_due_at IS NULL')->execute([now_utc($delay), $userId]);
}
function mark_first_verified(PDO $pdo, array $user): void
{
    if ($user['first_verified_at'] === null) {
        $pdo->prepare('UPDATE users SET first_verified_at = ? WHERE id = ?')->execute([now_utc(), $user['id']]);
    }
    if ($user['second_verified_at'] === null) schedule_second_verification($pdo, (int) $user['id']);
}
function complete_second_verification(PDO $pdo, int $userId): void
{
    $pdo->prepare("UPDATE users SET second_verified_at = ?, status = 'verified' WHERE id = ? AND status <> 'banned'")->execute([now_utc(), $userId]);
    // Every held first comment goes live now.
    $pdo->prepare("UPDATE comments SET status = 'published', published_at = ? WHERE user_id = ? AND status = 'pending'")->execute([now_utc(), $userId]);
}

// ---------- mail ----------
function send_mail(string $to, string $subject, string $text): bool
{
    $headers = 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . ">\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    if (MAIL_DEV_LOG !== '') {
        file_put_contents(MAIL_DEV_LOG, "TO: $to\nSUBJECT: $subject\n$text\n----\n", FILE_APPEND);
        return true;
    }
    return @mail($to, $subject, $text, $headers);
}
function mail_magic_link(string $email, string $link, bool $isNew): bool
{
    $intro = $isNew ? "Welcome to Maker News Network. Click the link below to confirm your email and sign in."
                    : "Click the link below to sign in to Maker News Network.";
    $text = "$intro\n\n$link\n\nThe link works once and expires in 30 minutes. If you did not request it, ignore this email.\n\n"
          . ($isNew ? "One more thing: within the next day we will send a second confirmation link. Your first comment stays hidden until you click it. It is how we keep burner accounts out of the comments.\n\n" : '')
          . "Maker News Network\n" . APP_URL . "\n";
    return send_mail($email, 'Your sign-in link for Maker News Network', $text);
}
function mail_second_verification(string $email, string $link): bool
{
    $text = "Thanks for joining Maker News Network. This is the second of two confirmation links.\n\n$link\n\n"
          . "Click it and your comments go live immediately, now and in future. If you skip it, your comments stay hidden.\n"
          . "The link expires in " . SECOND_GRACE_DAYS . " days.\n\nMaker News Network\n" . APP_URL . "\n";
    return send_mail($email, 'One more click: confirm your Maker News Network account', $text);
}
