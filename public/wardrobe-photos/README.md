# Wardrobe Photos

Put your own wardrobe/category photos in this folder:

```txt
public/wardrobe-photos/
```

Then edit this plain JSON file:

```txt
src/data/wardrobe/photo-slots.json
```

The names and hierarchy are already filled in from the wardrobe catalogue. Only edit
the `fileName` value on the matching slot:

```json
{
  "id": "manhattan-door",
  "categoryId": "doors",
  "name": "Manhattan Door",
  "fileName": "manhattan-door.jpg"
}
```

Leave `fileName` empty when there should be no photo. The app will still show the same category and product picker hierarchy with a plain catalogue placeholder.

Use normal web image formats: `.jpg`, `.jpeg`, `.png`, or `.webp`.

If the wardrobe catalogue changes, refresh the photo slot names with:

```bash
node scripts/sync-wardrobe-photo-slots.mjs
```

You can check the setup with:

```bash
node scripts/check-wardrobe-photos.mjs
```
