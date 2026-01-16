import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';

// GET /api/normativa/templates - Get all drawing templates or filter by type
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type');
    const id = searchParams.get('id');

    // If fetching by specific ID
    if (id) {
      const result = await db.execute({
        sql: `SELECT * FROM drawing_templates WHERE id = ?`,
        args: [id],
      });

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    }

    // Fetch all or by type
    let sql = 'SELECT * FROM drawing_templates';
    const args: string[] = [];

    if (templateType && templateType !== 'all') {
      sql += ' WHERE template_type = ?';
      args.push(templateType);
    }

    sql += ' ORDER BY template_type, name';

    const result = await db.execute({ sql, args });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching drawing templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drawing templates' },
      { status: 500 }
    );
  }
}
