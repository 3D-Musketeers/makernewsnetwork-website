<?php
/**
 * Reader submission endpoint (tips, review requests, corrections, site feedback).
 * POST JSON: { kind, name, email, url, message, credit, website(honeypot) }
 * Returns JSON: { ok:true } or { ok:false, error }
 *
 * Emails the inbox defined in api/config.php (gitignored, server-only), nothing else.
 * No database, no IP storage (the submit page promises that). Per-IP throttle uses a
 * hashed IP in a temp file that is deleted after the window, so nothing identifying is kept.
 */
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'POST only']); exit; }

$config = __DIR__ . '/config.php';
if (!file_exists($config)) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Server not configured']); exit; }
require_once $config;
if (!defined('SUBMIT_TO_EMAIL') || !defined('SUBMIT_FROM_EMAIL')) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Server config incomplete']); exit; }

$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid JSON']); exit; }

// Honeypot: bots fill it, people never see it. Pretend success.
if (!empty($d['website'])) { echo json_encode(['ok'=>true]); exit; }

// Throttle: 5 submissions per IP per 10 minutes, keyed by a salted hash (no raw IP on disk).
$salt = defined('SUBMIT_SALT') ? SUBMIT_SALT : 'mnn';
$key = hash('sha256', $salt . ($_SERVER['REMOTE_ADDR'] ?? ''));
$bucket = sys_get_temp_dir() . '/mnn-submit-' . $key;
$hits = file_exists($bucket) ? array_filter(array_map('intval', file($bucket, FILE_IGNORE_NEW_LINES)), function ($t) { return $t > time() - 600; }) : [];
if (count($hits) >= 5) { http_response_code(429); echo json_encode(['ok'=>false,'error'=>'Too many submissions, try again later']); exit; }
$hits[] = time();
file_put_contents($bucket, implode("\n", $hits));

function field($d, $k, $max) { $v = isset($d[$k]) && is_string($d[$k]) ? trim($d[$k]) : ''; return mb_substr($v, 0, $max); }
$kinds = ['tip','review-request','correction','feedback','other'];
$kind = in_array($d['kind'] ?? '', $kinds, true) ? $d['kind'] : 'other';
$name = field($d, 'name', 120);
$email = field($d, 'email', 200);
$url = field($d, 'url', 500);
$message = field($d, 'message', 4000);
$credit = in_array($d['credit'] ?? '', ['name','first','anon'], true) ? $d['credit'] : 'name';

if (mb_strlen($message) < 40) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Please add more detail']); exit; }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'That email address does not look right']); exit; }
if ($url !== '' && !filter_var($url, FILTER_VALIDATE_URL)) { $url = '(invalid link removed) ' . preg_replace('/[^\x20-\x7E]/', '', $url); }

// Header-injection hardening: nothing user-supplied goes into headers except a validated email.
$subject = '[MNN ' . $kind . '] ' . ($name !== '' ? preg_replace('/[\r\n]+/', ' ', $name) : 'anonymous');
$body = "Kind: $kind\nName: " . ($name ?: '-') . "\nEmail: " . ($email ?: '-') . "\nLink: " . ($url ?: '-') . "\nCredit: $credit\nReceived: " . date('c') . "\n\n" . $message . "\n";
$headers = "From: " . SUBMIT_FROM_EMAIL . "\r\nContent-Type: text/plain; charset=UTF-8\r\n";
if ($email !== '') { $headers .= "Reply-To: $email\r\n"; }

if (@mail(SUBMIT_TO_EMAIL, $subject, $body, $headers)) { echo json_encode(['ok'=>true]); }
else { http_response_code(502); echo json_encode(['ok'=>false,'error'=>'Mail failed']); }
