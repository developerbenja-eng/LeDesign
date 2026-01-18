#!/bin/bash
# IDE Chile Data Downloader using curl

OUTPUT_DIR="data/ide-chile"
mkdir -p "$OUTPUT_DIR"

download_layer() {
    local service_id=$1
    local service_name=$2
    local base_url=$3
    local layer_id=$4
    local layer_name=$5

    echo "Downloading: $service_name - Layer $layer_id ($layer_name)"

    local output_file="$OUTPUT_DIR/${service_id}_layer${layer_id}.geojson"

    # Query with pagination
    local url="${base_url}/${layer_id}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=5000"

    curl -s "$url" > "$output_file" 2>/dev/null

    if [ -f "$output_file" ]; then
        local count=$(grep -o '"type":"Feature"' "$output_file" | wc -l | tr -d ' ')
        echo "  -> $count features saved to $output_file"
    else
        echo "  -> Failed"
    fi
}

echo "============================================"
echo "IDE Chile Data Downloader"
echo "============================================"
echo ""

# DGA - Water Resources
download_layer "red-hidrometrica" "Hydrometric Network" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Red_Hidrometrica/MapServer" 0 "Station Types"
download_layer "alertas-dga" "Flood Alerts" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer" 0 "Alert Stations"
download_layer "estaciones-embalse" "Reservoir Stations" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ESTACION_EMBALSE/MapServer" 0 "Reservoir Monitoring"
download_layer "acuiferos-protegidos" "Protected Aquifers" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Acuiferos_Protegidos/MapServer" 0 "Aquifers"
download_layer "areas-restriccion" "Restriction Zones" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Areas_de_Restriccion_y_Zonas_de_Prohibicion/MapServer" 0 "Restriction Areas"
download_layer "escasez-hidrica" "Water Scarcity" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Escasez_Hidrica/MapServer" 0 "Scarcity Decrees"
download_layer "agotamiento" "Water Depletion" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Declaracion_de_Agotamiento/MapServer" 0 "Depletion Zones"
download_layer "caudales-reserva" "Reserved Flows" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Caudales_de_Reserva/MapServer" 0 "Reserved Flows"
download_layer "turberas" "Peatland Prohibition" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Area_prohibicion_para_drenajes_en_turberas/MapServer" 0 "Peatlands"

# DOH - Hydraulic Works
download_layer "embalses" "Dams and Reservoirs" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Embalses/MapServer" 0 "Reservoir Cadastre"
download_layer "canales-cnr" "Irrigation Canals" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Canales_CNR/MapServer" 0 "Canals"
download_layer "apr" "Rural Potable Water" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/APR/MapServer" 0 "APR Systems"

# SIALL - Storm Water
download_layer "siall-colectores" "Storm Collectors" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer" 0 "Collectors"
download_layer "siall-descargas" "Storm Discharge" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer" 2 "Discharge Points"
download_layer "siall-camaras" "Storm Chambers" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer" 3 "Chambers"
download_layer "siall-sumideros" "Catch Basins" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer" 5 "Catch Basins"
download_layer "siall-areas" "Tributary Areas" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer" 9 "Drainage Areas"

# Sanitation
download_layer "ssr-ley20998" "Rural Sanitation" "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Clasificados_Ley_20998/MapServer" 0 "Sanitation Systems"

# VIALIDAD - Roads
download_layer "puentes" "Bridges" "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes/MapServer" 0 "All Bridges"
download_layer "infraestructura-peajes" "Toll Plazas" "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer" 1 "Tolls"
download_layer "infraestructura-tuneles" "Tunnels" "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer" 3 "Tunnels"
download_layer "pasos-fronterizos" "Border Crossings" "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Pasos_Fronterizos/MapServer" 0 "Border Crossings"
download_layer "zonas-descanso" "Rest Areas" "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Zonas_de_Descanso/MapServer" 0 "Rest Areas"

# Base Maps
download_layer "limites-regiones" "Regional Boundaries" "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer" 0 "Regions"
download_layer "limites-provincias" "Provincial Boundaries" "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer" 1 "Provinces"
download_layer "limites-comunas" "Communal Boundaries" "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer" 2 "Communes"
download_layer "asentamientos" "Settlements" "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/ASENTAMIENTOS/MapServer" 0 "Settlements"
download_layer "snaspe" "Protected Areas" "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/SNASPE/MapServer" 0 "SNASPE"

echo ""
echo "============================================"
echo "Download complete!"
echo "============================================"
echo ""

# Count total features
echo "Summary:"
total=0
for f in "$OUTPUT_DIR"/*.geojson; do
    if [ -f "$f" ]; then
        count=$(grep -o '"type":"Feature"' "$f" 2>/dev/null | wc -l | tr -d ' ')
        name=$(basename "$f" .geojson)
        echo "  $name: $count features"
        total=$((total + count))
    fi
done
echo ""
echo "Total features: $total"
echo "Data saved to: $OUTPUT_DIR/"
