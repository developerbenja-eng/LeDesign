import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';

export const dynamic = 'force-dynamic';

// GET /api/normativa/details - Get all standard details or filter by category
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const code = searchParams.get('code');

    // If fetching by specific code
    if (code) {
      const result = await db.execute({
        sql: `SELECT * FROM standard_details WHERE code = ?`,
        args: [code],
      });

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Detail not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    }

    // Fetch all or by category
    let sql = 'SELECT * FROM standard_details';
    const args: string[] = [];

    if (category && category !== 'all') {
      sql += ' WHERE category = ?';
      args.push(category);
    }

    sql += ' ORDER BY category, subcategory, code';

    const result = await db.execute({ sql, args });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching standard details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standard details' },
      { status: 500 }
    );
  }
}
