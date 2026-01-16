import { NextRequest, NextResponse } from 'next/server';
import {
  IDE_SERVICES,
  IDE_CATEGORIES,
  IDE_PROVIDERS,
  buildQueryUrl,
  type IDEService,
  type IDEQueryParams,
} from '@ledesign/terrain';

export const runtime = 'nodejs';

/**
 * GET /api/ide - Get IDE service catalog and metadata
 *
 * Query params:
 * - service: Get specific service details
 * - layer: Get layer details for a service
 * - category: Filter services by category
 * - search: Search services
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get specific service with layer details
  const serviceId = searchParams.get('service');
  if (serviceId) {
    const service = IDE_SERVICES.find((s) => s.id === serviceId);
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Optionally fetch layer details from remote API
    const layerId = searchParams.get('layer');
    if (layerId !== null) {
      try {
        const layerUrl = `${service.baseUrl}/${layerId}?f=json`;
        const response = await fetch(layerUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch layer: ${response.statusText}`);
        }

        const layerData = await response.json();
        return NextResponse.json({
          success: true,
          service,
          layer: {
            id: parseInt(layerId),
            name: layerData.name,
            description: layerData.description,
            geometryType: layerData.geometryType,
            fields: layerData.fields || [],
            extent: layerData.extent,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: 500 }
        );
      }
    }

    // Fetch all layers for the service
    try {
      const serviceUrl = `${service.baseUrl}?f=json`;
      const response = await fetch(serviceUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch service: ${response.statusText}`);
      }

      const serviceData = await response.json();
      return NextResponse.json({
        success: true,
        service: {
          ...service,
          remoteData: {
            description: serviceData.serviceDescription || serviceData.description,
            layers: serviceData.layers || [],
            spatialReference: serviceData.spatialReference,
            fullExtent: serviceData.fullExtent,
          },
        },
      });
    } catch (error) {
      // Return service from catalog even if remote fetch fails
      return NextResponse.json({
        success: true,
        service,
        warning: `Could not fetch remote data: ${(error as Error).message}`,
      });
    }
  }

  // Filter by category
  const category = searchParams.get('category');
  if (category) {
    const filtered = IDE_SERVICES.filter((s) => s.category === category);
    return NextResponse.json({
      success: true,
      category: IDE_CATEGORIES[category as keyof typeof IDE_CATEGORIES],
      services: filtered,
    });
  }

  // Search services
  const search = searchParams.get('search');
  if (search) {
    const lowerSearch = search.toLowerCase();
    const filtered = IDE_SERVICES.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerSearch) ||
        s.nameEs.toLowerCase().includes(lowerSearch) ||
        s.description.toLowerCase().includes(lowerSearch) ||
        s.descriptionEs.toLowerCase().includes(lowerSearch) ||
        s.tags.some((t) => t.toLowerCase().includes(lowerSearch))
    );
    return NextResponse.json({
      success: true,
      query: search,
      services: filtered,
    });
  }

  // Return full catalog
  return NextResponse.json({
    success: true,
    providers: IDE_PROVIDERS,
    categories: IDE_CATEGORIES,
    services: IDE_SERVICES,
    stats: {
      totalServices: IDE_SERVICES.length,
      byCategory: Object.keys(IDE_CATEGORIES).reduce((acc, cat) => {
        acc[cat] = IDE_SERVICES.filter((s) => s.category === cat).length;
        return acc;
      }, {} as Record<string, number>),
    },
  });
}

/**
 * POST /api/ide - Query IDE service and return features
 *
 * Body:
 * - serviceId: Service ID
 * - layerId: Layer ID
 * - bbox?: Bounding box { west, south, east, north }
 * - where?: SQL where clause
 * - outFields?: Array of field names
 * - maxRecords?: Max features to return
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, layerId, bbox, where, outFields, maxRecords = 1000 } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    const service = IDE_SERVICES.find((s) => s.id === serviceId);
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const queryParams: IDEQueryParams = {
      bbox,
      where,
      outFields,
      maxRecords,
      returnGeometry: true,
      format: 'geojson',
    };

    const queryUrl = buildQueryUrl(service, layerId ?? 0, queryParams);

    const response = await fetch(queryUrl);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Query failed: ${response.status} - ${text}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.nameEs,
      },
      layerId: layerId ?? 0,
      featureCount: data.features?.length || 0,
      features: data.features || [],
      bbox,
    });
  } catch (error) {
    console.error('IDE query error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
