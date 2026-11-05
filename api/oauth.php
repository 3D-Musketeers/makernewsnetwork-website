<?php
/**
 * Google and Discord sign-in (OAuth 2.0 authorization code flow).
 *   GET /api/oauth.php?provider=google|discord&next=/path   -> redirects to the provider
 *   GET /api/oauth.php?provider=...&code=...&state=...      -> callback, creates/links the account, starts a session
 * The provider has already verified the email, so this counts as first verification; the delayed second
 * verification still applies to new accounts (same rule for every signup method).
 * Needs GOOGLE_CLIENT_ID/SECRET and/or DISCORD_CLIENT_ID/SECRET in api/config.php. Redirect URI to register
 * with each provider: APP_URL . '/api/oauth.php?provider=google' (or discord).
 */
declare(strict_types=1);
require_once __DIR__ . '/lib/bootstrap.php';

$providers = [
    'google' => [
        'auth' => 'https://accounts.google.com/o/oauth2/v2/auth', 'token' => 'https://oauth2.googleapis.com/token',
        'user' => 'https://openidconnect.googleapis.com/v1/userinfo', 'scope' => 'openid email profile',
        'id' => defined('GOOGLE_CLIENT_ID') ? GOOGLE_CLIENT_ID : '', 'secret' => defined('GOOGLE_CLIENT_SECRET') ? GOOGLE_CLIENT_SECRET : '',
    ],
    'discord' => [
        'auth' => 'https://discord.com/oauth2/authorize', 'token' => 'https://discord.com/api/oauth2/token',
        'user' => 'https://discord.com/api/users/@me', 'scope' => 'identify email',
        'id' => defined('DISCORD_CLIENT_ID') ? DISCORD_CLIENT_ID : '', 'secret' => defined('DISCORD_CLIENT_SECRET') ? DISCORD_CLIENT_SECRET : '',
    ],
];
$name = $_GET['provider'] ?? '';
if (!isset($providers[$name])) fail('Unknown provider', 404);
$p = $providers[$name];
if ($p['id'] === '' || $p['secret'] === '') fail(ucfirst($name) . ' sign-in is not set up yet', 503);
$redirectUri = APP_URL . '/api/oauth.php?provider=' . $name;
$cookieName = 'mnn_oauth_' . $name;

if (!isset($_GET['code'])) {
    // Step 1: send the visitor to the provider. State = random nonce + signed next path, kept in a short cookie.
    $nonce = bin2hex(random_bytes(16));
    $next = same_site_path($_GET['next'] ?? '/');
    $state = $nonce . '.' . rtrim(strtr(base64_encode($next), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $state, AUTH_SECRET);
    setcookie($cookieName, $sig, ['expires' => time() + 600, 'path' => '/api/', 'httponly' => true, 'samesite' => 'Lax']);
    $q = ['client_id' => $p['id'], 'redirect_uri' => $redirectUri, 'response_type' => 'code', 'scope' => $p['scope'], 'state' => $state];
    if ($name === 'google') $q['prompt'] = 'select_account';
    header('Location: ' . $p['auth'] . '?' . http_build_query($q), true, 302);
    exit;
}

// Step 2: callback
$state = (string) ($_GET['state'] ?? '');
$sig = (string) ($_COOKIE[$cookieName] ?? '');
setcookie($cookieName, '', ['expires' => time() - 3600, 'path' => '/api/']);
if ($sig === '' || !hash_equals(hash_hmac('sha256', $state, AUTH_SECRET), $sig)) fail('Sign-in state did not match. Start again.', 400);
$parts = explode('.', $state, 2);
$next = same_site_path(base64_decode(strtr($parts[1] ?? '', '-_', '+/')) ?: '/');

function http_post_form(string $url, array $fields): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($fields), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded']]);
    $r = curl_exec($ch); curl_close($ch);
    return is_string($r) ? (json_decode($r, true) ?: []) : [];
}
function http_get_bearer(string $url, string $token): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Accept: application/json', 'User-Agent: MakerNewsNetwork/1.0']]);
    $r = curl_exec($ch); curl_close($ch);
    return is_string($r) ? (json_decode($r, true) ?: []) : [];
}

$tok = http_post_form($p['token'], ['client_id' => $p['id'], 'client_secret' => $p['secret'], 'code' => (string) $_GET['code'], 'grant_type' => 'authorization_code', 'redirect_uri' => $redirectUri]);
if (empty($tok['access_token'])) fail('The provider did not return a token. Start again.', 502);
$info = http_get_bearer($p['user'], (string) $tok['access_token']);

if ($name === 'google') {
    $email = strtolower((string) ($info['email'] ?? '')); $verified = !empty($info['email_verified']); $pid = (string) ($info['sub'] ?? ''); $dn = (string) ($info['name'] ?? '');
} else {
    $email = strtolower((string) ($info['email'] ?? '')); $verified = !empty($info['verified']); $pid = (string) ($info['id'] ?? ''); $dn = (string) ($info['global_name'] ?? $info['username'] ?? '');
}
if ($email === '' || !$verified || $pid === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Your ' . ucfirst($name) . ' account has no verified email, so it cannot be used here.', 400);
$dn = trim(preg_replace('/[^\x20-\x7E]/', '', $dn)) ?: display_name_from_email($email);
$dn = substr($dn, 0, 40);

$pdo = db();
$st = $pdo->prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?');
$st->execute([$name, $pid]);
$user = $st->fetch();
if (!$user) {
    $st = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch();
    if ($user) {
        // Same email already has an account (email link or the other provider): link it, do not duplicate.
        if ($user['provider'] === 'email') $pdo->prepare('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?')->execute([$name, $pid, $user['id']]);
    } else {
        rate_limit('signup-ip', client_ip(), 5, 86400);
        $pdo->prepare('INSERT INTO users (email, display_name, provider, provider_id, signup_ip, created_at) VALUES (?,?,?,?,?,?)')
            ->execute([$email, $dn, $name, $pid, client_ip(), now_utc()]);
        $st = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $st->execute([$email]);
        $user = $st->fetch();
    }
}
if ($user['status'] === 'banned') fail('This account cannot sign in.', 403);
mark_first_verified($pdo, $user);
start_session((int) $user['id']);
header('Location: ' . $next, true, 302);
exit;
