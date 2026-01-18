import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getClient, query, execute } from '@ledesign/db';
import { DataResource } from '@/types/data-resources';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/data-resources - List user's accessible data resources
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      // TODO: Implement database query when data_resources table is created
      // For now, return empty array to trigger mock data fallback

      // Future implementation:
      // const resources = await query<DataResource>(
      //   getClient(),
      //   `SELECT * FROM data_resources
      //    WHERE user_id = ? OR access_type = 'public' OR access_type = 'shared'
      //    ORDER BY updated_at DESC`,
      //   [req.user.userId]
      // );

      return NextResponse.json({
        success: true,
        resources: [],
        message: 'Data resources endpoint ready (using mock data for now)',
      });
    } catch (error) {
      console.error('Error fetching data resources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data resources' },
        { status: 500 }
      );
    }
  });
}

// POST /api/data-resources - Create a new data resource
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const {
        name,
        description,
        type,
        provider,
        bounds,
        center_lat,
        center_lon,
        url,
        format,
        resolution,
        coverage_area,
        access_type,
        api_key,
        tags,
        source_citation,
        license,
      } = body;

      if (!name || !type || !provider || !access_type) {
        return NextResponse.json(
          { error: 'Name, type, provider, and access_type are required' },
          { status: 400 }
        );
      }

      const resourceId = generateId();
      const now = new Date().toISOString();

      // TODO: Implement database insert when data_resources table is created

      // Future implementation:
      // await execute(
      //   getClient(),
      //   `INSERT INTO data_resources (
      //     id, user_id, name, description, type, provider,
      //     bounds_south, bounds_north, bounds_west, bounds_east,
      //     center_lat, center_lon,
      //     url, format, resolution, coverage_area,
      //     access_type, api_key, tags, source_citation, license,
      //     created_at, updated_at
      //   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      //   [
      //     resourceId,
      //     req.user.userId,
      //     name,
      //     description || null,
      //     type,
      //     provider,
      //     bounds?.south ?? null,
      //     bounds?.north ?? null,
      //     bounds?.west ?? null,
      //     bounds?.east ?? null,
      //     center_lat ?? null,
      //     center_lon ?? null,
      //     url || null,
      //     format || null,
      //     resolution || null,
      //     coverage_area || null,
      //     access_type,
      //     api_key || null,
      //     tags ? JSON.stringify(tags) : null,
      //     source_citation || null,
      //     license || null,
      //     now,
      //     now,
      //   ]
      // );

      const resource: DataResource = {
        id: resourceId,
        name,
        description: description || undefined,
        type,
        provider,
        bounds: bounds || undefined,
        center_lat: center_lat ?? undefined,
        center_lon: center_lon ?? undefined,
        url: url || undefined,
        format: format || undefined,
        resolution: resolution || undefined,
        coverage_area: coverage_area || undefined,
        access_type,
        api_key: api_key || undefined,
        tags: tags || undefined,
        source_citation: source_citation || undefined,
        license: license || undefined,
        created_at: now,
        updated_at: now,
      };

      return NextResponse.json({
        success: true,
        resource,
        message: 'Data resource created (mock - database table not yet created)',
      });
    } catch (error) {
      console.error('Error creating data resource:', error);
      return NextResponse.json(
        { error: 'Failed to create data resource' },
        { status: 500 }
      );
    }
  });
}
