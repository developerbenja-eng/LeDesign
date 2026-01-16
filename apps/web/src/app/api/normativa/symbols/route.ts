import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';

// GET /api/normativa/symbols - Get all CAD symbols or filter by category
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const id = searchParams.get('id');

    // If fetching by specific ID
    if (id) {
      const result = await db.execute({
        sql: `SELECT * FROM cad_symbols WHERE id = ?`,
        args: [id],
      });

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Symbol not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    }

    // Fetch all or by category
    let sql = 'SELECT * FROM cad_symbols';
    const args: string[] = [];

    if (category && category !== 'all') {
      sql += ' WHERE category = ?';
      args.push(category);
    }

    sql += ' ORDER BY category, name';

    const result = await db.execute({ sql, args });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching CAD symbols:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAD symbols' },
      { status: 500 }
    );
  }
}
