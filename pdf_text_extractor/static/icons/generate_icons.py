"""Génère les icônes PNG PWA via Pillow (pas besoin de Cairo).

Usage : python generate_icons.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
HERE  = pathlib.Path(__file__).parent

BG_COLOR   = (15, 23, 42)      # #0f172a
GRAD_START = (129, 140, 248)   # #818CF8
GRAD_END   = (99, 102, 241)    # #6366f1


def make_icon(size: int) -> Image.Image:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fond arrondi
    radius = size // 5
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=BG_COLOR)

    # Lettre "N" centrée — dégradé simulé en deux passes
    font_size = int(size * 0.62)
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except OSError:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default(size=font_size)

    text = "N"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - int(size * 0.04)

    # Ombre légère
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 80))
    # Lettre principale en couleur indigo
    draw.text((x, y), text, font=font, fill=GRAD_START)

    return img


def main():
    for size in SIZES:
        img  = make_icon(size)
        path = HERE / f"icon-{size}.png"
        img.save(path, "PNG")
        print(f"  icon-{size}.png OK")

    # Apple touch icon (180px)
    make_icon(180).save(HERE / "apple-touch-icon.png", "PNG")
    print("  apple-touch-icon.png OK")

    print("\nIcones générées avec succès.")


if __name__ == "__main__":
    main()
