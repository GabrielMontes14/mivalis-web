from typing import List, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import EmailLog
from ..database import async_session as async_session_factory
from ..config import settings
import logging
import asyncio

# Configure logging
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            TEMPLATE_FOLDER=settings.TEMPLATE_FOLDER
        )
        self.fastmail = FastMail(self.conf)

    async def send_email(
        self,
        subject: str,
        recipients: List[str],
        template_name: str,
        template_body: Dict[str, Any]
    ):
        """
        Send email and log the attempt to database with retry logic
        """
        # Create message
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            template_body=template_body,
            subtype=MessageType.html
        )

        status = "pending"
        error_msg = None
        max_retries = 3

        for attempt in range(max_retries):
            try:
                # Send email
                await self.fastmail.send_message(message, template_name=template_name)
                status = "sent"
                logger.info(f"Email sent to {recipients}")
                break # Success, exit loop
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed to send email: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1) # Wait 1 second before retry
                else:
                    status = "failed"
                    logger.error(f"Failed to send email after {max_retries} attempts")

        # Log to database (Independent session to ensure log is saved even if transaction fails)
        try:
            async with async_session_factory() as db:
                email_log = EmailLog(
                    recipient=",".join(recipients),
                    subject=subject,
                    template_name=template_name,
                    status=status,
                    error_message=error_msg
                )
                db.add(email_log)
                await db.commit()
        except Exception as db_e:
            logger.error(f"Failed to log email to DB: {db_e}")

    async def send_order_confirmation(self, order, customer):
        """
        Send order confirmation email
        """
        # Format items for template
        items = []
        for item in order.items:
            # Handle both object attributes and dictionary access if needed
            name = getattr(item, 'product_name', None)
            quantity = getattr(item, 'quantity', 0)
            unit_price = getattr(item, 'unit_price', 0)
            subtotal = getattr(item, 'subtotal', 0)
            
            items.append({
                "name": name,
                "quantity": quantity,
                "price": f"${unit_price:,.0f}",
                "total": f"${subtotal:,.0f}"
            })

        template_body = {
            "business_name": customer.business_name,
            "order_number": order.order_number,
            "total": f"${order.total:,.0f}",
            "items": items,
            "delivery_address": order.delivery_address or "Dirección registrada",
            "year": "2026"
        }

        await self.send_email(
            subject=f"Confirmación de Orden #{order.order_number}",
            recipients=[customer.email],
            template_name="order_confirmation.html",
            template_body=template_body
        )

email_service = EmailService()
