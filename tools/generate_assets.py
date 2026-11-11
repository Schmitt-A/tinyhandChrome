#!/usr/bin/env python3
"""
Generate crisp icons and hand assets for TinyHand Chrome Extension.
Creates:
- icons/icon-16.png, icon-48.png, icon-128.png
- hands/hand-classic.svg & hands/hand-classic.png
- hands/laser-dot.svg & hands/laser-dot.png
- hands/hand-glove.svg & hands/hand-glove.png
- hands/cat-paw.svg & hands/cat-paw.png
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(BASE_DIR, "icons")
HANDS_DIR = os.path.join(BASE_DIR, "hands")

os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(HANDS_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. GENERATE EXTENSION ICONS (16x16, 48x48, 128x128)
# -------------------------------------------------------------
def create_extension_icon(size):
    # Render at 4x for super sampling antialiasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = 2 * scale
    # Rounded background badge (vibrant gradient-like orange-red)
    r = 6 * scale if size <= 48 else 20 * scale
    bg_color = (255, 69, 58, 255) # iOS system red
    draw.rounded_rectangle([pad, pad, canvas_size - pad, canvas_size - pad], radius=r, fill=bg_color)

    # Draw a stylized pointing hand in white inside the icon
    # Tip of finger at ~ (35% x, 25% y) pointing up-left
    # Let's draw stick and cartoon hand
    stick_color = (245, 230, 200, 255)
    stick_w = max(2 * scale, int(size * 0.12 * scale))
    draw.line([
        (int(canvas_size * 0.65), int(canvas_size * 0.65)),
        (int(canvas_size * 0.85), int(canvas_size * 0.88))
    ], fill=stick_color, width=stick_w)

    # Hand shape (pointing finger)
    hand_color = (255, 255, 255, 255)
    outline_color = (30, 30, 30, 255)
    outline_w = max(1 * scale, int(size * 0.04 * scale))

    # Points for pointing hand
    pts = [
        (int(canvas_size * 0.28), int(canvas_size * 0.22)), # fingertip
        (int(canvas_size * 0.42), int(canvas_size * 0.24)),
        (int(canvas_size * 0.44), int(canvas_size * 0.44)),
        (int(canvas_size * 0.68), int(canvas_size * 0.52)),
        (int(canvas_size * 0.70), int(canvas_size * 0.68)),
        (int(canvas_size * 0.50), int(canvas_size * 0.76)),
        (int(canvas_size * 0.32), int(canvas_size * 0.58)),
        (int(canvas_size * 0.30), int(canvas_size * 0.40)),
    ]
    draw.polygon(pts, fill=hand_color, outline=outline_color, width=outline_w)

    # Downsample with Lanczos
    icon = img.resize((size, size), Image.Resampling.LANCZOS)
    return icon

for sz in (16, 48, 128):
    icon_img = create_extension_icon(sz)
    icon_path = os.path.join(ICONS_DIR, f"icon-{sz}.png")
    icon_img.save(icon_path, "PNG")
    print(f"Created {icon_path}")


# -------------------------------------------------------------
# 2. GENERATE HAND ASSETS (SVG & PNG)
# -------------------------------------------------------------

# A) Classic Hand on a Wooden Stick (TinyHand Signature)
classic_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
  <defs>
    <!-- Drop Shadow for pointer -->
    <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="3" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <!-- Stick Wood Texture Gradient -->
    <linearGradient id="stickGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B5A2B"/>
      <stop offset="40%" stop-color="#CD853F"/>
      <stop offset="80%" stop-color="#DEB887"/>
      <stop offset="100%" stop-color="#8B5A2B"/>
    </linearGradient>
    <!-- Hand Skin Gradient -->
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE0B2"/>
      <stop offset="100%" stop-color="#FFCC80"/>
    </linearGradient>
  </defs>

  <g filter="url(#shadow)">
    <!-- Wooden Stick: tilted at ~35 deg from hand base downwards -->
    <path d="M 98 140 L 175 285 L 155 295 L 78 150 Z" fill="url(#stickGrad)" stroke="#5C3A21" stroke-width="3" stroke-linejoin="round"/>

    <!-- Stick Ferrule / Ring connector -->
    <path d="M 76 148 L 100 138 L 104 148 L 80 158 Z" fill="#D4AF37" stroke="#8C7320" stroke-width="2"/>

    <!-- Pointing Hand Body -->
    <!-- Palm & folded fingers -->
    <path d="M 50 120 
             C 40 100, 50 75, 75 75 
             C 80 75, 85 78, 88 82 
             C 88 55, 65 15, 48 10 
             C 38 7, 30 18, 35 35 
             L 42 75 
             C 25 80, 18 95, 24 110 
             C 28 120, 38 128, 50 135 
             L 80 152 
             L 100 138 
             Z" 
          fill="url(#skinGrad)" stroke="#3E2723" stroke-width="4" stroke-linejoin="round"/>

    <!-- Index Finger (Straight Up-Left pointing at 38, 8) -->
    <path d="M 46 72 
             L 36 32 
             C 32 16, 44 6, 52 11 
             C 58 15, 62 25, 59 45 
             L 56 75 Z" 
          fill="#FFE0B2" stroke="#3E2723" stroke-width="4" stroke-linejoin="round"/>

    <!-- Fingernail on Index -->
    <path d="M 40 22 C 40 15, 48 12, 50 16 C 52 20, 48 24, 42 25 Z" fill="#FFF8E1" opacity="0.8"/>

    <!-- Folded Fingers lines -->
    <!-- Middle finger -->
    <path d="M 52 82 C 65 78, 80 84, 82 98 C 83 105, 75 112, 62 110" fill="none" stroke="#5D4037" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Ring finger -->
    <path d="M 45 102 C 58 98, 72 104, 74 116 C 75 122, 68 128, 55 125" fill="none" stroke="#5D4037" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Little finger -->
    <path d="M 40 120 C 50 118, 62 122, 63 132 C 64 138, 56 142, 48 138" fill="none" stroke="#5D4037" stroke-width="3" stroke-linecap="round"/>

    <!-- Thumb folded over palm -->
    <path d="M 32 68 C 22 75, 20 92, 32 102 C 42 110, 52 98, 50 88 C 48 80, 42 74, 32 68 Z" fill="url(#skinGrad)" stroke="#3E2723" stroke-width="3.5"/>
  </g>
</svg>
"""

# B) Laser Pointer Dot (Bright Neon Red/Green with Multi-layer Glow)
laser_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <!-- Outer Glow -->
    <radialGradient id="laserGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FF3B30" stop-opacity="1"/>
      <stop offset="30%" stop-color="#FF2D55" stop-opacity="0.8"/>
      <stop offset="65%" stop-color="#FF375F" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FF375F" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="laserCore" cx="50%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="45%" stop-color="#FFF0F5" stop-opacity="0.95"/>
      <stop offset="85%" stop-color="#FF2D55" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#FF0033" stop-opacity="1"/>
    </radialGradient>
  </defs>

  <!-- Outer Pulsing Glow Circle -->
  <circle cx="80" cy="80" r="70" fill="url(#laserGlow)"/>
  <circle cx="80" cy="80" r="45" fill="#FF3B30" opacity="0.6"/>

  <!-- Crosshairs / Lens Flare lines -->
  <line x1="10" y1="80" x2="150" y2="80" stroke="#FF8596" stroke-width="2.5" opacity="0.6" stroke-linecap="round"/>
  <line x1="80" y1="10" x2="80" y2="150" stroke="#FF8596" stroke-width="2.5" opacity="0.6" stroke-linecap="round"/>

  <!-- Intense White Center -->
  <circle cx="80" cy="80" r="22" fill="url(#laserCore)" stroke="#FFFFFF" stroke-width="2"/>
  <circle cx="80" cy="80" r="9" fill="#FFFFFF"/>
</svg>
"""

# C) Cartoon White Glove Pointer (Mickey / Retro style)
glove_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <!-- Glove Cuff / Wrist band -->
    <path d="M 65 185 C 65 170, 145 170, 145 185 L 150 215 C 150 230, 60 230, 60 215 Z" fill="#F0F0F0" stroke="#1A1A1A" stroke-width="5"/>
    <ellipse cx="105" cy="185" rx="40" ry="12" fill="#E0E0E0" stroke="#1A1A1A" stroke-width="5"/>

    <!-- Glove Palm & Fingers -->
    <path d="M 75 180 
             C 50 170, 40 140, 50 120 
             C 40 100, 52 80, 68 85 
             C 70 50, 85 15, 98 10 
             C 110 5, 122 18, 116 50 
             L 115 88 
             C 135 90, 145 105, 140 122 
             C 148 132, 142 155, 132 168 
             C 125 178, 105 182, 75 180 Z" 
          fill="#FFFFFF" stroke="#1A1A1A" stroke-width="6" stroke-linejoin="round"/>

    <!-- Index Finger Contour -->
    <path d="M 85 86 L 96 30 C 99 16, 112 16, 114 30 L 115 88" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="5" stroke-linecap="round"/>

    <!-- 3 Characteristic Black Glove Seams on back of hand -->
    <line x1="82" y1="135" x2="88" y2="165" stroke="#1A1A1A" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="98" y1="130" x2="102" y2="165" stroke="#1A1A1A" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="114" y1="135" x2="116" y2="165" stroke="#1A1A1A" stroke-width="4.5" stroke-linecap="round"/>

    <!-- Folded Fingers lines -->
    <path d="M 115 108 C 128 108, 136 118, 130 130" fill="none" stroke="#1A1A1A" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M 112 132 C 124 134, 130 144, 122 154" fill="none" stroke="#1A1A1A" stroke-width="4.5" stroke-linecap="round"/>
  </g>
</svg>
"""

# D) Cute Cat Paw Pointer
paw_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <!-- Cat Arm/Leg -->
    <path d="M 60 120 L 50 230 L 150 230 L 140 120 Z" fill="#FFA726" stroke="#E65100" stroke-width="5"/>
    <!-- Stripes on Arm -->
    <path d="M 54 180 Q 100 170 146 180" stroke="#BF360C" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M 52 205 Q 100 195 148 205" stroke="#BF360C" stroke-width="6" fill="none" stroke-linecap="round"/>

    <!-- Main Paw Head/Round -->
    <path d="M 45 130 
             C 30 100, 35 60, 65 50 
             C 80 45, 95 55, 100 65 
             C 105 55, 120 45, 135 50 
             C 165 60, 170 100, 155 130 
             C 145 150, 55 150, 45 130 Z" 
          fill="#FFA726" stroke="#E65100" stroke-width="5" stroke-linejoin="round"/>

    <!-- Pointing Toe / Claws (Index toe points up) -->
    <ellipse cx="60" cy="42" rx="16" ry="20" fill="#FFCC80" stroke="#E65100" stroke-width="4"/>
    <ellipse cx="100" cy="30" rx="18" ry="24" fill="#FFCC80" stroke="#E65100" stroke-width="4"/> <!-- Top pointing toe -->
    <ellipse cx="140" cy="42" rx="16" ry="20" fill="#FFCC80" stroke="#E65100" stroke-width="4"/>
    <ellipse cx="38" cy="72" rx="15" ry="18" fill="#FFCC80" stroke="#E65100" stroke-width="4"/>

    <!-- Pink Paw Pads (Toe Beans) -->
    <ellipse cx="60" cy="44" rx="9" ry="12" fill="#FF4081"/>
    <ellipse cx="100" cy="32" rx="11" ry="14" fill="#FF4081"/>
    <ellipse cx="140" cy="44" rx="9" ry="12" fill="#FF4081"/>
    <ellipse cx="38" cy="74" rx="8" ry="10" fill="#FF4081"/>

    <!-- Big Central Pink Heart/Bean Pad -->
    <path d="M 100 85 
             C 75 70, 55 95, 75 118 
             C 85 130, 100 138, 100 138 
             C 100 138, 115 130, 125 118 
             C 145 95, 125 70, 100 85 Z" 
          fill="#FF4081"/>
  </g>
</svg>
"""

# Save SVGs
assets = [
    ("hand-classic.svg", classic_svg),
    ("laser-dot.svg", laser_svg),
    ("hand-glove.svg", glove_svg),
    ("cat-paw.svg", paw_svg)
]

for filename, content in assets:
    path = os.path.join(HANDS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"Created {path}")

# Also render PNG counterparts for guaranteed fallback and high performance
# We render high-res PNG for each hand using PIL
def render_classic_png():
    img = Image.new("RGBA", (300, 450), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Stick
    draw.polygon([(140, 210), (270, 420), (235, 440), (110, 230)], fill=(205, 133, 63, 255), outline=(92, 58, 33, 255))
    # Brass ferrule
    draw.polygon([(108, 228), (142, 212), (148, 226), (114, 242)], fill=(212, 175, 55, 255), outline=(140, 115, 32, 255))
    # Hand palm
    draw.rounded_rectangle([50, 110, 150, 220], radius=35, fill=(255, 204, 128, 255), outline=(62, 39, 35, 255), width=6)
    # Index finger pointing at tip (55, 20)
    draw.rounded_rectangle([50, 20, 92, 140], radius=20, fill=(255, 224, 178, 255), outline=(62, 39, 35, 255), width=6)
    # Fingernail
    draw.arc([56, 30, 86, 55], start=0, end=180, fill=(255, 248, 225, 255), width=4)
    # Folded fingers details
    draw.arc([80, 115, 140, 145], start=180, end=360, fill=(93, 64, 55, 255), width=5)
    draw.arc([80, 145, 135, 175], start=180, end=360, fill=(93, 64, 55, 255), width=5)
    draw.arc([75, 175, 125, 205], start=180, end=360, fill=(93, 64, 55, 255), width=5)
    # Thumb
    draw.rounded_rectangle([30, 110, 75, 165], radius=22, fill=(255, 204, 128, 255), outline=(62, 39, 35, 255), width=5)
    
    # Shadow blur
    shadow = img.filter(ImageFilter.GaussianBlur(radius=4))
    final = Image.new("RGBA", (300, 450), (0, 0, 0, 0))
    final.paste(shadow, (4, 8), shadow)
    final.paste(img, (0, 0), img)
    return final

def render_laser_png():
    size = 200
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size // 2

    # Draw gradient circles
    for r in range(80, 0, -2):
        alpha = int(255 * (1 - (r / 80) ** 0.5) * 0.7)
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(255, 45, 85, alpha))

    # Crosshair glow
    draw.line([(20, center), (size - 20, center)], fill=(255, 133, 150, 150), width=3)
    draw.line([(center, 20), (center, size - 20)], fill=(255, 133, 150, 150), width=3)

    # Core white dot
    draw.ellipse([center - 20, center - 20, center + 20, center + 20], fill=(255, 230, 240, 230))
    draw.ellipse([center - 10, center - 10, center + 10, center + 10], fill=(255, 255, 255, 255))
    return img

def render_glove_png():
    img = Image.new("RGBA", (300, 360), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Cuff
    draw.rounded_rectangle([80, 260, 220, 330], radius=20, fill=(230, 230, 230, 255), outline=(25, 25, 25, 255), width=7)
    # Palm
    draw.rounded_rectangle([70, 130, 210, 275], radius=50, fill=(255, 255, 255, 255), outline=(25, 25, 25, 255), width=8)
    # Index Finger (Pointing up at 135, 20)
    draw.rounded_rectangle([115, 20, 165, 170], radius=25, fill=(255, 255, 255, 255), outline=(25, 25, 25, 255), width=8)
    # Thumb
    draw.rounded_rectangle([45, 140, 95, 215], radius=25, fill=(255, 255, 255, 255), outline=(25, 25, 25, 255), width=7)
    # Black seam lines
    draw.line([(120, 200), (125, 245)], fill=(25, 25, 25, 255), width=6)
    draw.line([(145, 195), (148, 245)], fill=(25, 25, 25, 255), width=6)
    draw.line([(170, 200), (170, 245)], fill=(25, 25, 25, 255), width=6)
    return img

def render_paw_png():
    img = Image.new("RGBA", (300, 360), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Arm
    draw.polygon([(75, 180), (60, 350), (220, 350), (205, 180)], fill=(255, 167, 38, 255), outline=(230, 81, 0, 255))
    # Paw round
    draw.rounded_rectangle([50, 75, 230, 215], radius=60, fill=(255, 167, 38, 255), outline=(230, 81, 0, 255), width=7)
    # Toes
    draw.ellipse([65, 50, 115, 110], fill=(255, 204, 128, 255), outline=(230, 81, 0, 255), width=6)
    draw.ellipse([115, 30, 175, 100], fill=(255, 204, 128, 255), outline=(230, 81, 0, 255), width=6) # Pointing toe
    draw.ellipse([175, 50, 225, 110], fill=(255, 204, 128, 255), outline=(230, 81, 0, 255), width=6)
    # Pink pads
    draw.ellipse([80, 65, 100, 95], fill=(255, 64, 129, 255))
    draw.ellipse([135, 45, 155, 80], fill=(255, 64, 129, 255))
    draw.ellipse([190, 65, 210, 95], fill=(255, 64, 129, 255))
    # Big central heart pad
    draw.ellipse([110, 120, 170, 175], fill=(255, 64, 129, 255))
    return img

# Save PNGs
render_classic_png().save(os.path.join(HANDS_DIR, "hand-classic.png"), "PNG")
render_laser_png().save(os.path.join(HANDS_DIR, "laser-dot.png"), "PNG")
render_glove_png().save(os.path.join(HANDS_DIR, "hand-glove.png"), "PNG")
render_paw_png().save(os.path.join(HANDS_DIR, "cat-paw.png"), "PNG")

print("All icons and hand assets generated successfully!")
