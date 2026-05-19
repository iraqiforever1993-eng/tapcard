# TapCard – iOS + Android setup

This project is the TapCard web app wrapped with **[Capacitor](https://capacitorjs.com/)** so it ships as real iOS and Android apps. The web build is unchanged: `npm run dev` and `npm run build` still work exactly as before.

---

## 1. What's in this project

```
tapcard/
├── client/                    ← React frontend (unchanged + native helpers)
│   └── src/lib/native.ts      ← Capacitor wrappers (NFC, Camera, Contacts, Haptics)
├── server/                    ← Express + SQLite backend (unchanged)
├── capacitor.config.ts        ← Capacitor configuration
├── ios/                       ← Generated Xcode project
├── android/                   ← Generated Android Studio project
├── resources/
│   ├── icon.png               ← 1024×1024 source icon
│   └── splash.png             ← 2732×2732 source splash
└── SETUP.md                   ← (this file)
```

### How the native app talks to the backend

`capacitor.config.ts` sets `server.url` to the **live deployed web app**:

```ts
server: {
  url: 'https://www.perplexity.ai/computer/a/tapcard-3pYyvQkIQJCpUgfnBybOrw',
}
```

That means **the native shell loads the hosted web app directly** — when you redeploy the web app, both mobile apps pick up the changes automatically. No rebuild / reinstall needed. See the "Going production / offline" section below for the alternative.

---

## 2. Prerequisites

| You need              | For                                             | Install                                    |
| --------------------- | ----------------------------------------------- | ------------------------------------------ |
| **Node 20+**          | All commands                                    | `brew install node` or nvm                 |
| **Xcode 15+**         | iOS build & simulator                           | Mac App Store                              |
| **CocoaPods**         | iOS native dependencies                         | `brew install cocoapods` then `pod setup`  |
| **Android Studio**    | Android build (recent stable, with SDK 34+)     | https://developer.android.com/studio       |
| **JDK 17**            | Android Gradle build                            | bundled with Android Studio                |

After unzipping:

```bash
cd tapcard
npm install
npm run build        # builds the web bundle into dist/public
npx cap sync         # copies dist/public into ios/ and android/, runs pod install
```

`npx cap sync` will run `pod install` automatically on macOS once CocoaPods is set up — that's the step that crashes most first-time Capacitor users. Make sure `pod --version` prints a version before continuing.

---

## 3. Run on iOS

### Simulator

```bash
npx cap open ios
```

In Xcode:

1. Pick a simulator (e.g. iPhone 15 Pro) in the target dropdown.
2. Hit **Run** (▶︎).

> ⚠️ **The iOS simulator does not have NFC hardware.** The "Write to NFC tag" button will appear and trigger the JS code, but the system NFC sheet won't be able to actually scan anything. To test NFC, run on a real iPhone.

### Real iPhone (free Apple ID, 7-day cert)

1. Plug in your iPhone with a USB cable, trust the computer.
2. In Xcode, click **App** in the file tree → **Signing & Capabilities**.
3. Under **Team**, pick your personal Apple ID (free) or paid Developer account.
4. Xcode will auto-generate a bundle ID. You can change it back to `com.tapcard.app` only if you're the only one using that ID anywhere.
5. **Add the NFC capability:** in the same screen, click **+ Capability**, pick **Near Field Communication Tag Reading**. This adds an entitlement that the OS requires before it will let your app open a write session.
6. Pick your iPhone in the target dropdown, hit **Run**.
7. First launch: on your iPhone go to **Settings → General → VPN & Device Management → trust your developer cert**.

> ⚠️ **NFC writing requires a paid Apple Developer Program account ($99/yr).** The free personal team can sign apps that *read* NFC tags, but the **write** entitlement (`com.apple.developer.nfc.readersession.formats` with `TAG`) is a "paid teams only" entitlement. With a free Apple ID the write call will fail at the system level. This is an Apple restriction, not a TapCard one.

---

## 4. Run on Android

### Emulator

```bash
npx cap open android
```

In Android Studio: pick a Pixel emulator and hit **Run**.

> ⚠️ **Android emulators do not have NFC hardware.** Use a real phone to test NFC.

### Real Android phone

1. Enable **Developer options**: Settings → About phone → tap "Build number" 7 times.
2. In Developer options, turn on **USB debugging**.
3. Plug the phone in over USB, accept the trust prompt on the phone.
4. In Android Studio pick your phone as the target, hit **Run**. The APK installs and launches.

### Build a sideloadable APK

```bash
cd android
./gradlew assembleDebug
# APK lands here:
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

Copy `app-debug.apk` to your phone (any file transfer) and tap it — you'll have to allow "install from this source" the first time.

For a signed release APK / AAB, follow https://developer.android.com/studio/publish/app-signing.

---

## 5. How TapCard's NFC flow works

In the web app, the Dashboard's NFC card just shows your public URL and tells you to use the third-party "NFC Tools" app. **In the native app, that section now has a "Write to NFC tag" button.**

When you tap it:

1. A short haptic taps to confirm.
2. iOS: a system NFC sheet slides up saying "Ready to Scan". Hold a blank NFC tag near the top of your iPhone.
3. Android: the app starts an NFC reader session. Tap the back of your phone to the tag.
4. The plugin writes an NDEF URI record containing your public URL.
5. Success haptic + toast confirms.

After that, anyone tapping their phone to the tag will open `https://www.perplexity.ai/.../#/c/your-slug`.

**Plugin used:** [`@capgo/capacitor-nfc@8`](https://www.npmjs.com/package/@capgo/capacitor-nfc) — the wrapper is in `client/src/lib/native.ts` (`writeUrlToNfcTag`). It builds a raw NDEF record (`tnf=1`, `type=0x55` "U", payload prefixed with `0x00` for "no URI abbreviation") and calls `CapacitorNfc.write({ records: [...] })`.

---

## 6. Updating the apps

### Easy path (recommended while iterating)

`capacitor.config.ts` points at the hosted web app. So:

```bash
# Make a change to the web app
npm run dev          # or whatever you use locally
# Redeploy the web app to its existing URL — both mobile apps see the update on next launch.
```

No `cap sync`, no rebuild, no reinstall. The native shell just reloads the live URL.

### Going production / offline

For a real App Store / Play Store release, you usually want the JS bundled inside the app so it works without a live server:

1. Open `capacitor.config.ts` and **delete the `server` block**.
2. Decide where API calls should go and set the env var:
   ```bash
   VITE_API_BASE_URL="https://www.perplexity.ai/computer/a/tapcard-3pYyvQkIQJCpUgfnBybOrw/port/5000" \
     npm run build
   ```
   (This URL is the backend proxy that Perplexity's hosting injects at deploy time. Update it to wherever you're hosting the Express server.)
3. `npx cap sync`
4. Build in Xcode / Android Studio and ship.

---

## 7. Publishing checklist

| Step                                 | iOS                                                                            | Android                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------- |
| Developer program                    | Apple Developer Program — $99 / year                                           | Google Play Console — $25 one-time            |
| Bundle / package id                  | `com.tapcard.app` (already set)                                                | `com.tapcard.app` (already set)               |
| Signing                              | Auto with paid team, or manual provisioning profile                            | Generate upload key (`keytool`), upload to Play Console |
| Required capabilities                | **Near Field Communication Tag Reading** must be added in Xcode + provisioning | NFC permission is in `AndroidManifest.xml`    |
| Screenshots                          | 6.7" iPhone, 6.5" iPhone, 12.9" iPad                                           | Phone, 7" tablet, 10" tablet                  |
| App review                           | App Store Connect → submit                                                     | Play Console → upload AAB → submit            |
| Privacy: NFC / camera / contacts     | All `NSXxxUsageDescription` strings are already filled in `Info.plist`         | Permissions declared in `AndroidManifest.xml` |
| App icon                             | Pre-generated 1024×1024 source in `resources/icon.png`                         | Same                                          |

---

## 8. Common errors & fixes

| Error                                                       | Fix                                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pod: command not found` during `cap sync`                  | `brew install cocoapods && pod setup`                                                                                                                          |
| Xcode: "Signing requires a development team"                | Open `App` → Signing & Capabilities, pick a team.                                                                                                              |
| Xcode: "Provisioning profile doesn't include the NFC entitlement" | In Signing & Capabilities, click **+ Capability** → add **Near Field Communication Tag Reading**. Then re-run.                                                |
| iPhone: "Untrusted Developer" on first launch               | Settings → General → VPN & Device Management → trust your developer cert.                                                                                      |
| `NFC writing requires a paid Apple Developer team`          | True. The free personal team cannot ship the NFC TAG write entitlement. You'll see the write fail at runtime with a code-signing-related error.                |
| Android: "INSTALL_FAILED_USER_RESTRICTED"                   | Phone is blocking ADB installs from Play-Protect. Open Settings → Security → "Install via USB".                                                                |
| `Cannot find module '@capgo/capacitor-nfc'`                 | Run `npm install` then `npx cap sync` again.                                                                                                                   |
| App launches but API calls 404                              | You removed `server.url` but didn't set `VITE_API_BASE_URL`. See "Going production / offline" above.                                                           |

---

## 9. Native plugins reference

| Plugin                             | Where it's used                                          |
| ---------------------------------- | -------------------------------------------------------- |
| `@capacitor/core`                  | Platform detection, plugin host                          |
| `@capacitor/ios`, `@capacitor/android` | Native platforms                                     |
| `@capacitor/camera`                | Profile photo picker on Dashboard                        |
| `@capacitor/haptics`               | Tap / success / error feedback                           |
| `@capacitor/splash-screen`         | Launch screen                                            |
| `@capacitor/status-bar`            | Status bar style                                         |
| `@capgo/capacitor-nfc`             | NFC tag writing on Dashboard                             |
| `@capacitor-community/contacts`    | "Save to Contacts" on the public card page               |
| `@capacitor/assets`                | Generates all icon and splash sizes from `resources/`    |

All wrappers live in [`client/src/lib/native.ts`](client/src/lib/native.ts). Each one returns a no-op on web, so the same React components work in both environments.
