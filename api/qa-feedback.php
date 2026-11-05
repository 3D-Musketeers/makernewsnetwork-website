<?php
/**
 * QA Feedback -> GitHub Issues proxy
 *
 * Receives feedback from the client-side QA widget and creates a GitHub Issue
 * on the configured repo. Keeps the PAT server-side so it never reaches the browser.
 *
 * POST /api/qa-feedback.php
 * Body (JSON): { url, category, priority, description, timestamp, browser }
 * Returns (JSON): { ok:true, issue_url } or { ok:false, error }
 */

// -- CORS ---------------------------------------------------------------------
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'https://qa.makernewsnetwork.com',
    'http://qa.makernewsnetwork.com',
    'http://localhost',
    'http://127.0.0.1',
];
// Allow any localhost port (dev servers)
if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -- METHOD CHECK -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Only POST allowed']);
    exit;
}

// -- CONFIG -------------------------------------------------------------------
$config_path = __DIR__ . '/qa-feedback-config.php';
if (!file_exists($config_path)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server config missing']);
    exit;
}
require_once $config_path;

if (!defined('QA_GITHUB_TOKEN') || !defined('QA_GITHUB_REPO')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server config incomplete']);
    exit;
}

// -- PARSE INPUT --------------------------------------------------------------
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Required fields
$required = ['url', 'category', 'priority', 'description'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "Missing field: $field"]);
        exit;
    }
}

// -- BUILD ISSUE --------------------------------------------------------------
foreach (['url', 'category', 'priority', 'description'] as $field) {
    if (!is_string($data[$field])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid field: ' . $field]);
        exit;
    }
}
$category    = mb_substr($data['category'], 0, 40);
$priority    = preg_replace('/[^a-z]/', '', strtolower(mb_substr($data['priority'], 0, 12)));
$description = mb_substr($data['description'], 0, 3000);
$page_url    = mb_substr($data['url'], 0, 500);
$timestamp   = isset($data['timestamp']) ? $data['timestamp'] : time() * 1000;
$browser     = isset($data['browser'])   ? $data['browser']   : 'Unknown';

// Title: [QA] [Category] first ~60 chars of description
$short_desc = mb_strlen($description) > 60
    ? mb_substr($description, 0, 57) . '...'
    : $description;
// Collapse newlines for the title
$short_desc = preg_replace('/\s+/', ' ', $short_desc);
$title = "[QA] [$category] $short_desc";

// Body
$ts_formatted = date('M j, Y g:i A T', intval($timestamp / 1000));
$body = <<<MD
## QA Feedback

| Field | Value |
|---|---|
| **Page** | $page_url |
| **Category** | $category |
| **Priority** | $priority |
| **Submitted** | $ts_formatted |
| **Browser** | $browser |

### Description

$description

---
*Submitted via QA Feedback widget*
MD;

// Labels
$pri_label = 'priority-' . strtolower($priority);
$labels = ['qa-feedback', $pri_label];

$payload = json_encode([
    'title'  => $title,
    'body'   => $body,
    'labels' => $labels,
]);

// -- GITHUB API CALL ----------------------------------------------------------
$api_url = 'https://api.github.com/repos/' . QA_GITHUB_REPO . '/issues';

$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . QA_GITHUB_TOKEN,
        'Content-Type: application/json',
        'User-Agent: MNN-QA-Feedback-Widget',
        'X-GitHub-Api-Version: 2022-11-28',
    ],
    CURLOPT_TIMEOUT        => 15,
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'GitHub API unreachable']);
    exit;
}

$result = json_decode($response, true);

if ($http_code === 201 && isset($result['html_url'])) {
    echo json_encode([
        'ok'        => true,
        'issue_url' => $result['html_url'],
        'issue_num' => $result['number'],
    ]);
} else {
    // Surface a safe error message (don't leak the full GitHub response)
    $gh_msg = isset($result['message']) ? $result['message'] : 'Unknown error';
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => "GitHub: $gh_msg"]);
}
