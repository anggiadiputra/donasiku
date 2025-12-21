# Fonts Folder

Place your Source Sans Pro font files in this folder.

## Required Font Files

Please add the following Source Sans Pro font files to this folder:

- `SourceSansPro-Regular.woff2` (or `.woff`, `.ttf`)
- `SourceSansPro-Italic.woff2` (or `.woff`, `.ttf`)
- `SourceSansPro-SemiBold.woff2` (or `.woff`, `.ttf`)
- `SourceSansPro-Bold.woff2` (or `.woff`, `.ttf`)

## Supported Formats

The CSS is configured to support:
- `.woff2` (preferred - best compression)
- `.woff` (fallback)
- `.ttf` (fallback)

## Font Weights

- 400 (Regular)
- 400 italic (Italic)
- 600 (SemiBold)
- 700 (Bold)

## Notes

- If you have different file names, update the `@font-face` declarations in `src/index.css`
- The font will automatically be applied to the entire application once files are added

