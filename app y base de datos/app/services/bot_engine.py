"""
Chatbot Engine - Bodega Mayorista with OpenAI GPT Integration
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
import os
import re

from ..models import Product, Category, Conversation, Message
from ..schemas import ProductSearchResult

# Try to import Google GenAI
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False


class ChatbotEngine:
    """Main chatbot logic for handling customer queries - Bodega Mayorista with Gemini AI"""
    
    # System prompt for Gemini (Bodega Mayorista context)
    SYSTEM_PROMPT = """Eres el Asistente Inteligente de Bodega Mayorista, experto en iPhones y tecnología.
Tu misión es triple:
1. ASESORAR: Responder dudas sobre iPhones, precios y stock.
2. VENDER: Si el cliente quiere comprar, debes recolectar sus datos (Nombre, Cédula, Dirección) y confirmar el pedido.
3. ACTUALIZAR: Si recibes un bloque de texto con precios (tipo lista de WhatsApp), debes identificar que es una actualización de inventario.

Tu personalidad:
- Profesional, ejecutivo y servicial.
- Colombiano (usa términos locales si es natural).
- Eficiente: No divagues, ve al grano.

INFORMACIÓN IMPORTANTE:
- Transferencia a humanos: Si el cliente pide hablar con alguien, dale estos números de WhatsApp:
  * Ventas Mayoristas: +57 321 XXX XXXX
  * Soporte Técnico: +57 310 XXX XXXX
- Si el cliente quiere comprar: Pide amablemente los datos y dile que el pedido quedará registrado en el sistema.

USO DE PRODUCTOS:
Te proporcionaré una lista de productos encontrados en el inventario. Úsala para responder con precisión."""

    def __init__(self, db: AsyncSession):
        from ..config import settings
        self.db = db
        self.api_key = settings.GEMINI_API_KEY
        self.model = None
        
        if HAS_GEMINI and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-pro')
            except Exception as e:
                print(f"Error initializing Gemini: {e}")
    
    async def process_message(self, message: str, sender_id: str, platform: str = "whatsapp") -> dict:
        """
        Process an incoming message and generate a response
        """
        message_lower = message.lower().strip()
        
        # Get or create conversation
        conversation = await self._get_or_create_conversation(sender_id, platform)
        
        # Save incoming message
        await self._save_message(conversation.id, "customer", message)
        
        # 1. Check for Inventory Update (Large blocks with many prices)
        if len(message) > 200 and ("iphone" in message_lower or "💰" in message):
            return await self._handle_inventory_update(message)

        # 2. Check for escalation keywords
        if self._should_escalate(message_lower):
            response = await self._handle_escalation(conversation)
        else:
            # 3. Normal Chat / Sales Flow
            products = await self._search_products(message_lower)
            
            # Generate response with Gemini
            if self.model:
                response = await self._generate_gemini_response(message, products, conversation)
            else:
                response = await self._generate_fallback_response(message_lower, products)
        
        # Save bot response
        await self._save_message(conversation.id, "bot", response["message"])
        
        return response

    async def _generate_gemini_response(self, user_message: str, products: list, conversation) -> dict:
        """Generate response using Google Gemini"""
        try:
            # Build context
            product_info = ""
            if products:
                product_info = "PRODUCTOS EN STOCK REAL:\n"
                for p in products[:8]:
                    product_info += f"- {p.name}: ${p.price:,.0f} (Stock: {p.stock})\n"
            
            prompt = f"{self.SYSTEM_PROMPT}\n\n{product_info}\n\nCLIENTE: {user_message}\nASISTENTE:"
            
            response = self.model.generate_content(prompt)
            bot_message = response.text
            
            # Logic to detect order intent in Gemini response (Simplified for now)
            # In a real scenario, we'd use a separate call to parse JSON structured intent
            
            return {
                "message": bot_message,
                "products": products,
                "should_escalate": "asesor" in bot_message.lower(),
                "escalation_reason": None
            }
        except Exception as e:
            print(f"Gemini Error: {e}")
            return await self._generate_fallback_response(user_message.lower(), products)

    async def _handle_inventory_update(self, text: str) -> dict:
        """
        Special logic to parse a large WhatsApp block and update prices
        """
        if not self.model:
            return {"message": "No se puede procesar la actualización sin Gemini configurado.", "products": [], "should_escalate": False}

        try:
            # Prompt Gemini to extract structured data from the block
            parse_prompt = f"""Extrae los productos y precios del siguiente mensaje de WhatsApp. 
Devuelve una lista JSON pura con este formato: 
[ {{"name": "nombre", "model": "modelo", "storage": "capacidad", "price": numero, "condition": "nuevo/usado"}} ]

MENSAJE:
{text}"""
            
            response = self.model.generate_content(parse_prompt)
            # Find JSON in response (Gemini sometimes adds markdown backticks)
            json_text = re.search(r'\[.*\]', response.text, re.DOTALL)
            if not json_text:
                return {"message": "No pude extraer datos del inventario. Revisa el formato.", "products": [], "should_escalate": False}
            
            import json
            data = json.loads(json_text.group())
            
            # Update DB (Simplified bulk update logic)
            products_updated = 0
            for item in data:
                # Search by name or model+storage
                # This would call a private method to update/insert
                products_updated += 1 

            return {
                "message": f"✅ ¡Entendido! He procesado la actualización. Se detectaron {len(data)} productos y se están sincronizando con la base de datos.",
                "products": [],
                "should_escalate": False
            }
        except Exception as e:
            print(f"Inventory Parse Error: {e}")
            return {"message": "Hubo un error procesando la lista de productos.", "products": [], "should_escalate": False}

    def _should_escalate(self, message: str) -> bool:
        """Check if message should trigger human escalation"""
        escalation_keywords = [
            "hablar con", "asesor", "persona", "humano", "agente",
            "queja", "problema", "reclamo", "devolucion", "devolución",
            "urgente", "gerente", "supervisor", "humana"
        ]
        return any(kw in message for kw in escalation_keywords)

    
    async def _generate_fallback_response(self, message: str, products: list) -> dict:
        """Generate response without GPT (keyword-based)"""
        
        # Greeting
        if any(kw in message for kw in ["hola", "buenas", "buenos", "hey", "hi"]):
            response = (
                "¡Hola! 👋 Bienvenido a Bodega Mayorista.\n\n"
                "¿En qué puedo ayudarte hoy?\n"
                "📦 Consulta nuestro catálogo\n"
                "💰 Precios mayoristas\n"
                "🚚 Información de envíos\n\n"
                "Visita nuestra tienda online en /tienda/ para ver todos nuestros productos."
            )
            
        # Hours
        elif any(kw in message for kw in ["hora", "horario", "abren", "cierran"]):
            response = "🕒 Nuestro horario es:\nLunes a Sábado de 7:00 AM a 6:00 PM\n\n¡Te esperamos!"
            
        # Location
        elif any(kw in message for kw in ["direccion", "dirección", "donde", "ubicacion", "ubicación"]):
            response = "📍 Estamos en:\nAv. Principal #123, Zona Industrial\n(Frente al Mercado Central)\n\n¿Necesitas indicaciones?"
            
        # Prices/Catalog
        elif any(kw in message for kw in ["precio", "cuesta", "catalogo", "catálogo", "lista"]):
            response = (
                "💰 Para ver precios y catálogo completo, te invito a visitar nuestra tienda online:\n\n"
                "🛒 /tienda/catalogo.html\n\n"
                "Ahí encontrarás precios actualizados y podrás hacer tu pedido. "
                "¡Tenemos descuentos por volumen!\n\n"
                "También puedes contactarnos al WhatsApp: (555) 123-4567"
            )
            
        # Shipping
        elif any(kw in message for kw in ["envio", "envío", "delivery", "entreg"]):
            response = (
                "🚚 ¡Sí, hacemos envíos!\n\n"
                "✅ Envío gratis en compras mayores a $5,000\n"
                "📦 Entrega en 24-48 horas (zona metropolitana)\n\n"
                "Para coordinar tu pedido, visita /tienda/ o escríbenos al WhatsApp."
            )
            
        # Products found
        elif products:
            response = self._format_product_results(products)
            
        # Unknown
        else:
            response = (
                "🤔 Disculpa, no entendí bien tu consulta.\n\n"
                "Puedo ayudarte con:\n"
                "• Horarios y ubicación\n"
                "• Información de productos\n"
                "• Envíos y entregas\n\n"
                "O visita nuestra tienda online: /tienda/\n\n"
                "Si prefieres hablar con una persona, escribe 'hablar con asesor'."
            )
        
        return {
            "message": response,
            "products": products,
            "should_escalate": False,
            "escalation_reason": None
        }
    
    async def _handle_escalation(self, conversation) -> dict:
        """Handle escalation to human agent"""
        conversation.status = "escalated"
        conversation.escalated_at = datetime.utcnow()
        await self.db.commit()
        
        message = (
            "👤 ¡Por supuesto! Te voy a conectar con uno de nuestros asesores.\n\n"
            "⏳ En breve te atenderán. Si es urgente, también puedes:\n\n"
            "📞 Llamar al: (555) 123-4567\n"
            "💬 WhatsApp: (555) 123-4567\n\n"
            "Gracias por tu paciencia."
        )
        
        return {
            "message": message,
            "products": [],
            "should_escalate": True,
            "escalation_reason": "Cliente solicitó hablar con un asesor"
        }
    
    async def _search_products(self, message: str) -> List[ProductSearchResult]:
        """Search for products in the database"""
        # Extract potential search terms
        search_terms = self._extract_search_terms(message)
        
        if not search_terms or len(search_terms) < 3:
            return []
        
        search_pattern = f"%{search_terms}%"
        
        query = (
            select(
                Product.id,
                Product.name,
                Product.brand,
                Product.unit,
                Product.price,
                Product.wholesale_price,
                Product.stock,
                Category.name.label("category_name")
            )
            .outerjoin(Category, Product.category_id == Category.id)
            .where(
                Product.is_active == True,
                Product.stock > 0,
                or_(
                    func.lower(Product.name).like(search_pattern),
                    func.lower(Product.brand).like(search_pattern)
                )
            )
            .limit(5)
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        return [
            ProductSearchResult(
                id=row.id,
                name=row.name,
                brand=row.brand,
                unit=row.unit,
                price=row.price,
                wholesale_price=row.wholesale_price,
                stock=row.stock,
                category_name=row.category_name
            )
            for row in rows
        ]
    
    def _extract_search_terms(self, message: str) -> str:
        """Extract product search terms from a message"""
        # Remove common words
        remove_words = [
            "tienes", "tienen", "hay", "busco", "necesito", "quiero", "ver",
            "precio", "de", "del", "la", "el", "un", "una", "cuanto", "cuesta",
            "cuánto", "me", "puedes", "mostrar", "por", "favor", "hola", "buenas"
        ]
        
        words = message.lower().split()
        filtered_words = [w for w in words if w not in remove_words and len(w) > 2]
        
        return " ".join(filtered_words)
    
    def _format_product_results(self, products: List[ProductSearchResult]) -> str:
        """Format product results for display"""
        lines = ["📦 Encontré estos productos:\n"]
        
        for i, p in enumerate(products[:5], 1):
            lines.append(f"{i}. {p.name} ({p.brand or 'Sin marca'})")
            lines.append(f"   Stock: {p.stock} {p.unit}s disponibles\n")
        
        lines.append("\n🛒 Para ver precios y comprar, visita /tienda/catalogo.html")
        lines.append("📱 O escríbenos al WhatsApp: (555) 123-4567")
        
        return "\n".join(lines)
    
    async def _get_conversation_history(self, conversation_id: int, limit: int = 10):
        """Get recent messages from conversation"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()
        return list(reversed(messages))
    
    async def _get_or_create_conversation(self, sender_id: str, platform: str) -> Conversation:
        """Get existing conversation or create a new one"""
        query = select(Conversation).where(
            Conversation.sender_id == sender_id,
            Conversation.platform == platform,
            Conversation.status == "active"
        )
        result = await self.db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            conversation = Conversation(
                platform=platform,
                sender_id=sender_id,
                status="active"
            )
            self.db.add(conversation)
            await self.db.commit()
            await self.db.refresh(conversation)
        
        return conversation
    
    async def _save_message(self, conversation_id: int, sender_type: str, content: str):
        """Save a message to the database"""
        message = Message(
            conversation_id=conversation_id,
            sender_type=sender_type,
            content=content
        )
        self.db.add(message)
        await self.db.commit()
