# LULU CARE Android / Google Play

Package: `com.lulucare.posture`, version 1.0.0 (1), Android 8+ (min 26), target/compile API 36.
Uses Google's Android Browser Helper 2.7.3 Trusted Web Activity (TWA).
The existing production site provides the app functionality. A compatible updated browser (Chrome recommended) and internet are required.
No API keys, credentials, customer records, or signing private keys are included.
Camera/file selection use the browser permission and picker flows; no broad storage, location or microphone permissions are requested.
Screen-off/background posture monitoring is NOT supported.

## Build
Install Android Studio, JDK 17, Android SDK Platform 36 and Build Tools 36.0.0.
Open this directory in Android Studio, or:
```sh
./gradlew :app:assembleDebug :app:bundleRelease
```
Without signing configuration, release AAB is UNSIGNED and cannot be submitted to Play.
Outputs: app/build/outputs/apk/debug/app-debug.apk and app/build/outputs/bundle/release/app-release.aab.
Debug APK is for testing only and is not associated with the production domain by default; it may show a browser bar.

## Release signing
Use a developer-owned upload keystore stored outside this repository.
Provide all four environment variables before running bundleRelease:
LULU_KEYSTORE (absolute path), LULU_STORE_PASSWORD, LULU_KEY_ALIAS, LULU_KEY_PASSWORD.
Never put secrets in Git, source files, command history, issue comments, or chat.
Alternatively use Android Studio > Generate Signed Bundle / APK and choose Android App Bundle.
Enable Play App Signing in Play Console. Keep the upload key securely backed up.
Increment versionCode for every Play upload.

## App/site verification
In Play Console > App integrity, obtain the **APP SIGNING** certificate SHA-256 (not just the upload certificate).
Set Vercel Production env ANDROID_APP_SHA256 to that colon-separated fingerprint.
Multiple approved certificates can be comma-separated (e.g. Play signing-key upgrade).
Redeploy the site. The public URL must return JSON, HTTP 200, without authentication or redirects:
https://posture-analyzer-five.vercel.app/.well-known/assetlinks.json
Until the certificate is configured and verification succeeds, the app falls back to a browser tab.
Never disable verification in a release build.
Test the Play-delivered internal-track build, since its signing key differs from local debug.

## Store submission still required
- Developer account and verified developer identity; confirm package name before first upload.
- Developer-owned upload signing key and Play App Signing certificate.
- Public privacy policy identifying the operator, actual data use, retention and contact.
- Working in-app and public-web account/data deletion request paths (existing customer account creation makes this required).
- Accurate Data safety, Health apps declaration, content rating and app access/reviewer login.
- App icon, feature graphic and actual Galaxy screenshots; no fabricated claims/screenshots.
- Internal/closed testing and production access required by the developer account.
- Device tests below. Build success is not store approval or a measurement accuracy validation.

## Galaxy acceptance tests
1. Install from Play internal testing; verify full-screen launch and correct app icon.
2. Existing account login, customer/admin authorization, saved records.
3. Camera permission allow/deny/retry; front/rear camera, mirror, portrait/landscape.
4. Posture, shoulder, elbow and both balance legs; voice/vibration with device volume.
5. InBody camera/gallery selection, OCR, dates, save and reopen records.
6. Back navigation, external links, offline screen and reconnect.
7. Background/foreground/pause/end measurement; no duplicate alerts or unexpected camera retention.
8. Account/data deletion and privacy link before production submission.

Official references:
https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
https://developer.android.com/google/play/requirements/target-sdk
https://support.google.com/googleplay/android-developer/answer/13327111
https://support.google.com/googleplay/android-developer/answer/16679511
