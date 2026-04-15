
import asyncio
from app.services.supabase_service import SupabaseService
import logging

logging.basicConfig(level=logging.INFO)

async def check():
    client = SupabaseService.get_client()
    # Check for lead with phone 573001234567
    r = client.table('leads').select('*').eq('telefono', '573001234567').execute()
    if r.data:
        print('LEAD FOUND:', r.data[0]['id'], r.data[0]['ultimo_contacto'])
    else:
        print('LEAD NOT FOUND')

if __name__ == '__main__':
    asyncio.run(check())
