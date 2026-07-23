from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "work" / "raw"


def pixel_background(source: str, destination: str) -> None:
    image = Image.open(RAW / source).convert("RGB")
    width, height = image.size
    crop_height = round(width * 9 / 16)
    top = max(0, (height - crop_height) // 2)
    image = image.crop((0, top, width, top + crop_height))
    image = image.resize((480, 270), Image.Resampling.LANCZOS)
    image.save(ROOT / "assets" / "backgrounds" / destination, optimize=True)


def sprite_sheet(source: str, destination: str, cell_size: tuple[int, int], scale: float) -> None:
    image = Image.open(RAW / source).convert("RGBA")
    cell_width, cell_height = cell_size
    output = Image.new("RGBA", (cell_width * 8, cell_height), (0, 0, 0, 0))
    for index in range(8):
        left = round(index * image.width / 8)
        right = round((index + 1) * image.width / 8)
        cell = image.crop((left, 0, right, image.height))
        bounds = cell.getchannel("A").getbbox()
        if not bounds:
            continue
        sprite = cell.crop(bounds)
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.NEAREST,
        )
        x = index * cell_width + (cell_width - sprite.width) // 2
        y = cell_height - sprite.height - 2
        output.alpha_composite(sprite, (x, y))
    output.save(ROOT / "assets" / "sprites" / destination, optimize=True)


def grid_atlas(
    source: str,
    destination: str,
    columns: int,
    rows: int,
    output_cell: tuple[int, int],
) -> None:
    image = Image.open(RAW / source).convert("RGBA")
    cell_width, cell_height = output_cell
    output = Image.new("RGBA", (cell_width * columns * rows, cell_height), (0, 0, 0, 0))
    target_index = 0
    for row in range(rows):
        for column in range(columns):
            left = round(column * image.width / columns)
            right = round((column + 1) * image.width / columns)
            top = round(row * image.height / rows)
            bottom = round((row + 1) * image.height / rows)
            cell = image.crop((left, top, right, bottom))
            bounds = cell.getchannel("A").getbbox()
            if bounds:
                sprite = cell.crop(bounds)
                scale = min((cell_width - 4) / sprite.width, (cell_height - 3) / sprite.height)
                sprite = sprite.resize(
                    (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
                    Image.Resampling.NEAREST,
                )
                x = target_index * cell_width + (cell_width - sprite.width) // 2
                y = cell_height - sprite.height - 1
                output.alpha_composite(sprite, (x, y))
            target_index += 1
    output.save(ROOT / "assets" / "sprites" / destination, optimize=True)


pixel_background("world-map.png", "ember-march.png")
pixel_background("forest-battle.png", "whisperwood-battle.png")
pixel_background("reliquary-battle.png", "reliquary-battle.png")
pixel_background("kohlgrund-exploration-v2.png", "kohlgrund-v2.png")
pixel_background("whisperwood-exploration-v2.png", "whisperwood-v2.png")
pixel_background("reliquary-exploration-v2.png", "reliquary-v2.png")
pixel_background("kohlgrund-exploration-v3.png", "kohlgrund-v3.png")
pixel_background("whisperwood-exploration-v3.png", "whisperwood-v3.png")
pixel_background("reliquary-exploration-v3.png", "reliquary-v3.png")
sprite_sheet("heroes-alpha.png", "heroes.png", (64, 68), 0.18)
sprite_sheet("enemies-alpha.png", "enemies.png", (72, 76), 0.22)
grid_atlas("heroes-v3-alpha.png", "heroes-v3.png", 6, 4, (72, 80))
grid_atlas("portraits-v3-alpha.png", "portraits-v3.png", 5, 1, (80, 72))
