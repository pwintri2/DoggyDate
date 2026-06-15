<?php
/* ==========================================================================
   Doggy Date 🐾 — booking email handler (PHP mail() for Strato hosting)
   Receives a booking (JSON or form POST) from the website and emails it to
   the business inbox. Returns JSON: {"ok": true} or {"ok": false, ...}.
   ========================================================================== */

// Buffer all output so a stray notice/warning can't pollute the JSON body or
// break header() with "headers already sent".
ob_start();
header('Content-Type: application/json; charset=utf-8');

/* ----------------------------- CONFIG ----------------------------------- */
$TO      = 'info@wintrip.nl';
// IMPORTANT: the From address must be on YOUR OWN domain or Strato will reject
// it / it lands in spam. Change to e.g. noreply@<your-strato-domain>.
$FROM    = 'info@wintrip.nl';
$SUBJECT = 'Nieuwe Doggy Date boeking 🐾';
/* ------------------------------------------------------------------------ */

// Always emit clean JSON: discard any buffered output first, then exit.
function dd_respond($code, $payload) {
    if (ob_get_length() !== false) { ob_clean(); }
    if ($code !== 200) { http_response_code($code); }
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    dd_respond(405, array('ok' => false, 'error' => 'method_not_allowed'));
}

// Accept JSON body, fall back to classic form-encoded POST.
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// Strip CR/LF to prevent e-mail header injection; trim whitespace.
function dd_clean($v) {
    if (!is_string($v)) { $v = ''; }
    $v = str_replace(array("\r", "\n", "%0a", "%0d", "%0A", "%0D"), ' ', $v);
    return trim($v);
}
function dd_field($d, $k) {
    return isset($d[$k]) ? dd_clean($d[$k]) : '';
}

$service  = dd_field($data, 'serviceName');
$price    = dd_field($data, 'price');
$dogName  = dd_field($data, 'dogName');
$breed    = dd_field($data, 'breed');
$size     = dd_field($data, 'sizeLabel');
if ($size === '')   { $size   = dd_field($data, 'size'); }
$region   = dd_field($data, 'regionLabel');
if ($region === '') { $region = dd_field($data, 'region'); }
$date     = dd_field($data, 'date');
$time     = dd_field($data, 'time');
$spot     = dd_field($data, 'spot');
$rating   = dd_field($data, 'rating');
$email    = dd_field($data, 'email');
$lang     = dd_field($data, 'lang');
// Requests: allow multi-line, but normalise newlines.
$requests = isset($data['requests'])
    ? trim(preg_replace("/[\r\n]+/", "\n", (string) $data['requests']))
    : '';

// Minimal server-side validation (mirrors the front-end required fields).
if ($dogName === '' || $date === '' || $time === '' || $spot === '') {
    dd_respond(422, array('ok' => false, 'error' => 'missing_fields'));
}

// Ignore an invalid optional e-mail rather than failing the whole booking.
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $email = '';
}

$body  = "Nieuwe boeking via de Doggy Date website 🐾\n";
$body .= "==========================================\n\n";
$body .= "Dienst:           " . $service . ($price !== '' ? "  ($price)" : '') . "\n";
$body .= "Hond:             " . $dogName . ($breed !== '' ? "  ·  " . $breed : '') . "\n";
$body .= "Grootte:          " . $size . "\n";
$body .= "Regio:            " . $region . "\n";
$body .= "Datum:            " . $date . "\n";
$body .= "Tijd:             " . $time . "\n";
$body .= "Ontmoetingsplek:  " . $spot . "\n";
$body .= "Verwachte score:  " . $rating . "/5\n";
$body .= "Contact e-mail:   " . ($email !== '' ? $email : '(niet opgegeven)') . "\n";
$body .= "Taal:             " . $lang . "\n\n";
$body .= "Speciale verzoeken:\n";
$body .= ($requests !== '' ? $requests : '(geen)') . "\n\n";
$body .= "-- automatisch verzonden vanaf de Doggy Date website --\n";

// Reply-To the customer when we have their address, otherwise the inbox itself.
$replyTo = ($email !== '' ? $email : $TO);

$headers  = 'From: Doggy Date <' . $FROM . ">\r\n";
$headers .= 'Reply-To: ' . $replyTo . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
// quoted-printable survives 7-bit-only MTAs, so emoji/accents don't get mangled.
$headers .= "Content-Transfer-Encoding: quoted-printable\r\n";

// Encode the (emoji-containing) subject and body for UTF-8 mail clients.
$encodedSubject = '=?UTF-8?B?' . base64_encode($SUBJECT) . '?=';
$encodedBody    = quoted_printable_encode($body);

$sent = mail($TO, $encodedSubject, $encodedBody, $headers);

// Best-effort customer confirmation: only when a (valid) e-mail was supplied.
// Does NOT affect the response status — the business notification above does.
if ($email !== '') {
    if ($lang === 'nl') {
        $custSubject = 'Je Doggy Date is bevestigd 🐾';
        $custBody  = "Hoi!\n\n";
        $custBody .= "Bedankt voor je boeking bij Doggy Date 🐾\n";
        $custBody .= "We hebben je aanvraag ontvangen en nemen snel contact met je op om de details te bevestigen.\n\n";
        $custBody .= "Jouw boeking:\n";
        $custBody .= "• Dienst: " . $service . ($price !== '' ? " (" . $price . ")" : '') . "\n";
        $custBody .= "• Hond: " . $dogName . ($breed !== '' ? " · " . $breed : '') . "\n";
        $custBody .= "• Grootte: " . $size . "\n";
        $custBody .= "• Regio: " . $region . "\n";
        $custBody .= "• Datum: " . $date . "\n";
        $custBody .= "• Tijd: " . $time . "\n";
        $custBody .= "• Ontmoetingsplek: " . $spot . "\n";
        $custBody .= "• Verwachte score: " . $rating . "/5\n";
        $custBody .= ($requests !== '' ? "\nSpeciale verzoeken:\n" . $requests . "\n" : '');
        $custBody .= "\nKwispelende groet,\nHet Doggy Date team 🐾\n";
    } else {
        $custSubject = 'Your Doggy Date is confirmed 🐾';
        $custBody  = "Hi!\n\n";
        $custBody .= "Thanks for booking with Doggy Date 🐾\n";
        $custBody .= "We've received your request and will be in touch shortly to confirm the details.\n\n";
        $custBody .= "Your booking:\n";
        $custBody .= "• Service: " . $service . ($price !== '' ? " (" . $price . ")" : '') . "\n";
        $custBody .= "• Dog: " . $dogName . ($breed !== '' ? " · " . $breed : '') . "\n";
        $custBody .= "• Size: " . $size . "\n";
        $custBody .= "• Region: " . $region . "\n";
        $custBody .= "• Date: " . $date . "\n";
        $custBody .= "• Time: " . $time . "\n";
        $custBody .= "• Meeting spot: " . $spot . "\n";
        $custBody .= "• Expected rating: " . $rating . "/5\n";
        $custBody .= ($requests !== '' ? "\nSpecial requests:\n" . $requests . "\n" : '');
        $custBody .= "\nWaggy regards,\nThe Doggy Date team 🐾\n";
    }

    $custHeaders  = 'From: Doggy Date <' . $FROM . ">\r\n";
    $custHeaders .= 'Reply-To: ' . $TO . "\r\n";   // replies go to the business inbox
    $custHeaders .= "MIME-Version: 1.0\r\n";
    $custHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $custHeaders .= "Content-Transfer-Encoding: quoted-printable\r\n";

    $custEncSubject = '=?UTF-8?B?' . base64_encode($custSubject) . '?=';
    $custSent = mail($email, $custEncSubject, quoted_printable_encode($custBody), $custHeaders);
    if (!$custSent) {
        error_log('Doggy Date customer confirmation mail() failed (to=' . $email . ')');
    }
}

if ($sent) {
    dd_respond(200, array('ok' => true));
} else {
    // Keep a diagnostic in the PHP error log (Strato exposes it) without
    // leaking anything to the browser.
    error_log('Doggy Date mail() failed (TO=' . $TO . ', FROM=' . $FROM . ')');
    dd_respond(500, array('ok' => false, 'error' => 'mail_failed'));
}
