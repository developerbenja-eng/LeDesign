#!/usr/bin/env python3
"""
IDE Chile Data Downloader
Downloads geospatial data from Chilean government ArcGIS services
Converts ESRI JSON to GeoJSON format
"""

import json
import os
import time
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional

OUTPUT_DIR = "data/ide-chile"

# Service definitions
SERVICES = [
    # DGA - Water Resources
    {"id": "red-hidrometrica", "name": "Hydrometric Network", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Red_Hidrometrica/MapServer", "layers": [0]},
    {"id": "alertas-dga", "name": "Flood Alerts", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ALERTAS/MapServer", "layers": [0]},
    {"id": "estaciones-embalse", "name": "Reservoir Stations", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/ESTACION_EMBALSE/MapServer", "layers": [0]},
    {"id": "acuiferos-protegidos", "name": "Protected Aquifers", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Acuiferos_Protegidos/MapServer", "layers": [0]},
    {"id": "areas-restriccion", "name": "Restriction Zones", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Areas_de_Restriccion_y_Zonas_de_Prohibicion/MapServer", "layers": [0]},
    {"id": "escasez-hidrica", "name": "Water Scarcity", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Escasez_Hidrica/MapServer", "layers": [0]},
    {"id": "declaracion-agotamiento", "name": "Water Depletion", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Declaracion_de_Agotamiento/MapServer", "layers": [0]},
    {"id": "caudales-reserva", "name": "Reserved Flows", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Decretos_Caudales_de_Reserva/MapServer", "layers": [0]},
    {"id": "turberas", "name": "Peatland Prohibition", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA/Area_prohibicion_para_drenajes_en_turberas/MapServer", "layers": [0]},

    # DOH - Hydraulic Works
    {"id": "embalses", "name": "Dams and Reservoirs", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Embalses/MapServer", "layers": [0]},
    {"id": "canales-cnr", "name": "Irrigation Canals", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/Canales_CNR/MapServer", "layers": [0]},
    {"id": "apr", "name": "Rural Potable Water", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/APR/MapServer", "layers": [0]},

    # SIALL - Storm Water
    {"id": "siall-colectores", "name": "Storm Collectors", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer", "layers": [0]},
    {"id": "siall-descargas", "name": "Storm Discharge", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer", "layers": [2]},
    {"id": "siall-camaras", "name": "Storm Chambers", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer", "layers": [3]},
    {"id": "siall-sumideros", "name": "Catch Basins", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer", "layers": [5]},
    {"id": "siall-areas", "name": "Tributary Areas", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SIALL/MapServer", "layers": [9]},

    # Sanitation
    {"id": "ssr-ley20998", "name": "Rural Sanitation", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/DOH/SSR_Clasificados_Ley_20998/MapServer", "layers": [0]},

    # VIALIDAD - Roads & Infrastructure
    {"id": "puentes", "name": "Bridges", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Puentes/MapServer", "layers": [0]},
    {"id": "infraestructura-peajes", "name": "Toll Plazas", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer", "layers": [1]},
    {"id": "infraestructura-pesaje", "name": "Weighing Stations", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer", "layers": [0]},
    {"id": "infraestructura-tuneles", "name": "Tunnels", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer", "layers": [3]},
    {"id": "infraestructura-balsas", "name": "Ferries", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Infraestructura_Vial/MapServer", "layers": [2]},
    {"id": "pasos-fronterizos", "name": "Border Crossings", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Pasos_Fronterizos/MapServer", "layers": [0]},
    {"id": "zonas-descanso", "name": "Rest Areas", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/VIALIDAD/Zonas_de_Descanso/MapServer", "layers": [0]},

    # Base Maps
    {"id": "limites-regiones", "name": "Regional Boundaries", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer", "layers": [0]},
    {"id": "limites-provincias", "name": "Provincial Boundaries", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer", "layers": [1]},
    {"id": "limites-comunas", "name": "Communal Boundaries", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/LIMITES/MapServer", "layers": [2]},
    {"id": "asentamientos", "name": "Settlements", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/ASENTAMIENTOS/MapServer", "layers": [0]},
    {"id": "snaspe", "name": "Protected Areas", "url": "https://rest-sit.mop.gob.cl/arcgis/rest/services/MAPA_BASE/SNASPE/MapServer", "layers": [0]},
]


def esri_to_geojson_geometry(esri_geom: Dict, geom_type: str) -> Optional[Dict]:
    """Convert ESRI geometry to GeoJSON geometry"""
    if not esri_geom:
        return None

    if geom_type == "esriGeometryPoint":
        if "x" in esri_geom and "y" in esri_geom:
            return {
                "type": "Point",
                "coordinates": [esri_geom["x"], esri_geom["y"]]
            }
    elif geom_type == "esriGeometryPolyline":
        if "paths" in esri_geom:
            if len(esri_geom["paths"]) == 1:
                return {
                    "type": "LineString",
                    "coordinates": esri_geom["paths"][0]
                }
            else:
                return {
                    "type": "MultiLineString",
                    "coordinates": esri_geom["paths"]
                }
    elif geom_type == "esriGeometryPolygon":
        if "rings" in esri_geom:
            if len(esri_geom["rings"]) == 1:
                return {
                    "type": "Polygon",
                    "coordinates": esri_geom["rings"]
                }
            else:
                return {
                    "type": "MultiPolygon",
                    "coordinates": [[ring] for ring in esri_geom["rings"]]
                }
    elif geom_type == "esriGeometryMultipoint":
        if "points" in esri_geom:
            return {
                "type": "MultiPoint",
                "coordinates": esri_geom["points"]
            }

    return None


def esri_to_geojson(esri_data: Dict) -> Dict:
    """Convert ESRI JSON response to GeoJSON FeatureCollection"""
    features = []
    geom_type = esri_data.get("geometryType", "")

    for esri_feature in esri_data.get("features", []):
        geometry = esri_to_geojson_geometry(
            esri_feature.get("geometry"),
            geom_type
        )

        feature = {
            "type": "Feature",
            "geometry": geometry,
            "properties": esri_feature.get("attributes", {})
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


def query_layer(base_url: str, layer_id: int, max_records: int = 10000) -> Dict:
    """Query all features from a layer with pagination"""
    all_features = []
    offset = 0
    page_size = 1000

    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "json",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
        }

        url = f"{base_url}/{layer_id}/query?{urllib.parse.urlencode(params)}"

        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                data = json.loads(response.read().decode())

            if "error" in data:
                print(f"    API Error: {data['error'].get('message', 'Unknown error')}")
                break

            features = data.get("features", [])
            if not features:
                break

            all_features.extend(features)
            print(f"    Fetched {len(all_features)} features...")

            if len(features) < page_size or len(all_features) >= max_records:
                break

            offset += page_size
            time.sleep(0.5)  # Rate limiting

        except Exception as e:
            print(f"    Error: {e}")
            break

    # Return in ESRI format with all features
    result = {
        "features": all_features,
        "geometryType": data.get("geometryType", "") if "data" in dir() else ""
    }

    # Get geometry type from first successful response
    if all_features and "data" in dir() and "geometryType" in data:
        result["geometryType"] = data["geometryType"]

    return result


def download_service(service: Dict) -> int:
    """Download all layers from a service"""
    print(f"\nDownloading: {service['name']} ({service['id']})")

    total_features = 0

    for layer_id in service.get("layers", [0]):
        print(f"  Layer {layer_id}:")

        try:
            esri_data = query_layer(service["url"], layer_id)

            if esri_data["features"]:
                geojson = esri_to_geojson(esri_data)

                filename = f"{service['id']}_layer{layer_id}.geojson"
                filepath = os.path.join(OUTPUT_DIR, filename)

                with open(filepath, "w") as f:
                    json.dump(geojson, f)

                count = len(geojson["features"])
                total_features += count
                print(f"    Saved {count} features to {filename}")
            else:
                print(f"    No features found")

        except Exception as e:
            print(f"    Error: {e}")

        time.sleep(1)  # Rate limiting between layers

    return total_features


def main():
    print("=" * 60)
    print("IDE Chile Data Downloader")
    print("=" * 60)

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    summary = []
    total_all = 0

    for service in SERVICES:
        try:
            count = download_service(service)
            summary.append({
                "id": service["id"],
                "name": service["name"],
                "features": count,
                "status": "success"
            })
            total_all += count
        except Exception as e:
            print(f"  Failed: {e}")
            summary.append({
                "id": service["id"],
                "name": service["name"],
                "features": 0,
                "status": "failed"
            })

        time.sleep(1)  # Rate limiting between services

    # Save summary
    summary_path = os.path.join(OUTPUT_DIR, "download-summary.json")
    with open(summary_path, "w") as f:
        json.dump({
            "downloadedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "services": summary,
            "totalFeatures": total_all
        }, f, indent=2)

    print("\n" + "=" * 60)
    print("Download Summary")
    print("=" * 60)
    print(f"{'Service':<30} {'Features':>10} {'Status':<10}")
    print("-" * 52)
    for s in summary:
        print(f"{s['name'][:30]:<30} {s['features']:>10} {s['status']:<10}")
    print("-" * 52)
    print(f"{'TOTAL':<30} {total_all:>10}")
    print(f"\nData saved to: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
