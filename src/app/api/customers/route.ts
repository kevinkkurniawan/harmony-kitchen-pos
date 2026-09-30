import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    const customers = await prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { customername: { contains: query, mode: 'insensitive' } },
              { customerno: { contains: query, mode: 'insensitive' } },
              { phone1: { contains: query } },
              { phone2: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { customername: 'asc' },
    });

    const mappedCustomers = customers.map((c) => {
      let discount = 0;
      let customerType = 'Regular';
      if (c.customertypeid === 1) {
        customerType = 'Vip';
        discount = 5;
      } else if (c.customertypeid === 2) {
        customerType = 'Wholesale';
        discount = 10;
      } else if (c.description && /discount:\s*(\d+)/i.test(c.description)) {
        const match = c.description.match(/discount:\s*(\d+)/i);
        if (match) discount = Number(match[1]);
      }
      return {
        id: c.id.toString(),
        customerNo: c.customerno || '',
        name: c.customername || 'Unknown',
        phone: c.phone1 || c.phone2 || '',
        customerType,
        discountPercent: discount,
      };
    });

    return NextResponse.json({ success: true, data: mappedCustomers });
  } catch (err: any) {
    console.error('Failed to fetch customers from PostgreSQL database:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerNo, name, phone, customerType, discountPercent } = body;

    let typeId = 0;
    if (customerType === 'Vip') typeId = 1;
    else if (customerType === 'Wholesale') typeId = 2;

    const desc = discountPercent ? `Discount: ${discountPercent}%` : undefined;

    const newCustomer = await prisma.customer.create({
      data: {
        customerno: customerNo || `CUST-${Date.now().toString().slice(-4)}`,
        customername: name || 'Pelanggan Baru',
        phone1: phone || '',
        customertypeid: typeId,
        description: desc,
        isactive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newCustomer.id.toString(),
        customerNo: newCustomer.customerno,
        name: newCustomer.customername,
        phone: newCustomer.phone1,
        customerType: customerType || 'Regular',
        discountPercent: Number(discountPercent || 0),
      },
    });
  } catch (err: any) {
    console.error('Failed to create customer:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Customer ID required' }, { status: 400 });
    }

    await prisma.customer.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'Customer deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
