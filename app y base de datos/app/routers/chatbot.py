"""
Chatbot Router - Webhook endpoints for Instagram and WhatsApp
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import os
import hmac
import hashlib
import httpx

from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ChatbotQuery, ChatbotResponse, ConversationResponse
from ..services.bot_engine import ChatbotEngine
from typing import List

router = APIRouter(prefix="/webhook", tags=["chatbot"])

# Meta API configuration
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "my_verify_token_2024")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """
    Webhook verification endpoint for Meta (Instagram/WhatsApp)
    Meta sends a GET request to verify the webhook URL
    """
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        return int(hub_challenge)
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Receive incoming messages from Instagram/WhatsApp
    """
    body = await request.json()
    
    # Process Instagram messages
    if "object" in body and body["object"] == "instagram":
        for entry in body.get("entry", []):
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                message_data = messaging.get("message", {})
                message_text = message_data.get("text", "")
                
                if sender_id and message_text:
                    # Process the message
                    bot = ChatbotEngine(db)
                    response = await bot.process_message(
                        message=message_text,
                        sender_id=sender_id,
                        platform="instagram"
                    )
                    
                    # Send response back to user
                    await send_instagram_message(sender_id, response["message"])
                    
                    # If should escalate, notify staff
                    if response["should_escalate"]:
                        # Here you could send a notification to staff
                        # via email, SMS, or internal dashboard
                        pass
    
    # Process WhatsApp messages (for future use)
    elif "object" in body and body["object"] == "whatsapp_business_account":
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") == "messages":
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    
                    for msg in messages:
                        sender_id = msg.get("from")
                        message_text = msg.get("text", {}).get("body", "")
                        
                        if sender_id and message_text:
                            bot = ChatbotEngine(db)
                            response = await bot.process_message(
                                message=message_text,
                                sender_id=sender_id,
                                platform="whatsapp"
                            )
                            
                            # Send response back via WhatsApp
                            phone_number_id = value.get("metadata", {}).get("phone_number_id")
                            if phone_number_id:
                                await send_whatsapp_message(phone_number_id, sender_id, response["message"])
    
    return {"status": "ok"}


async def send_instagram_message(recipient_id: str, message: str):
    """Send a message back to Instagram user"""
    if not META_ACCESS_TOKEN:
        print(f"[DEV MODE] Would send to {recipient_id}: {message}")
        return
    
    url = f"https://graph.facebook.com/v18.0/me/messages"
    headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPError as e:
            print(f"Error sending Instagram message: {e}")


async def send_whatsapp_message(phone_number_id: str, recipient: str, message: str):
    """Send a message back to WhatsApp user"""
    if not META_ACCESS_TOKEN:
        print(f"[DEV MODE] Would send WhatsApp to {recipient}: {message}")
        return
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": message}
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPError as e:
            print(f"Error sending WhatsApp message: {e}")


# ============ Web Test Endpoint ============
@router.post("/test", response_model=ChatbotResponse)
async def test_chatbot(query: ChatbotQuery, db: AsyncSession = Depends(get_db)):
    """
    Test endpoint to try the chatbot without Instagram/WhatsApp
    Useful for development and testing
    """
    bot = ChatbotEngine(db)
    response = await bot.process_message(
        message=query.query,
        sender_id=query.sender_id or "test_user",
        platform=query.platform
    )
    
    return ChatbotResponse(
        message=response["message"],
        products=response["products"],
        should_escalate=response["should_escalate"],
        escalation_reason=response.get("escalation_reason")
    )


# ============ Web Chat Widget Endpoint ============
@router.post("/chat/web", response_model=ChatbotResponse)
async def web_chat(query: ChatbotQuery, db: AsyncSession = Depends(get_db)):
    """
    Dedicated endpoint for the website chat widget.
    """
    bot = ChatbotEngine(db)
    # Ensure platform is set to 'web'
    response = await bot.process_message(
        message=query.query,
        sender_id=query.sender_id or "web_guest",
        platform="web"
    )
    
    return ChatbotResponse(
        message=response["message"],
        products=response["products"],
        should_escalate=response["should_escalate"],
        escalation_reason=response.get("escalation_reason")
    )


# ============ Conversation Management Endpoints ============
@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    status: str = None,
    platform: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for the admin panel"""
    query = select(Conversation).order_by(Conversation.updated_at.desc())
    
    if status:
        query = query.where(Conversation.status == status)
    if platform:
        query = query.where(Conversation.platform == platform)
    
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a specific conversation"""
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return [
        {
            "id": m.id,
            "sender_type": m.sender_type,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/close")
async def close_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Close a conversation"""
    query = select(Conversation).where(Conversation.id == conversation_id)
    result = await db.execute(query)
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    
    conversation.status = "closed"
    await db.commit()
    
    return {"status": "ok", "message": "Conversación cerrada"}
