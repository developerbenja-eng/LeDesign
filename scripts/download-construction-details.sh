#!/bin/bash

# Download Construction Details for CAD-POC
# Chilean infrastructure standards and CAD files

DATA_DIR="$(dirname "$0")/../data/construction-details"
mkdir -p "$DATA_DIR/pdf/serviu"
mkdir -p "$DATA_DIR/pdf/mop"
mkdir -p "$DATA_DIR/pdf/siss"
mkdir -p "$DATA_DIR/dwg"

echo "=============================================="
echo "Downloading Chilean Construction Details"
echo "=============================================="
echo ""

# ==============================================
# SERVIU - Manual de Pavimentación y Aguas Lluvias
# ==============================================
echo "📥 Downloading SERVIU manuals..."

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/manual-pavimentacion-2008.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/MANUAL%20PAV.-ALL.-2008.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/cap5-diseno-aguas-lluvias.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/mpall3docs/Cap%205%20Diseno%20elementos%20Urbanos%20de%20Infraestructura%20de%20Aguas%20Lluvias.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/cap11-veredas-soleras.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/mpall3docs/Cap11-EspecificacionesTecnicasGeneralesParaObrasVeredasSolerasSolerillas.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/guia-elementos-aguas-lluvias.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/mpall/Guia%20dis%20especif%20elementos%20inf%20aguas%20lluvias.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/mov-serviu-2018.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/MOV_SERVIU_2018v1.pdf"

# ==============================================
# SERVIU - Especificaciones Técnicas (EETT)
# ==============================================
echo ""
echo "📥 Downloading SERVIU Especificaciones Técnicas..."

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/cap1-diseno-estructural-pavimentos.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/mpall3docs/Cap%201%20Diseno%20Estructural%20de%20Pavimentos.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/cap8-eett-asfalto-convencional.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/MPALL/mpall3docs/Cap%20N8%20Especificaciones%20Tecnicas%20-%20Asfalto%20Convencional.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/codigo-normas-minvu-2008.pdf" \
  "https://pavimentacion.metropolitana.minvu.cl/doc/mpall/Codigo_de_Normas_MINVU_2008.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/normas-pavimentacion-sustentable.pdf" \
  "https://csustentable.minvu.gob.cl/wp-content/uploads/2019/01/normas_pavimentacion.pdf"

# ==============================================
# SERVIU Biobío - Itemizado Regional
# ==============================================
echo ""
echo "📥 Downloading SERVIU Biobío documents..."
mkdir -p "$DATA_DIR/pdf/serviu-biobio"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu-biobio/itemizado-tecnico-regional.pdf" \
  "https://www.serviubiobio.cl/wp-content/uploads/2018/09/itemizado.pdf"

# ==============================================
# Itemizado Técnico MINVU Nacional
# ==============================================
echo ""
echo "📥 Downloading MINVU Itemizado Técnico..."

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/itemizado-tecnico-minvu-2017.pdf" \
  "https://www.minvu.gob.cl/wp-content/uploads/2019/05/Res_7713-16062017_Itemizado-Tecnico.pdf"

# ==============================================
# Memorias de Cálculo - AASHTO 93
# ==============================================
echo ""
echo "📥 Downloading Memorias de Cálculo AASHTO..."
mkdir -p "$DATA_DIR/pdf/aashto"

curl -L --progress-bar -o "$DATA_DIR/pdf/aashto/manual-aashto-93-espanol.pdf" \
  "https://hugoalcantara.files.wordpress.com/2014/02/disec3b1o-aashto-93.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/aashto/memoria-calculo-pavimentos-argentina.pdf" \
  "https://www.argentina.gob.ar/sites/default/files/memoria-de-calculo-pavimentos.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/aashto/modulo-diseno-aashto.pdf" \
  "https://sjnavarro.files.wordpress.com/2008/08/aashto-931.pdf"

# ==============================================
# MOP - Manual de Carreteras
# ==============================================
echo ""
echo "📥 Downloading MOP Manual de Carreteras..."

curl -L --progress-bar -o "$DATA_DIR/pdf/mop/vol4-planos-tipo.pdf" \
  "https://portal.ondac.com/601/articles-59865_doc_pdf.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/mop/vol5-construccion.pdf" \
  "https://portal.ondac.com/601/articles-59864_doc_pdf.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/mop/vol6-seguridad-vial.pdf" \
  "https://portal.ondac.com/601/articles-59863_doc_pdf.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/mop/vol7-mantenimiento.pdf" \
  "https://portal.ondac.com/601/articles-59862_doc_pdf.pdf"

# ==============================================
# SISS & Other Official Sources
# ==============================================
echo ""
echo "📥 Downloading SISS and other official documents..."

curl -L --progress-bar -o "$DATA_DIR/pdf/siss/camara-tipo-a-b.pdf" \
  "https://www.budnik.cl/wp-content/uploads/2025/01/camara-tipo-a-b.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/serviu/manual-diseno-universal.pdf" \
  "https://ciudadaccesible.cl/wp-content/uploads/2011/08/Serviu_Manual-Diseño-Universal-en-el-Espacio-Público.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/siss/decreto-50-mop.pdf" \
  "https://www.uriseg.cl/PDF/Decreto_50_Mop.pdf"

curl -L --progress-bar -o "$DATA_DIR/pdf/siss/camaras-aguas-del-valle.pdf" \
  "http://portal.aguasdelvalle.cl/wp-content/uploads/2017/01/Detalle-cámaras-de-alcantarillado.pdf"

# ==============================================
# Summary
# ==============================================
echo ""
echo "=============================================="
echo "Download Summary"
echo "=============================================="
echo ""
echo "PDF files downloaded to: $DATA_DIR/pdf/"
find "$DATA_DIR/pdf" -name "*.pdf" -exec du -h {} \; 2>/dev/null | sort -h
echo ""
echo "Total size:"
du -sh "$DATA_DIR/pdf" 2>/dev/null
echo ""
echo "=============================================="
echo "MANUAL DOWNLOADS REQUIRED"
echo "=============================================="
echo ""
echo "The following DWG files require manual download (registration required):"
echo ""
echo "SUMIDEROS:"
echo "  - Sumidero SERVIU: https://documentos.arq.com.mx/Detalles/23676.html"
echo "  - Sumidero Simple: https://www.bibliocad.com/en/library/simple-drain_64394/"
echo "  - Sumidero Pluvial: https://www.bibliocad.com/en/library/storm-drain_21103/"
echo ""
echo "CAMARAS:"
echo "  - Cámaras Inspección: https://www.bibliocad.com/en/library/inspection-cameras_30595/"
echo ""
echo "SOLERAS:"
echo "  - Soleras (3 tipos): https://www.bibliocad.com/en/library/soleras_7037/"
echo ""
echo "VEREDAS:"
echo "  - Veredas y Pisos: https://libreriacad.com/dwg/detalles-constructivos-veredas-y-pisos/"
echo "  - Veredas y Rampas: https://libreriacad.com/dwg/plano-de-detalle-de-veredas-y-rampas/"
echo ""
echo "PERFILES CHILE:"
echo "  - Perfiles Vialidad: https://libreriacad.com/dwg/perfiles-tipo-vialidad-de-chile/"
echo ""
echo "Save downloaded DWG files to: $DATA_DIR/dwg/"
echo "=============================================="
