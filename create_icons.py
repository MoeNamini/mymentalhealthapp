# create_icons.py
# Generates PNG icons for the PWA manifest.
# Run once with: uv run python create_icons.py

import struct
import zlib
import os


def make_png(size, bg_color, fg_color):
    """Creates a minimal PNG with a colored background and simple M letter."""
    import base64

    # Use Pillow if available, otherwise create minimal PNG
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGB", (size, size), bg_color)
        draw = ImageDraw.Draw(img)
        # Draw a simple circle
        margin = size // 6
        draw.ellipse(
            [margin, margin, size - margin, size - margin],
            outline=fg_color,
            width=max(2, size // 20),
        )
        # Draw M letter approximation
        cx, cy = size // 2, size // 2
        s = size // 4
        draw.line(
            [
                (cx - s, cy + s // 2),
                (cx - s, cy - s // 2),
                (cx, cy),
                (cx + s, cy - s // 2),
                (cx + s, cy + s // 2),
            ],
            fill=fg_color,
            width=max(2, size // 24),
        )
        return img
    except ImportError:
        return None


def write_icon(size, filepath, bg="#111111", fg="#ffffff"):
    img = make_png(size, bg, fg)
    if img:
        img.save(filepath)
        print(f"  Created {filepath} ({size}x{size})")
    else:
        # Fallback: copy a simple SVG as placeholder
        print(f"  Pillow not installed — install with: uv add pillow")
        print(f"  Then re-run this script.")


os.makedirs("frontend/public", exist_ok=True)
print("Creating icons...")
write_icon(192, "frontend/public/icon-192.png")
write_icon(512, "frontend/public/icon-512.png")
print("Done.")
