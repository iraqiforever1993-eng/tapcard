"""Generate TapCard app icon + splash screen.

icon.png  – 1024x1024, sky-blue rounded square with white "tc" wordmark
            and a stylized NFC wave behind it.

splash.png – 2732x2732, white background with the icon centered at ~600px.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math, sys

OUT = os.path.dirname(__file__)
ACCENT = (14, 165, 233)        # sky-500
ACCENT_DARK = (2, 132, 199)    # sky-600
WHITE = (255, 255, 255)
INK = (15, 23, 42)             # slate-900

def find_font(prefs, size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVu-Sans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def rounded_square_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def make_icon(size=1024):
    img = Image.new("RGB", (size, size), WHITE)
    draw = ImageDraw.Draw(img)

    # Sky-blue gradient rounded square
    radius = int(size * 0.22)
    bg = Image.new("RGB", (size, size), ACCENT)
    bgd = ImageDraw.Draw(bg)
    # subtle vertical gradient by drawing rows
    for y in range(size):
        t = y / size
        r = int(ACCENT[0] + (ACCENT_DARK[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (ACCENT_DARK[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (ACCENT_DARK[2] - ACCENT[2]) * t)
        bgd.line([(0, y), (size, y)], fill=(r, g, b))
    mask = rounded_square_mask(size, radius)
    img.paste(bg, (0, 0), mask)

    # NFC concentric arcs (decorative) in soft white
    cx, cy = int(size * 0.74), int(size * 0.30)
    arc_color = (255, 255, 255, 60)
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r, alpha in [(int(size * 0.14), 70), (int(size * 0.20), 55), (int(size * 0.26), 40)]:
        od.arc(
            [cx - r, cy - r, cx + r, cy + r],
            start=140,
            end=220,
            fill=(255, 255, 255, alpha),
            width=int(size * 0.018),
        )
    img.paste(overlay, (0, 0), overlay)

    # Wordmark "tc"
    font = find_font([], int(size * 0.55))
    text = "tc"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - int(size * 0.02)
    # soft shadow
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.text((tx + 6, ty + 8), text, font=font, fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(8))
    img.paste(sh, (0, 0), sh)
    draw.text((tx, ty), text, font=font, fill=WHITE)

    # Re-mask to keep the rounded corners crisp
    final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final.paste(img, (0, 0), mask)
    final.save(os.path.join(OUT, "icon.png"))
    # Also save an opaque variant for stores that don't like alpha
    flat = Image.new("RGB", (size, size), WHITE)
    flat.paste(img, (0, 0), mask)
    flat.save(os.path.join(OUT, "icon-flat.png"))
    return final


def make_splash(size=2732):
    img = Image.new("RGB", (size, size), WHITE)
    icon_size = 600
    icon = Image.open(os.path.join(OUT, "icon.png")).convert("RGBA").resize(
        (icon_size, icon_size), Image.LANCZOS
    )
    img.paste(icon, ((size - icon_size) // 2, (size - icon_size) // 2), icon)
    img.save(os.path.join(OUT, "splash.png"))
    img.save(os.path.join(OUT, "splash-dark.png"))


if __name__ == "__main__":
    make_icon()
    make_splash()
    print("Generated:", os.listdir(OUT))
