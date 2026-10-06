from pathlib import Path

png = Path(r"E:\Project\grok-build\idea\src\main\resources\icons\plugin-icon.png")
print("exists", png.exists(), "size", png.stat().st_size if png.exists() else 0)
