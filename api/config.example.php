<?php
// Copy to api/config.php ON THE SERVER and fill in. config.php is gitignored and never served.
// Agents never type secrets; Grant does.

// --- reader submissions (api/submit.php) ---
define('SUBMIT_TO_EMAIL', 'tips@makernewsnetwork.com');
define('SUBMIT_FROM_EMAIL', 'no-reply@makernewsnetwork.com');
define('SUBMIT_SALT', 'change-me-to-a-long-random-string');

// --- accounts and comments (api/auth.php, oauth.php, comments.php, cron/second-verification.php) ---
// cPanel MySQL: create a database and user in cPanel > MySQL Databases, grant ALL on it.
define('DB_DSN', 'mysql:host=localhost;dbname=CPANELUSER_mnn;charset=utf8mb4');
define('DB_USER', 'CPANELUSER_mnn');
define('DB_PASS', 'REPLACE');
// Local testing instead: define('DB_DSN', 'sqlite:' . __DIR__ . '/../../mnn-local.sqlite');

define('APP_URL', 'https://mnn.3dmusketeers.com');            // the host this folder is served on, no trailing slash; links in emails use it
define('AUTH_SECRET', 'REPLACE_WITH_64_RANDOM_HEX_CHARS');      // signs OAuth state and rate-limit keys
define('MAIL_FROM_ADDRESS', 'no-reply@makernewsnetwork.com');
define('MAIL_FROM_NAME', 'Maker News Network');
// define('MAIL_DEV_LOG', __DIR__ . '/../../mnn-mail.log');    // local only: write emails to a file instead of sending

// Second verification window (hours) and how long the second link stays valid (days).
define('SECOND_MIN_HOURS', 1);
define('SECOND_MAX_HOURS', 24);
define('SECOND_GRACE_DAYS', 7);

// Social sign-in. Register the redirect URI APP_URL . '/api/oauth.php?provider=google' at
// console.cloud.google.com (OAuth client, Web application) and '...?provider=discord' at
// discord.com/developers (OAuth2 > Redirects). Leave blank to hide that button.
define('GOOGLE_CLIENT_ID', '');
define('GOOGLE_CLIENT_SECRET', '');
define('DISCORD_CLIENT_ID', '');
define('DISCORD_CLIENT_SECRET', '');

// Lets the second-verification cron be triggered over HTTP (?key=...) when a CLI cron is not available.
define('CRON_KEY', '');
