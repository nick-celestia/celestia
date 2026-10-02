# Spirit Artwork Folder

Put each LARGE, detailed summon-card image in this folder.

The filename must match the spirit's database slug.

Examples:

```text
Spirit name: Solara Fox
Slug: solara-fox
Artwork: assets/spirits/solara-fox.png
```

```text
Spirit name: Umbra Raven
Slug: umbra-raven
Artwork: assets/spirits/umbra-raven.png
```

Supported extensions:

- `.png`
- `.webp`
- `.jpg`
- `.jpeg`

Recommended:

- Use `.png` or `.webp`
- Use a square image
- Keep image file names lowercase
- Do not use spaces
- Do not change the slug after publishing artwork unless you also rename its file

Optional fallback:

```text
assets/spirits/default.png
```

If a spirit-specific image is missing and `default.png` exists, the bot will use the fallback image. If neither exists, the summon embed still works without a large image.
