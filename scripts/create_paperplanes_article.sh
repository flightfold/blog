#Execute this script from within the scripts directory like this
# sh create_paperplanes_article.sh ../Video\ Challenge 20231105-Fun\ Glider fun-glider

#set the video challenge directory
indir=$1

#source name
src=$2 

#set the output article name
out=$3

#execute the commands from the top level blog directory
cd ..
hugo new paperplanes/${out}/${out}.md

outdir=content/paperplanes/${out}/
#crop the thumbnail
#convert ${indir}/${src}/thumbnail.webp -crop 640x360+0+60 ${outdir}/thumbnailc.webp
convert "${indir}/${src}/thumbnail.png"  -resize 640x360 "${outdir}/thumbnailc.webp"


#convert screenshots
mkdir "${outdir}/frames"
convert "${indir}/${src}/frames/Screenshot*.png" -crop 1316x1080+300+0 "${outdir}/frames/step%03d.webp"
convert "${outdir}/frames/step*.webp" -resize 12% "${outdir}/frames/thumbnail%03d.webp"

#create thumbnail
convert -delay 100 -loop 0 -dispose previous "${outdir}/frames/thumbnail*.webp" "${outdir}/frames/steps_thumbnail.gif"
