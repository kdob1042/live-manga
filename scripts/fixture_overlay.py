from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


OVERLAY_OUT = Path(sys.argv[1])
FALLBACK_OUT = Path(sys.argv[2])
BASE_PATH = Path(sys.argv[3])
ART_OUT = Path(sys.argv[4])

W, H = 748, 1010
FRAMES = [
    (0, 0, 470, 470),
    (470, 0, 278, 470),
    (0, 470, 240, 240),
    (240, 470, 508, 240),
    (0, 710, 748, 300),
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


art = Image.open(BASE_PATH).convert("RGB")
base = ImageDraw.Draw(art, "RGB")
fills = ["#fffdf8", "#e3e8e9", "#fffdf8", "#e8e7e1", "#fffdf8"]
for frame, fill in zip(FRAMES, fills):
    x, y, w, h = frame
    base.rectangle((x, y, x + w, y + h), fill=fill)

# Panel 1: a large abstract profile and hair/speed lines.
tone(base, FRAMES[0], 22, (68, 76, 80))
base.ellipse((104, 104, 329, 324), outline="#172126", width=6)
for a, b in [((119, 129), (59, 64)), ((144, 104), (94, 29)), ((182, 102), (159, 19)), ((229, 109), (244, 24)), ((274, 134), (329, 54))]:
    stroke(base, [a, b], 6, "#172126")
base.ellipse((179, 194, 192, 209), fill="#172126")
base.arc((192, 192, 254, 254), 15, 150, fill="#172126", width=5)
stroke(base, [(149, 324), (89, 444)], 8)
stroke(base, [(274, 324), (369, 444)], 8)
stroke(base, [(44, 384), (154, 359), (284, 374), (404, 349)], 3, "#566268")

# Panel 2: a tall moving object/hand motif that fills the taller frame.
px, py, _, _ = FRAMES[1]
tone(base, FRAMES[1], 16, (75, 84, 88))
base.ellipse((px + 72, py + 72, px + 210, py + 210), outline="#172126", width=5)
stroke(base, [(px + 36, py + 272), (px + 102, py + 190), (px + 178, py + 268)], 7)
stroke(base, [(px + 52, py + 300), (px + 142, py + 220), (px + 238, py + 288)], 4, "#566268")
for off in (0, 24, 48):
    stroke(base, [(px + 34 + off, py + 326), (px + 68 + off, py + 348)], 3, "#566268")
stroke(base, [(px + 35, py + 392), (px + 238, py + 392)], 3, "#566268")

# Panel 3: close-up eye/face.
px, py, _, _ = FRAMES[2]
base.rectangle((px + 9, py + 10, px + 229, py + 230), fill="#dfe6e8")
tone(base, FRAMES[2], 14, (68, 76, 80))
base.arc((px + 39, py + 70, px + 199, py + 165), 190, 350, fill="#172126", width=6)
base.ellipse((px + 104, py + 125, px + 129, py + 150), fill="#172126")
stroke(base, [(px + 54, py + 65), (px + 94, py + 40), (px + 159, py + 45)], 5)
stroke(base, [(px + 54, py + 190), (px + 184, py + 205)], 4, "#566268")

# Panel 4: two abstract silhouettes and motion lines.
px, py, _, _ = FRAMES[3]
tone(base, FRAMES[3], 18, (68, 76, 80))
base.ellipse((px + 53, py + 55, px + 123, py + 125), outline="#172126", width=5)
base.ellipse((px + 278, py + 50, px + 353, py + 125), outline="#172126", width=5)
stroke(base, [(px + 88, py + 125), (px + 88, py + 220)], 8)
stroke(base, [(px + 329, py + 125), (px + 334, py + 220)], 8)
stroke(base, [(px + 128, py + 140), (px + 273, py + 140)], 4)
for yy in (30, 40, 50):
    stroke(base, [(px + 148, py + yy), (px + 258, py + yy)], 2, "#566268")

# Panel 5: wide establishing shot.
px, py, _, _ = FRAMES[4]
tone(base, FRAMES[4], 20, (68, 76, 80))
stroke(base, [(px + 9, py + 225), (px + 154, py + 165), (px + 304, py + 220), (px + 454, py + 145), (px + 734, py + 205)], 6)
stroke(base, [(px + 29, py + 65), (px + 154, py + 35), (px + 274, py + 60), (px + 404, py + 25), (px + 724, py + 65)], 4, "#566268")
base.ellipse((px + 354, py + 90, px + 404, py + 140), outline="#172126", width=4)
stroke(base, [(px + 379, py + 140), (px + 379, py + 260)], 6)
stroke(base, [(px + 379, py + 175), (px + 334, py + 225)], 5)
stroke(base, [(px + 379, py + 175), (px + 429, py + 215)], 5)

overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
over = ImageDraw.Draw(overlay, "RGBA")
for frame in FRAMES:
    panel_border(over, frame)

# Dialogue and narration remain in distinct, in-panel positions.
bubble(over, (259, 29, 180, 95), (259, 164), "WAIT...", BOLD_FONT)
bubble(over, (500, 22, 190, 78), (584, 134), "...", BOLD_FONT)
narration(over, (22, 503, 150, 54), "A quiet turn.")
narration(over, (368, 630, 285, 56), "THE MOMENT PAUSES.")
narration(over, (44, 750, 295, 56), "The room held its breath.")
center_text(over, (574, 209, 135, 40), "· · ·", BOLD_FONT)

art.save(ART_OUT)
overlay.save(OVERLAY_OUT)
fallback = art.convert("RGBA")
fallback.alpha_composite(overlay)
fallback.convert("RGB").save(FALLBACK_OUT)
