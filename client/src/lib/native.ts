/**
 * Thin wrappers around Capacitor plugins.
 *
 * Each helper is a no-op (or returns `false`) when running in the web
 * browser, so the same React components can render in both modes.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { CapacitorNfc } from "@capgo/capacitor-nfc";
import type { NdefRecord } from "@capgo/capacitor-nfc";
import { Contacts, PhoneType, EmailType } from "@capacitor-community/contacts";

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const platform = (): string => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
};

/* ----------------------------------------------------------- *
 *  Haptics
 * ----------------------------------------------------------- */
export async function hapticTap() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function hapticError() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {}
}

/* ----------------------------------------------------------- *
 *  NFC – write a URL to a tag as an NDEF URI record
 *
 *  The Capgo plugin exposes a low-level NDEF record format
 *  ({ tnf, type, id, payload } as integer arrays). We build a
 *  well-known URI record (TNF=1, type='U' / 0x55) with the
 *  "no prefix" abbreviation byte (0x00) so we can write the
 *  full URL verbatim.
 * ----------------------------------------------------------- */
function stringToBytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

function uriRecord(url: string): NdefRecord {
  return {
    tnf: 1, // NFC Forum well-known
    type: [0x55], // 'U'
    id: [],
    payload: [0x00, ...stringToBytes(url)], // 0x00 = no URI prefix abbreviation
  };
}

/**
 * Writes the given URL to the next NFC tag the user taps.
 *
 * Flow:
 *  1) Caller invokes this when the user presses "Write to NFC Tag".
 *  2) On iOS, the system NFC reader sheet appears and prompts the user
 *     to hold a tag near the top of the phone. On Android, the app
 *     foreground-dispatch loop catches a tag tap.
 *  3) Resolves once the write completes; rejects on cancel or error.
 */
export async function writeUrlToNfcTag(url: string): Promise<void> {
  if (!isNative()) throw new Error("NFC is only available in the native app");

  const status = await CapacitorNfc.getStatus().catch(() => ({ status: "NO_NFC" as const }));
  if (status.status === "NO_NFC") throw new Error("This device does not have NFC hardware.");
  if (status.status === "NFC_DISABLED")
    throw new Error("NFC is turned off – enable it in system settings.");

  const record = uriRecord(url);

  return new Promise<void>(async (resolve, reject) => {
    let writeListener: { remove: () => void } | null = null;
    let doneListener: { remove: () => void } | null = null;

    const cleanup = async () => {
      try { writeListener?.remove(); } catch {}
      try { doneListener?.remove(); } catch {}
      try { await CapacitorNfc.stopScanning(); } catch {}
    };

    try {
      // When a tag is discovered, perform the write.
      const handle = await CapacitorNfc.addListener("ndefDiscovered", async () => {
        try {
          await CapacitorNfc.write({ records: [record], allowFormat: true });
          await cleanup();
          resolve();
        } catch (err: any) {
          await cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      writeListener = handle;

      // Also fire on formatable (blank) tags.
      const handle2 = await CapacitorNfc.addListener("ndefFormatableDiscovered", async () => {
        try {
          await CapacitorNfc.write({ records: [record], allowFormat: true });
          await cleanup();
          resolve();
        } catch (err: any) {
          await cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      doneListener = handle2;

      await CapacitorNfc.startScanning({
        // iOS UI strings
        // @ts-ignore extra fields are passed through
        message: "Hold a blank NFC tag near the top of your phone.",
      } as any);
    } catch (err: any) {
      await cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/* ----------------------------------------------------------- *
 *  Camera – pick a photo and return a data URL
 * ----------------------------------------------------------- */
export async function pickPhotoDataUrl(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.DataUrl,
      quality: 85,
      width: 400,
      height: 400,
      allowEditing: true,
    });
    return photo.dataUrl ?? null;
  } catch (err: any) {
    if (String(err?.message || err).toLowerCase().includes("cancel")) return null;
    throw err;
  }
}

/* ----------------------------------------------------------- *
 *  Contacts – save a card as a new device contact
 * ----------------------------------------------------------- */
export interface ContactSavePayload {
  fullName?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bio?: string | null;
  photoDataUrl?: string | null;
}

export async function saveContact(c: ContactSavePayload): Promise<void> {
  if (!isNative()) throw new Error("Contacts only available in the native app");

  // Split fullName into given / family.
  const parts = (c.fullName || "").trim().split(/\s+/);
  const given = parts.shift() || "";
  const family = parts.join(" ");

  const urls: string[] = [];
  if (c.website) urls.push(c.website);

  let image: { base64String: string } | undefined;
  if (c.photoDataUrl && c.photoDataUrl.startsWith("data:image")) {
    const b64 = c.photoDataUrl.split(",")[1];
    if (b64) image = { base64String: b64 };
  }

  await Contacts.createContact({
    contact: {
      name: { given, family },
      organization: {
        company: c.company || undefined,
        jobTitle: c.jobTitle || undefined,
      },
      note: c.bio || undefined,
      phones: c.phone
        ? [{ type: PhoneType.Mobile, isPrimary: true, number: c.phone }]
        : undefined,
      emails: c.email
        ? [{ type: EmailType.Work, isPrimary: true, address: c.email }]
        : undefined,
      urls: urls.length ? urls : undefined,
      image,
    },
  });
}
