---
draft: true
---

**Use shift+cmd+v to preview this file in VSCode**

To create a new paperplanes article, follow the steps below.

## Create article from template
From the top level directory (blog directory), execute the following command
```
hugo new paperplanes/<name>/<name>.md
```
This command picks up the template from archetypes and fills up a file called `<name>.md` in the main paperplanes folder.  

## Crop and compress thumbnail
```
convert ../../../../Video\ Challenge/<source-name>/thumbnail.webp -crop 640x360+0+60 thumbnailc.webp
```

## Convert screenshots to webp and create thumbnails
Create a folder called `frames` inside the newly created directory and execute the following commands replacing the name of the source folder.
```
mkdir frames
convert ../../../../Video\ Challenge/<source-name>/frames/Screenshot*.png -crop 1316x1080+300+0 frames/step%03d.webp
convert frames/step*.webp -resize 12% frames/thumbnail%03d.webp
```
## Create thumbnail gif
```
convert -delay 100 -loop 0 -dispose previous frames/thumbnail*.webp frames/steps_thumbnail.gif
```

