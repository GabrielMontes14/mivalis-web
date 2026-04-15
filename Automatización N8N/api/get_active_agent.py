import asyncio
from app.services.supabase_service import SupabaseService

async def get_agent():
    client = SupabaseService.get_client()
    res = client.table('agentes_desplegados').select('*').eq('estado', 'activo').limit(1).execute()
    if res.data:
        data = res.data[0]
        print(f"AGENT_ID: {data['id']}")
        print(f"WEBHOOK: {data['n8n_webhook_url']}")
        bot_name = data.get('config_inyectada', {}).get('nombre_bot', 'Bot IA')
        print(f"BOT_NAME: {bot_name}")
    else:
        print('NO ACTIVE AGENTS FOUND')

if __name__ == '__main__':
    asyncio.run(get_agent())
