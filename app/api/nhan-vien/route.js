import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const so_danh_bo = searchParams.get('id');
  
  if (!so_danh_bo) return NextResponse.json({ ho_ten: "" });
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT ho_ten FROM nhan_vien WHERE so_danh_bo = ${so_danh_bo} LIMIT 1`;
    if (result.length > 0) return NextResponse.json({ ho_ten: result[0].ho_ten });
    return NextResponse.json({ ho_ten: "" });
  } catch (error) {
    return NextResponse.json({ ho_ten: "" });
  }
}
