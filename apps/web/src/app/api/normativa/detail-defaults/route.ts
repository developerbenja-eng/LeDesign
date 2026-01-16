import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';

// GET /api/normativa/detail-defaults - Get infrastructure type to detail mappings
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const infrastructureType = searchParams.get('type');
    const defaultOnly = searchParams.get('default') === 'true';

    let sql = `
      SELECT
        idd.*,
        sd.name_es as detail_name,
        sd.category as detail_category,
        sd.thumbnail_svg as detail_thumbnail
      FROM infrastructure_detail_defaults idd
      LEFT JOIN standard_details sd ON idd.detail_code = sd.code
    `;
    const args: string[] = [];
    const conditions: string[] = [];

    if (infrastructureType) {
      conditions.push('idd.infrastructure_type = ?');
      args.push(infrastructureType);
    }

    if (defaultOnly) {
      conditions.push('idd.is_default = 1');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY idd.infrastructure_type, idd.is_default DESC';

    const result = await db.execute({ sql, args });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching detail defaults:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detail defaults' },
      { status: 500 }
    );
  }
}

// POST /api/normativa/detail-defaults - Add or update a detail default
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const { infrastructureType, detailCode, isDefault = true, conditions } = body;

    if (!infrastructureType || !detailCode) {
      return NextResponse.json(
        { error: 'infrastructureType and detailCode are required' },
        { status: 400 }
      );
    }

    const id = `idd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.execute({
      sql: `
        INSERT INTO infrastructure_detail_defaults (id, infrastructure_type, detail_code, is_default, conditions_json)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        id,
        infrastructureType,
        detailCode,
        isDefault ? 1 : 0,
        conditions ? JSON.stringify(conditions) : null,
      ],
    });

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error creating detail default:', error);
    return NextResponse.json(
      { error: 'Failed to create detail default' },
      { status: 500 }
    );
  }
}
