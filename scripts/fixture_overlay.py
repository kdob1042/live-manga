from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


OVERLAY_OUT = Path(sys.argv[1])
FALLBACK_OUT = Path(sys.argv[2])
BASE_PATH = Path(sys.argv[3])
ART_OUT = Path(sys.argv[4])

W, H = 800, 1120
FRAMES = [
    (26, 26, 470, 470),
    (520, 26, 254, 330),
    (26, 515, 240, 240),
    (282, 515, 492, 240),
    (26, 785, 748, 300),
]


def font(path, size):
    return ImageFont.truetype(path, size)


REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT = font(REGULAR, 18)
SMALL = font(REGULAR, 14)
BOLD_FONT = font(BOLD, 20)


def tone(draw, box, step=18, fill=(95, 104, 108, 32)):
    x, y, w, h = box
    for yy in range(y + 8, y + h - 4, step):
        for xx in range(x + 8, x + w - 4, step):
            draw.ellipse((xx, yy, xx + 3, yy + 3), fill=fill)


def stroke(draw, points, width=4, fill=(23, 31, 35, 255)):
    draw.line(points, fill=fill, width=width, joint="curve")


def center_text(draw, box, value, fnt, fill=(17, 20, 22, 255)):
    x, y, w, h = box
    bounds = draw.textbbox((0, 0), value, font=fnt)
    tw, th = bounds[2] - bounds[0], bounds[3] - bounds[1]
    draw.text((x + (w - tw) / 2, y + (h - th) / 2 - bounds[1]), value, font=fnt, fill=fill)


def narration(draw, box, value):
    x, y, w, h = box
    draw.rectangle((x, y, x + w, y + h), fill=(255, 255, 255, 245), outline=(17, 20, 22, 255), width=4)
    center_text(draw, box, value, SMALL)


def bubble(draw, box, tail, value, fnt=FONT):
    x, y, w, h = box
    draw.ellipse((x, y, x + w, y + h), fill=(255, 255, 255, 248), outline=(17, 20, 22, 255), width=4)
    tx, ty = tail
    draw.polygon(((x + w * .42, y + h * .82), (x + w * .56, y + h * .82), (tx, ty)), fill=(255, 255, 255, 248), outline=(17, 20, 22, 255))
    center_text(draw, box, value, fnt)


def panel_border(draw, frame):
    x, y, w, h = frame
    draw.rectangle((x, y, x + w, y + h), outline=(17, 20, 22, 255), width=7)


# The artwork is original geometric line art. It is deliberately separate from
# the transparent lettering/frame overlay so the motion panel can replace only
# its artRect while keeping the composition still.
art = Image.open(BASE_PATH).convert("RGB")
base = ImageDraw.Draw(art, "RGB")
fills = ["#fffdf8", "#e3e8e9", "#fffdf8", "#e8e7e1", "#fffdf8"]
for frame, fill in zip(FRAMES, fills):
    x, y, w, h = frame
    base.rectangle((x, y, x + w, y + h), fill=fill)

# Panel 1: a large abstract profile and hair/speed lines.
tone(base, FRAMES[0], 22, (68, 76, 80))
base.ellipse((130, 130, 355, 350), outline="#172126", width=6)
for a, b in [((145, 155), (85, 90)), ((170, 130), (120, 55)), ((208, 128), (185, 45)), ((255, 135), (270, 50)), ((300, 160), (355, 80))]:
    stroke(base, [a, b], 6, "#172126")
base.ellipse((205, 220, 218, 235), fill="#172126")
base.arc((218, 218, 280, 280), 15, 150, fill="#172126", width=5)
stroke(base, [(175, 350), (115, 470)], 8)
stroke(base, [(300, 350), (395, 470)], 8)
stroke(base, [(70, 410), (180, 385), (310, 400), (430, 375)], 3, "#566268")

# Panel 2: a simple moving object/hand motif.
tone(base, FRAMES[1], 16, (75, 84, 88))
base.ellipse((585, 90, 720, 225), outline="#172126", width=5)
stroke(base, [(548, 260), (620, 185), (690, 255)], 7)
stroke(base, [(565, 280), (650, 210), (735, 270)], 4, "#566268")
for off in (0, 22, 44):
    stroke(base, [(545 + off, 295), (575 + off, 315)], 3, "#566268")

# Panel 3: close-up eye/face.
base.rectangle((35, 525, 255, 745), fill="#dfe6e8")
tone(base, FRAMES[2], 14, (68, 76, 80))
base.arc((65, 585, 225, 680), 190, 350, fill="#172126", width=6)
base.ellipse((130, 620, 155, 645), fill="#172126")
stroke(base, [(80, 590), (120, 565), (185, 570)], 5)
stroke(base, [(80, 685), (210, 700)], 4, "#566268")

# Panel 4: two abstract silhouettes and motion lines.
tone(base, FRAMES[3], 18, (68, 76, 80))
base.ellipse((335, 570, 405, 640), outline="#172126", width=5)
base.ellipse((560, 565, 635, 640), outline="#172126", width=5)
stroke(base, [(370, 640), (370, 735)], 8)
stroke(base, [(595, 640), (600, 735)], 8)
stroke(base, [(410, 655), (555, 655)], 4)
for yy in (545, 555, 565):
    stroke(base, [(430, yy), (540, yy)], 2, "#566268")

# Panel 5: wide establishing shot.
tone(base, FRAMES[4], 20, (68, 76, 80))
stroke(base, [(35, 1010), (180, 950), (330, 1005), (480, 930), (760, 990)], 6)
stroke(base, [(55, 850), (180, 820), (300, 845), (430, 810), (750, 850)], 4, "#566268")
base.ellipse((380, 875, 430, 925), outline="#172126", width=4)
stroke(base, [(405, 925), (405, 1045)], 6)
stroke(base, [(405, 960), (360, 1010)], 5)
stroke(base, [(405, 960), (455, 1000)], 5)

overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
over = ImageDraw.Draw(overlay, "RGBA")
for frame in FRAMES:
    panel_border(over, frame)

# Dialogue and narration are deliberately in different in-panel positions.
bubble(over, (285, 55, 180, 95), (285, 190), "WAIT...", BOLD_FONT)
bubble(over, (535, 48, 190, 78), (620, 160), "...", BOLD_FONT)
narration(over, (48, 548, 150, 54), "A quiet turn.")
narration(over, (410, 675, 285, 56), "THE MOMENT PAUSES.")
narration(over, (70, 825, 295, 56), "The room held its breath.")
center_text(over, (600, 235, 135, 40), "· · ·", BOLD_FONT)

art.save(ART_OUT)
overlay.save(OVERLAY_OUT)
fallback = art.convert("RGBA")
fallback.alpha_composite(overlay)
fallback.convert("RGB").save(FALLBACK_OUT)

