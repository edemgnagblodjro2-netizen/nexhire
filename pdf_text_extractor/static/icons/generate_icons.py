"""Génère les icônes PNG PWA depuis icon.svg.

Prérequis : pip install cairosvg
Usage    : python generate_icons.py
"""
import pathlib

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
HERE  = pathlib.Path(__file__).parent

try:
    import cairosvg
    svg = (HERE / "icon.svg").read_bytes()
    for size in SIZES:
        cairosvg.svg2png(bytestring=svg, write_to=str(HERE / f"icon-{size}.png"),
                         output_width=size, output_height=size)
        print(f"  icon-{size}.png OK")
    cairosvg.svg2png(bytestring=svg, write_to=str(HERE / "apple-touch-icon.png"),
                     output_width=180, output_height=180)
    print("  apple-touch-icon.png OK")
    print("Icônes générées.")
except ImportError:
    print("cairosvg non installé. Alternativement :")
    print("  npm install -g svgexport")
    for size in SIZES:
        print(f"  svgexport icon.svg icon-{size}.png {size}:{size}")
    print("  svgexport icon.svg apple-touch-icon.png 180:180")
